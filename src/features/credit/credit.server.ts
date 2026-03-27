import "@tanstack/react-start/server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	creditAccount,
	creditTransaction,
	customer,
	organization,
	payment,
	sale,
	shift,
} from "#/db/schema";
import { requireAuthContext } from "#/features/pos/server/auth-context";
import {
	normalizeOptionalString,
	normalizeRequiredString,
	resolveDate,
	toPositiveInteger,
} from "#/features/pos/server/utils";
import {
	getEnabledPaymentMethods,
	parseOrganizationSettingsMetadata,
} from "#/features/settings/settings.shared";

export type SearchCreditAccountsInput = {
	searchQuery?: string | null;
	limit?: number | null;
	cursor?: number | null;
};

export type ListCreditTransactionsInput = {
	creditAccountId: string;
	limit?: number | null;
	cursor?: number | null;
};

export type RegisterCreditPaymentInput = {
	shiftId: string;
	creditAccountId: string;
	saleId?: string | null;
	amount: number;
	method: string;
	reference?: string | null;
	notes?: string | null;
	createdAt?: number;
};

function normalizeLimit(limit?: number | null) {
	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function normalizeCursor(cursor?: number | null) {
	return Math.max(cursor ?? 0, 0);
}

function normalizeSearchQuery(searchQuery?: string | null) {
	return searchQuery?.trim().toLowerCase() ?? "";
}

function normalizeCount(value: number | string | null | undefined) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) ? parsedValue : 0;
	}

	return 0;
}

export async function searchCreditAccountsForCurrentOrganization(
	input: SearchCreditAccountsInput,
) {
	const { organizationId } = await requireAuthContext();
	const limit = normalizeLimit(input.limit);
	const cursor = normalizeCursor(input.cursor);
	const normalizedSearch = normalizeSearchQuery(input.searchQuery);
	const searchPattern = `%${normalizedSearch}%`;

	const clauses = [
		eq(creditAccount.organizationId, organizationId),
		isNull(customer.deletedAt),
	];
	if (normalizedSearch) {
		clauses.push(
			sql`(
				lower(${customer.name}) LIKE ${searchPattern} OR
				lower(${customer.documentNumber}) LIKE ${searchPattern} OR
				lower(${customer.phone}) LIKE ${searchPattern} OR
				lower(${customer.email}) LIKE ${searchPattern}
			)`,
		);
	}

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: creditAccount.id,
				customerId: creditAccount.customerId,
				balance: creditAccount.balance,
				interestRate: creditAccount.interestRate,
				createdAt: creditAccount.createdAt,
				updatedAt: creditAccount.updatedAt,
				customerName: customer.name,
				customerDocument: customer.documentNumber,
				customerPhone: customer.phone,
			})
			.from(creditAccount)
			.innerJoin(
				customer,
				and(
					eq(customer.id, creditAccount.customerId),
					eq(customer.organizationId, organizationId),
				),
			)
			.where(and(...clauses))
			.orderBy(asc(customer.name), asc(creditAccount.id))
			.limit(limit + 1)
			.offset(cursor),
		db
			.select({
				total: sql<number>`count(*)`,
			})
			.from(creditAccount)
			.innerJoin(
				customer,
				and(
					eq(customer.id, creditAccount.customerId),
					eq(customer.organizationId, organizationId),
				),
			)
			.where(and(...clauses)),
	]);

	return {
		data: rows.slice(0, limit).map((row) => ({
			...row,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.getTime()
					: new Date(row.createdAt).getTime(),
			updatedAt:
				row.updatedAt instanceof Date
					? row.updatedAt.getTime()
					: new Date(row.updatedAt).getTime(),
		})),
		hasMore: rows.length > limit,
		total: normalizeCount(totalRows[0]?.total),
		nextCursor: rows.length > limit ? cursor + limit : null,
	};
}

export async function listCreditTransactionsForCurrentOrganization(
	input: ListCreditTransactionsInput,
) {
	const { organizationId } = await requireAuthContext();
	const limit = normalizeLimit(input.limit);
	const cursor = normalizeCursor(input.cursor);

	const [accountRow] = await db
		.select({ id: creditAccount.id })
		.from(creditAccount)
		.where(
			and(
				eq(creditAccount.id, input.creditAccountId),
				eq(creditAccount.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!accountRow) {
		throw new Error(
			"Cuenta de crédito no encontrada para la organización activa",
		);
	}

	const transactionClauses = [
		eq(creditTransaction.organizationId, organizationId),
		eq(creditTransaction.creditAccountId, input.creditAccountId),
	];

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: creditTransaction.id,
				type: creditTransaction.type,
				amount: creditTransaction.amount,
				notes: creditTransaction.notes,
				saleId: creditTransaction.saleId,
				paymentId: creditTransaction.paymentId,
				createdAt: creditTransaction.createdAt,
			})
			.from(creditTransaction)
			.where(and(...transactionClauses))
			.orderBy(desc(creditTransaction.createdAt), desc(creditTransaction.id))
			.limit(limit + 1)
			.offset(cursor),
		db
			.select({
				total: sql<number>`count(*)`,
			})
			.from(creditTransaction)
			.where(and(...transactionClauses)),
	]);

	return {
		data: rows.slice(0, limit).map((row) => ({
			...row,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.getTime()
					: new Date(row.createdAt).getTime(),
		})),
		hasMore: rows.length > limit,
		total: normalizeCount(totalRows[0]?.total),
		nextCursor: rows.length > limit ? cursor + limit : null,
	};
}

