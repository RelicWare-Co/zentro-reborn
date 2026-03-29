import "@tanstack/react-start/server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	creditAccount,
	creditTransaction,
	inventoryMovement,
	product,
	sale,
	saleItem,
	saleItemModifier,
	shift,
} from "#/db/schema";
import { createCoreSaleForCurrentOrganization } from "#/features/core/sales/create-sale.server";
import { requireAuthContext } from "./auth-context";
import type { CancelSaleInput, CreatePosSaleInput } from "./types";
import { resolveDate } from "./utils";

export async function createPosSaleForCurrentOrganization(
	input: CreatePosSaleInput,
) {
	return createCoreSaleForCurrentOrganization(input);
}

export async function cancelSaleForCurrentOrganization(input: CancelSaleInput) {
	const { session, organizationId } = await requireAuthContext();
	const cancelledAt = resolveDate(input.cancelledAt, "cancelledAt");

	return db.transaction(async (tx) => {
		const [targetSale] = await tx
			.select({
				id: sale.id,
				shiftId: sale.shiftId,
				customerId: sale.customerId,
				status: sale.status,
			})
			.from(sale)
			.where(
				and(eq(sale.id, input.saleId), eq(sale.organizationId, organizationId)),
			)
			.limit(1);

		if (!targetSale) {
			throw new Error("Venta no encontrada para la organización activa");
		}
		if (targetSale.status === "cancelled") {
			throw new Error("La venta ya está anulada");
		}

		const [targetShift] = await tx
			.select({ id: shift.id, status: shift.status, userId: shift.userId })
			.from(shift)
			.where(
				and(
					eq(shift.id, targetSale.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!targetShift) {
			throw new Error("Turno no encontrado para la venta seleccionada");
		}
		if (targetShift.status !== "open") {
			throw new Error("Solo se puede anular una venta de un turno abierto");
		}
		if (targetShift.userId !== session.user.id) {
			throw new Error("Solo el cajero del turno puede anular la venta");
		}

		const chargeTransactions = await tx
			.select({
				id: creditTransaction.id,
				creditAccountId: creditTransaction.creditAccountId,
				amount: creditTransaction.amount,
			})
			.from(creditTransaction)
			.where(
				and(
					eq(creditTransaction.organizationId, organizationId),
					eq(creditTransaction.saleId, targetSale.id),
					eq(creditTransaction.type, "charge"),
				),
			);
		const paymentTransactions = await tx
			.select({ id: creditTransaction.id })
			.from(creditTransaction)
			.where(
				and(
					eq(creditTransaction.organizationId, organizationId),
					eq(creditTransaction.saleId, targetSale.id),
					eq(creditTransaction.type, "payment"),
				),
			)
			.limit(1);

		if (paymentTransactions.length > 0) {
			throw new Error("No se puede anular una venta con abonos registrados");
		}

		if (targetSale.status === "credit" && chargeTransactions.length === 0) {
			throw new Error(
				"La venta a crédito no tiene un cargo asociado para poder anularse",
			);
		}

		const saleItemRows = await tx
			.select({
				productId: saleItem.productId,
				quantity: saleItem.quantity,
				productName: product.name,
				trackInventory: product.trackInventory,
			})
			.from(saleItem)
			.innerJoin(
				product,
				and(
					eq(product.id, saleItem.productId),
					eq(product.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(saleItem.organizationId, organizationId),
					eq(saleItem.saleId, targetSale.id),
				),
			);
		const saleModifierRows = await tx
			.select({
				productId: saleItemModifier.modifierProductId,
				baseQuantity: saleItem.quantity,
				modifierQuantity: saleItemModifier.quantity,
				productName: product.name,
				trackInventory: product.trackInventory,
			})
			.from(saleItemModifier)
			.innerJoin(
				saleItem,
				and(
					eq(saleItem.id, saleItemModifier.saleItemId),
					eq(saleItem.organizationId, organizationId),
				),
			)
			.innerJoin(
				product,
				and(
					eq(product.id, saleItemModifier.modifierProductId),
					eq(product.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(saleItemModifier.organizationId, organizationId),
					eq(saleItem.saleId, targetSale.id),
				),
			);

		const stockRestorations = new Map<
			string,
			{ quantity: number; productName: string; trackInventory: boolean }
		>();
		for (const itemRow of saleItemRows) {
			stockRestorations.set(itemRow.productId, {
				quantity:
					(stockRestorations.get(itemRow.productId)?.quantity ?? 0) +
					itemRow.quantity,
				productName: itemRow.productName,
				trackInventory: itemRow.trackInventory,
			});
		}
		for (const modifierRow of saleModifierRows) {
			stockRestorations.set(modifierRow.productId, {
				quantity:
					(stockRestorations.get(modifierRow.productId)?.quantity ?? 0) +
					modifierRow.baseQuantity * modifierRow.modifierQuantity,
				productName: modifierRow.productName,
				trackInventory: modifierRow.trackInventory,
			});
		}

		const inventoryRows: Array<typeof inventoryMovement.$inferInsert> = [];
		for (const [productId, restoration] of stockRestorations.entries()) {
			if (!restoration.trackInventory || restoration.quantity <= 0) {
				continue;
			}

			const updatedProducts = await tx
				.update(product)
				.set({ stock: sql`${product.stock} + ${restoration.quantity}` })
				.where(
					and(
						eq(product.id, productId),
						eq(product.organizationId, organizationId),
					),
				)
				.returning({ id: product.id });

			if (updatedProducts.length === 0) {
				throw new Error(
					`No fue posible restaurar el stock de ${restoration.productName}`,
				);
			}

			inventoryRows.push({
				id: crypto.randomUUID(),
				organizationId,
				productId,
				userId: session.user.id,
				type: "adjustment",
				quantity: restoration.quantity,
				notes: `Anulacion venta ${targetSale.id}`,
				createdAt: cancelledAt,
			});
		}

		if (inventoryRows.length > 0) {
			await tx.insert(inventoryMovement).values(inventoryRows);
		}

		for (const chargeTransaction of chargeTransactions) {
			const [creditAccountRow] = await tx
				.select({
					id: creditAccount.id,
					balance: creditAccount.balance,
				})
				.from(creditAccount)
				.where(
					and(
						eq(creditAccount.id, chargeTransaction.creditAccountId),
						eq(creditAccount.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!creditAccountRow) {
				throw new Error("Cuenta de crédito no encontrada para anular la venta");
			}
			if (creditAccountRow.balance < chargeTransaction.amount) {
				throw new Error(
					"La cuenta de crédito ya no coincide con la deuda de esta venta",
				);
			}

			await tx
				.update(creditAccount)
				.set({
					balance: creditAccountRow.balance - chargeTransaction.amount,
					updatedAt: cancelledAt,
				})
				.where(
					and(
						eq(creditAccount.id, creditAccountRow.id),
						eq(creditAccount.organizationId, organizationId),
					),
				);
		}

		await tx
			.update(sale)
			.set({
				status: "cancelled",
			})
			.where(
				and(
					eq(sale.id, targetSale.id),
					eq(sale.organizationId, organizationId),
				),
			);

		return {
			saleId: targetSale.id,
			status: "cancelled" as const,
			cancelledAt: cancelledAt.getTime(),
		};
	});
}
