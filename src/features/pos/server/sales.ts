import "@tanstack/react-start/server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	creditAccount,
	creditTransaction,
	customer,
	inventoryMovement,
	payment,
	product,
	sale,
	saleItem,
	saleItemModifier,
	shift,
} from "#/db/schema";
import { requireAuthContext } from "./auth-context";
import type { CancelSaleInput, CreatePosSaleInput } from "./types";
import {
	normalizeOptionalString,
	normalizeRequiredString,
	resolveDate,
	toNonNegativeInteger,
	toPositiveInteger,
} from "./utils";

function canSettleCompletedSaleWithCashChange(
	payments: Array<{ method: string; amount: number }>,
	totalAmount: number,
) {
	const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
	if (paidAmount <= totalAmount) {
		return false;
	}

	const hasCashPayment = payments.some(
		(payment) => payment.method === "cash" && payment.amount > 0,
	);
	if (!hasCashPayment) {
		return false;
	}

	const nonCashPaid = payments.reduce(
		(sum, payment) => (payment.method === "cash" ? sum : sum + payment.amount),
		0,
	);

	return nonCashPaid <= totalAmount;
}

export async function createPosSaleForCurrentOrganization(
	input: CreatePosSaleInput,
) {
	const { session, organizationId } = await requireAuthContext();

	if (!Array.isArray(input.items) || input.items.length === 0) {
		throw new Error("La venta debe incluir al menos un ítem");
	}

	const createdAt = resolveDate(input.createdAt, "createdAt");
	const customerId = normalizeOptionalString(input.customerId);
	const saleLevelDiscount = toNonNegativeInteger(
		input.discountAmount ?? 0,
		"discountAmount",
	);
	const isCreditSale = input.isCreditSale ?? false;

	return db.transaction(async (tx) => {
		const [targetShift] = await tx
			.select({ id: shift.id, status: shift.status, userId: shift.userId })
			.from(shift)
			.where(
				and(
					eq(shift.id, input.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!targetShift) {
			throw new Error("Turno no encontrado para la organización activa");
		}
		if (targetShift.status !== "open") {
			throw new Error("No se puede registrar una venta en un turno cerrado");
		}
		if (targetShift.userId !== session.user.id) {
			throw new Error("Solo el cajero del turno puede registrar ventas");
		}

		if (customerId) {
			const [existingCustomer] = await tx
				.select({ id: customer.id })
				.from(customer)
				.where(
					and(
						eq(customer.id, customerId),
						eq(customer.organizationId, organizationId),
						isNull(customer.deletedAt),
					),
				)
				.limit(1);

			if (!existingCustomer) {
				throw new Error("El cliente seleccionado no existe o está inactivo");
			}
		}

		const referencedProductIds = new Set<string>();
		for (const item of input.items) {
			referencedProductIds.add(item.productId);
			for (const modifier of item.modifiers ?? []) {
				referencedProductIds.add(modifier.modifierProductId);
			}
		}

		const referencedIds = [...referencedProductIds];
		if (referencedIds.length === 0) {
			throw new Error("No hay productos válidos para procesar");
		}

		const productRows = await tx
			.select({
				id: product.id,
				name: product.name,
				price: product.price,
				taxRate: product.taxRate,
				isModifier: product.isModifier,
				trackInventory: product.trackInventory,
				stock: product.stock,
			})
			.from(product)
			.where(
				and(
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
					inArray(product.id, referencedIds),
				),
			);

		const productById = new Map(productRows.map((row) => [row.id, row]));
		for (const productId of referencedIds) {
			if (!productById.has(productId)) {
				throw new Error(
					`Producto no encontrado o inactivo en la organización actual: ${productId}`,
				);
			}
		}

		type PreparedModifier = {
			id: string;
			saleItemId: string;
			modifierProductId: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
			totalQuantitySold: number;
		};

		type PreparedItem = {
			id: string;
			productId: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
			taxRate: number;
			taxAmount: number;
			discountAmount: number;
			totalAmount: number;
			modifiers: PreparedModifier[];
		};

		const stockDeltas = new Map<string, number>();
		const addStockDelta = (productId: string, delta: number) => {
			stockDeltas.set(productId, (stockDeltas.get(productId) ?? 0) + delta);
		};

		const preparedItems: PreparedItem[] = [];
		let subtotal = 0;
		let taxAmount = 0;
		let itemDiscountAmount = 0;

		for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
			const item = input.items[itemIndex];
			const baseProduct = productById.get(item.productId);

			if (!baseProduct) {
				throw new Error(`Producto inválido en ítem ${itemIndex + 1}`);
			}
			if (baseProduct.isModifier) {
				throw new Error(
					`El producto ${baseProduct.name} solo puede venderse como modificador`,
				);
			}

			const quantity = toPositiveInteger(
				item.quantity,
				`items[${itemIndex}].quantity`,
			);
			const unitPrice = toNonNegativeInteger(
				item.unitPrice ?? baseProduct.price,
				`items[${itemIndex}].unitPrice`,
			);
			const lineTaxRate = toNonNegativeInteger(
				item.taxRate ?? baseProduct.taxRate,
				`items[${itemIndex}].taxRate`,
			);
			const lineDiscountAmount = toNonNegativeInteger(
				item.discountAmount ?? 0,
				`items[${itemIndex}].discountAmount`,
			);

			const lineSubtotal = quantity * unitPrice;
			const lineTaxAmount = Math.round((lineSubtotal * lineTaxRate) / 100);
			let modifiersSubtotal = 0;

			const saleItemId = crypto.randomUUID();
			const preparedModifiers: PreparedModifier[] = [];
			for (
				let modifierIndex = 0;
				modifierIndex < (item.modifiers ?? []).length;
				modifierIndex += 1
			) {
				const modifier = item.modifiers?.[modifierIndex];
				if (!modifier) {
					continue;
				}

				const modifierProduct = productById.get(modifier.modifierProductId);
				if (!modifierProduct) {
					throw new Error(
						`Modificador inválido en items[${itemIndex}].modifiers[${modifierIndex}]`,
					);
				}
				if (!modifierProduct.isModifier) {
					throw new Error(
						`El producto ${modifierProduct.name} no está configurado como modificador`,
					);
				}

				const modifierQuantity = toPositiveInteger(
					modifier.quantity,
					`items[${itemIndex}].modifiers[${modifierIndex}].quantity`,
				);
				const modifierUnitPrice = toNonNegativeInteger(
					modifier.unitPrice ?? modifierProduct.price,
					`items[${itemIndex}].modifiers[${modifierIndex}].unitPrice`,
				);
				const soldModifierQuantity = quantity * modifierQuantity;
				const modifierSubtotal = soldModifierQuantity * modifierUnitPrice;
				modifiersSubtotal += modifierSubtotal;
				addStockDelta(modifierProduct.id, -soldModifierQuantity);

				preparedModifiers.push({
					id: crypto.randomUUID(),
					saleItemId,
					modifierProductId: modifierProduct.id,
					quantity: modifierQuantity,
					unitPrice: modifierUnitPrice,
					subtotal: modifierSubtotal,
					totalQuantitySold: soldModifierQuantity,
				});
			}

			const lineTotalAmount =
				lineSubtotal + modifiersSubtotal + lineTaxAmount - lineDiscountAmount;
			if (lineTotalAmount < 0) {
				throw new Error(
					`El total del ítem ${itemIndex + 1} no puede ser negativo`,
				);
			}

			preparedItems.push({
				id: saleItemId,
				productId: baseProduct.id,
				quantity,
				unitPrice,
				subtotal: lineSubtotal,
				taxRate: lineTaxRate,
				taxAmount: lineTaxAmount,
				discountAmount: lineDiscountAmount,
				totalAmount: lineTotalAmount,
				modifiers: preparedModifiers,
			});

			addStockDelta(baseProduct.id, -quantity);
			subtotal += lineSubtotal + modifiersSubtotal;
			taxAmount += lineTaxAmount;
			itemDiscountAmount += lineDiscountAmount;
		}

		const discountAmount = itemDiscountAmount + saleLevelDiscount;
		const totalAmount = subtotal + taxAmount - discountAmount;
		if (totalAmount < 0) {
			throw new Error("El total de la venta no puede ser negativo");
		}

		const normalizedPayments = (input.payments ?? []).map(
			(registeredPayment, index) => ({
				method: normalizeRequiredString(
					registeredPayment.method,
					`payments[${index}].method`,
				).toLowerCase(),
				amount: toPositiveInteger(
					registeredPayment.amount,
					`payments[${index}].amount`,
				),
				reference: normalizeOptionalString(registeredPayment.reference),
			}),
		);
		const paidAmount = normalizedPayments.reduce(
			(total, registeredPayment) => total + registeredPayment.amount,
			0,
		);
		const allowsCashChange = canSettleCompletedSaleWithCashChange(
			normalizedPayments,
			totalAmount,
		);

		if (isCreditSale) {
			if (!customerId) {
				throw new Error(
					"Una venta a crédito requiere seleccionar un cliente registrado",
				);
			}
			if (paidAmount > totalAmount) {
				throw new Error(
					"Los pagos no pueden superar el total en una venta a crédito",
				);
			}
			if (totalAmount - paidAmount <= 0) {
				throw new Error(
					"La venta marcada como crédito debe dejar un saldo pendiente por cobrar",
				);
			}
		} else {
			if (totalAmount === 0) {
				if (normalizedPayments.length > 0) {
					throw new Error(
						"No debes registrar pagos cuando el total de la venta es 0",
					);
				}
			} else {
				if (normalizedPayments.length === 0) {
					throw new Error(
						"Debes registrar al menos un pago para finalizar la venta",
					);
				}
				if (paidAmount !== totalAmount && !allowsCashChange) {
					throw new Error(
						"La suma de los pagos debe ser igual al total de la venta, salvo excedente en efectivo para devolver cambio",
					);
				}
			}
		}

		const saleId = crypto.randomUUID();
		const saleStatus = isCreditSale ? "credit" : "completed";

		await tx.insert(sale).values({
			id: saleId,
			organizationId,
			shiftId: input.shiftId,
			customerId,
			userId: session.user.id,
			subtotal,
			taxAmount,
			discountAmount,
			totalAmount,
			status: saleStatus,
			createdAt,
		});

		await tx.insert(saleItem).values(
			preparedItems.map((line) => ({
				id: line.id,
				saleId,
				organizationId,
				productId: line.productId,
				quantity: line.quantity,
				unitPrice: line.unitPrice,
				subtotal: line.subtotal,
				taxRate: line.taxRate,
				taxAmount: line.taxAmount,
				discountAmount: line.discountAmount,
				totalAmount: line.totalAmount,
			})),
		);

		const modifierRows = preparedItems.flatMap((line) => line.modifiers);
		if (modifierRows.length > 0) {
			await tx.insert(saleItemModifier).values(
				modifierRows.map((modifierRow) => ({
					id: modifierRow.id,
					saleItemId: modifierRow.saleItemId,
					organizationId,
					modifierProductId: modifierRow.modifierProductId,
					quantity: modifierRow.quantity,
					unitPrice: modifierRow.unitPrice,
					subtotal: modifierRow.subtotal,
				})),
			);
		}

		if (normalizedPayments.length > 0) {
			await tx.insert(payment).values(
				normalizedPayments.map((registeredPayment) => ({
					id: crypto.randomUUID(),
					organizationId,
					saleId,
					shiftId: input.shiftId,
					method: registeredPayment.method,
					reference: registeredPayment.reference,
					amount: registeredPayment.amount,
					createdAt,
				})),
			);
		}

		const inventoryRows: Array<typeof inventoryMovement.$inferInsert> = [];
		for (const [productId, deltaQuantity] of stockDeltas.entries()) {
			if (deltaQuantity === 0) {
				continue;
			}

			const productRow = productById.get(productId);
			if (!productRow) {
				throw new Error(`Producto no encontrado para inventario: ${productId}`);
			}
			if (!productRow.trackInventory) {
				continue;
			}

			const updatedProducts = await tx
				.update(product)
				.set({ stock: sql`${product.stock} + ${deltaQuantity}` })
				.where(
					and(
						eq(product.id, productId),
						eq(product.organizationId, organizationId),
						isNull(product.deletedAt),
					),
				)
				.returning({ id: product.id });

			if (updatedProducts.length === 0) {
				throw new Error(
					`No fue posible actualizar el stock de ${productRow.name}`,
				);
			}

			inventoryRows.push({
				id: crypto.randomUUID(),
				organizationId,
				productId,
				userId: session.user.id,
				type: "sale",
				quantity: deltaQuantity,
				notes: `Venta ${saleId}`,
				createdAt,
			});
		}

		if (inventoryRows.length > 0) {
			await tx.insert(inventoryMovement).values(inventoryRows);
		}

		const balanceDue = Math.max(totalAmount - paidAmount, 0);
		if (isCreditSale && customerId) {
			const [existingCreditAccount] = await tx
				.select({ id: creditAccount.id, balance: creditAccount.balance })
				.from(creditAccount)
				.where(
					and(
						eq(creditAccount.organizationId, organizationId),
						eq(creditAccount.customerId, customerId),
					),
				)
				.limit(1);

			let creditAccountId = existingCreditAccount?.id;
			if (!existingCreditAccount) {
				creditAccountId = crypto.randomUUID();
				await tx.insert(creditAccount).values({
					id: creditAccountId,
					organizationId,
					customerId,
					balance: balanceDue,
					interestRate: 0,
					createdAt,
					updatedAt: createdAt,
				});
			} else {
				await tx
					.update(creditAccount)
					.set({
						balance: sql`${creditAccount.balance} + ${balanceDue}`,
						updatedAt: createdAt,
					})
					.where(
						and(
							eq(creditAccount.id, existingCreditAccount.id),
							eq(creditAccount.organizationId, organizationId),
						),
					);
			}

			await tx.insert(creditTransaction).values({
				id: crypto.randomUUID(),
				organizationId,
				creditAccountId,
				saleId,
				type: "charge",
				amount: balanceDue,
				notes: `Cargo por venta ${saleId}`,
				createdAt,
			});
		}

		return {
			saleId,
			status: saleStatus,
			subtotal,
			taxAmount,
			discountAmount,
			totalAmount,
			paidAmount,
			balanceDue,
		};
	});
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
				and(
					eq(sale.id, input.saleId),
					eq(sale.organizationId, organizationId),
				),
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