export async function registerCreditPaymentForCurrentOrganization(
	input: RegisterCreditPaymentInput,
) {
	const { session, organizationId } = await requireAuthContext();
	const amount = toPositiveInteger(input.amount, "amount");
	const saleId = normalizeOptionalString(input.saleId);
	const method = normalizeRequiredString(input.method, "method").toLowerCase();
	const reference = normalizeOptionalString(input.reference);
	const notes = normalizeOptionalString(input.notes);
	const createdAt = resolveDate(input.createdAt, "createdAt");

	return db.transaction(async (tx) => {
		const [targetShift] = await tx
			.select({ id: shift.id, userId: shift.userId, status: shift.status })
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
			throw new Error("No se puede registrar pago en un turno cerrado");
		}
		if (targetShift.userId !== session.user.id) {
			throw new Error("Solo el cajero del turno puede registrar pagos");
		}

		const [organizationRow] = await tx
			.select({
				metadata: organization.metadata,
			})
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1);
		const enabledPaymentMethodIds = new Set(
			getEnabledPaymentMethods(
				parseOrganizationSettingsMetadata(organizationRow?.metadata),
			).map((paymentMethod) => paymentMethod.id),
		);
		if (!enabledPaymentMethodIds.has(method)) {
			throw new Error(`Método de pago no habilitado: ${method}`);
		}

		const [accountRow] = await tx
			.select({
				id: creditAccount.id,
				customerId: creditAccount.customerId,
				balance: creditAccount.balance,
				customerDeletedAt: customer.deletedAt,
			})
			.from(creditAccount)
			.innerJoin(
				customer,
				and(
					eq(customer.id, creditAccount.customerId),
					eq(customer.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(creditAccount.id, input.creditAccountId),
					eq(creditAccount.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!accountRow || accountRow.customerDeletedAt) {
			throw new Error("Cuenta de crédito no encontrada o cliente inactivo");
		}
		if (accountRow.balance <= 0) {
			throw new Error("La cuenta no tiene saldo pendiente por cobrar");
		}
		if (amount > accountRow.balance) {
			throw new Error("El abono no puede superar el saldo pendiente");
		}

		let targetSale: {
			id: string;
			customerId: string | null;
			status: string;
			totalAmount: number;
		} | null = null;
		let saleBalanceDue: number | null = null;
		if (saleId) {
			const [saleRow] = await tx
				.select({
					id: sale.id,
					customerId: sale.customerId,
					status: sale.status,
					totalAmount: sale.totalAmount,
				})
				.from(sale)
				.where(
					and(eq(sale.id, saleId), eq(sale.organizationId, organizationId)),
				)
				.limit(1);

			if (!saleRow) {
				throw new Error("Venta no encontrada para la organización activa");
			}
			if (!saleRow.customerId || saleRow.customerId !== accountRow.customerId) {
				throw new Error(
					"La venta seleccionada no pertenece a la cuenta de crédito indicada",
				);
			}
			if (saleRow.status === "cancelled") {
				throw new Error(
					"No se puede registrar un abono sobre una venta cancelada",
				);
			}

			const salePaymentRows = await tx
				.select({ amount: payment.amount })
				.from(payment)
				.where(
					and(
						eq(payment.organizationId, organizationId),
						eq(payment.saleId, saleRow.id),
					),
				);

			saleBalanceDue =
				saleRow.totalAmount -
				salePaymentRows.reduce(
					(total, currentPayment) => total + currentPayment.amount,
					0,
				);
			if (saleBalanceDue <= 0) {
				throw new Error("La venta seleccionada ya no tiene saldo pendiente");
			}
			if (amount > saleBalanceDue) {
				throw new Error(
					"El abono no puede superar el saldo pendiente de la venta",
				);
			}

			targetSale = saleRow;
		}

		const paymentId = crypto.randomUUID();
		await tx.insert(payment).values({
			id: paymentId,
			organizationId,
			saleId,
			shiftId: input.shiftId,
			method,
			reference,
			amount,
			createdAt,
		});

		const newBalance = accountRow.balance - amount;
		await tx
			.update(creditAccount)
			.set({ balance: newBalance, updatedAt: createdAt })
			.where(
				and(
					eq(creditAccount.id, input.creditAccountId),
					eq(creditAccount.organizationId, organizationId),
				),
			);

		const transactionId = crypto.randomUUID();
		await tx.insert(creditTransaction).values({
			id: transactionId,
			organizationId,
			creditAccountId: input.creditAccountId,
			saleId,
			paymentId,
			type: "payment",
			amount,
			notes,
			createdAt,
		});

		if (targetSale && saleBalanceDue !== null) {
			const remainingSaleBalance = saleBalanceDue - amount;
			await tx
				.update(sale)
				.set({
					status: remainingSaleBalance > 0 ? "credit" : "completed",
				})
				.where(
					and(
						eq(sale.id, targetSale.id),
						eq(sale.organizationId, organizationId),
					),
				);
		}

		return {
			creditAccountId: input.creditAccountId,
			saleId,
			paymentId,
			transactionId,
			amount,
			newBalance,
		};
	});
}
