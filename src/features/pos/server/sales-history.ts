import "@tanstack/react-start/server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	creditTransaction,
	customer,
	payment,
	product,
	sale,
	saleItem,
	saleItemModifier,
	shift,
	user,
} from "#/db/schema";
import { requireAuthContext } from "./auth-context";
import type { GetSaleByIdInput, ListSalesInput } from "./types";

function normalizeNumber(value: number | string | null | undefined) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	return 0;
}

function normalizeTimestamp(value: Date | number | null | undefined) {
	if (value instanceof Date) {
		return value.getTime();
	}

	if (typeof value === "number") {
		return value;
	}

	return 0;
}

function parseDateBoundary(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	const parsedDate = new Date(`${value}T00:00:00`);
	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
}

function resolveAmountRange(
	minimum: number | null | undefined,
	maximum: number | null | undefined,
) {
	const normalizedMinimum =
		typeof minimum === "number" && Number.isFinite(minimum) && minimum >= 0
			? Math.trunc(minimum)
			: null;
	const normalizedMaximum =
		typeof maximum === "number" && Number.isFinite(maximum) && maximum >= 0
			? Math.trunc(maximum)
			: null;

	if (
		normalizedMinimum !== null &&
		normalizedMaximum !== null &&
		normalizedMinimum > normalizedMaximum
	) {
		return {
			minimum: normalizedMaximum,
			maximum: normalizedMinimum,
		};
	}

	return {
		minimum: normalizedMinimum,
		maximum: normalizedMaximum,
	};
}

export async function listSalesForCurrentOrganization(
	input: ListSalesInput = {},
) {
	const { organizationId } = await requireAuthContext();
	const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
	const cursor = Math.max(input.cursor ?? 0, 0);
	const trimmedSearchQuery = input.searchQuery?.trim();
	const startDateMs = parseDateBoundary(input.startDate);
	const endDateMs = parseDateBoundary(input.endDate);
	const amountRange = resolveAmountRange(input.amountMin, input.amountMax);
	const endDateExclusiveMs =
		endDateMs === null ? null : endDateMs + 24 * 60 * 60 * 1000;
	const paidAmountExpression = sql<number>`coalesce((
		select sum(${payment.amount})
		from ${payment}
		where ${payment.organizationId} = ${organizationId}
			and ${payment.saleId} = ${sale.id}
	), 0)`;

	const baseWhereConditions = [eq(sale.organizationId, organizationId)];
	if (input.status) {
		baseWhereConditions.push(eq(sale.status, input.status));
	}
	if (input.cashierId) {
		baseWhereConditions.push(eq(sale.userId, input.cashierId));
	}
	if (input.terminalName) {
		baseWhereConditions.push(eq(shift.terminalName, input.terminalName));
	}
	if (startDateMs !== null) {
		baseWhereConditions.push(gte(sale.createdAt, new Date(startDateMs)));
	}
	if (endDateExclusiveMs !== null) {
		baseWhereConditions.push(lt(sale.createdAt, new Date(endDateExclusiveMs)));
	}
	if (amountRange.minimum !== null) {
		baseWhereConditions.push(gte(sale.totalAmount, amountRange.minimum));
	}
	if (amountRange.maximum !== null) {
		baseWhereConditions.push(
			sql`${sale.totalAmount} <= ${amountRange.maximum}`,
		);
	}
	if (input.paymentMethod) {
		baseWhereConditions.push(sql`exists (
			select 1
			from ${payment}
			where ${payment.organizationId} = ${organizationId}
				and ${payment.saleId} = ${sale.id}
				and ${payment.method} = ${input.paymentMethod}
		)`);
	}
	if (input.balanceStatus === "with_balance") {
		baseWhereConditions.push(
			sql`${sale.status} <> 'cancelled' and ${paidAmountExpression} < ${sale.totalAmount}`,
		);
	}
	if (input.balanceStatus === "settled") {
		baseWhereConditions.push(
			sql`(${sale.status} = 'cancelled' or ${paidAmountExpression} >= ${sale.totalAmount})`,
		);
	}

	const searchCondition = trimmedSearchQuery
		? sql`(
			${sale.id} like ${`%${trimmedSearchQuery}%`}
			or coalesce(${customer.name}, '') like ${`%${trimmedSearchQuery}%`}
			or coalesce(${user.name}, '') like ${`%${trimmedSearchQuery}%`}
			or coalesce(${shift.terminalName}, '') like ${`%${trimmedSearchQuery}%`}
		)`
		: null;
	const salesWhereConditions = searchCondition
		? [...baseWhereConditions, searchCondition]
		: baseWhereConditions;

	const [salesRows, totalRows, cashierRows, terminalRows] = await Promise.all([
		db
			.select({
				id: sale.id,
				totalAmount: sale.totalAmount,
				status: sale.status,
				createdAt: sale.createdAt,
				customerName: customer.name,
				cashierName: user.name,
				terminalName: shift.terminalName,
			})
			.from(sale)
			.leftJoin(
				customer,
				and(
					eq(customer.id, sale.customerId),
					eq(customer.organizationId, organizationId),
				),
			)
			.leftJoin(user, eq(user.id, sale.userId))
			.leftJoin(
				shift,
				and(
					eq(shift.id, sale.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.where(and(...salesWhereConditions))
			.orderBy(desc(sale.createdAt), desc(sale.id))
			.limit(limit + 1)
			.offset(cursor),
		db
			.select({
				total: sql<number>`count(*)`,
			})
			.from(sale)
			.leftJoin(
				customer,
				and(
					eq(customer.id, sale.customerId),
					eq(customer.organizationId, organizationId),
				),
			)
			.leftJoin(user, eq(user.id, sale.userId))
			.leftJoin(
				shift,
				and(
					eq(shift.id, sale.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.where(and(...salesWhereConditions)),
		db
			.selectDistinct({
				id: user.id,
				name: user.name,
			})
			.from(sale)
			.innerJoin(user, eq(user.id, sale.userId))
			.where(eq(sale.organizationId, organizationId))
			.orderBy(asc(user.name)),
		db
			.selectDistinct({
				name: shift.terminalName,
			})
			.from(sale)
			.innerJoin(
				shift,
				and(
					eq(shift.id, sale.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(sale.organizationId, organizationId),
					sql`${shift.terminalName} is not null`,
				),
			)
			.orderBy(asc(shift.terminalName)),
	]);

	const pageRows = salesRows.slice(0, limit);
	const hasMore = salesRows.length > limit;
	const nextCursor = salesRows.length > limit ? cursor + limit : null;
	const saleIds = pageRows.map((row) => row.id);

	if (saleIds.length === 0) {
		return {
			data: [],
			total: normalizeNumber(totalRows[0]?.total),
			hasMore,
			nextCursor,
			filterOptions: {
				cashiers: cashierRows,
				terminals: terminalRows
					.map((terminal) => terminal.name)
					.filter((terminalName): terminalName is string =>
						Boolean(terminalName),
					),
			},
		};
	}

	const [paymentRows, saleItemRows] = await Promise.all([
		db
			.select({
				saleId: payment.saleId,
				method: payment.method,
				amount: payment.amount,
			})
			.from(payment)
			.where(
				and(
					eq(payment.organizationId, organizationId),
					inArray(payment.saleId, saleIds),
				),
			),
		db
			.select({
				saleId: saleItem.saleId,
				itemCount: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
			})
			.from(saleItem)
			.where(
				and(
					eq(saleItem.organizationId, organizationId),
					inArray(saleItem.saleId, saleIds),
				),
			)
			.groupBy(saleItem.saleId),
	]);

	const paymentsBySaleId = new Map<
		string,
		{ paidAmount: number; paymentMethods: string[] }
	>();
	for (const paymentRow of paymentRows) {
		if (!paymentRow.saleId) {
			continue;
		}

		const current = paymentsBySaleId.get(paymentRow.saleId) ?? {
			paidAmount: 0,
			paymentMethods: [],
		};
		current.paidAmount += normalizeNumber(paymentRow.amount);
		if (!current.paymentMethods.includes(paymentRow.method)) {
			current.paymentMethods.push(paymentRow.method);
		}
		paymentsBySaleId.set(paymentRow.saleId, current);
	}

	const itemCountBySaleId = new Map<string, number>();
	for (const saleItemRow of saleItemRows) {
		itemCountBySaleId.set(
			saleItemRow.saleId,
			normalizeNumber(saleItemRow.itemCount),
		);
	}

	return {
		data: pageRows.map((row) => {
			const paymentSummary = paymentsBySaleId.get(row.id);
			const totalAmount = normalizeNumber(row.totalAmount);
			const paidAmount =
				row.status === "cancelled" ? 0 : (paymentSummary?.paidAmount ?? 0);

			return {
				id: row.id,
				totalAmount,
				status: row.status,
				customerName: row.customerName,
				cashierName: row.cashierName,
				terminalName: row.terminalName,
				createdAt: normalizeTimestamp(row.createdAt),
				itemCount: itemCountBySaleId.get(row.id) ?? 0,
				paidAmount,
				balanceDue:
					row.status === "cancelled"
						? 0
						: Math.max(totalAmount - paidAmount, 0),
				paymentMethods: paymentSummary?.paymentMethods ?? [],
			};
		}),
		total: normalizeNumber(totalRows[0]?.total),
		hasMore,
		nextCursor,
		filterOptions: {
			cashiers: cashierRows,
			terminals: terminalRows
				.map((terminal) => terminal.name)
				.filter((terminalName): terminalName is string =>
					Boolean(terminalName),
				),
		},
	};
}

export async function getSaleByIdForCurrentOrganization(
	input: GetSaleByIdInput,
) {
	const { organizationId } = await requireAuthContext();

	const saleRows = await db
		.select({
			id: sale.id,
			status: sale.status,
			createdAt: sale.createdAt,
			subtotal: sale.subtotal,
			taxAmount: sale.taxAmount,
			discountAmount: sale.discountAmount,
			totalAmount: sale.totalAmount,
			customerId: customer.id,
			customerName: customer.name,
			customerPhone: customer.phone,
			customerDocumentType: customer.documentType,
			customerDocumentNumber: customer.documentNumber,
			cashierId: user.id,
			cashierName: user.name,
			cashierEmail: user.email,
			shiftId: shift.id,
			terminalName: shift.terminalName,
		})
		.from(sale)
		.leftJoin(
			customer,
			and(
				eq(customer.id, sale.customerId),
				eq(customer.organizationId, organizationId),
			),
		)
		.leftJoin(user, eq(user.id, sale.userId))
		.leftJoin(
			shift,
			and(eq(shift.id, sale.shiftId), eq(shift.organizationId, organizationId)),
		)
		.where(
			and(eq(sale.id, input.saleId), eq(sale.organizationId, organizationId)),
		)
		.limit(1);

	const saleRow = saleRows[0];
	if (!saleRow) {
		return null;
	}

	const [paymentRows, itemRows] = await Promise.all([
		db
			.select({
				id: payment.id,
				method: payment.method,
				reference: payment.reference,
				amount: payment.amount,
				createdAt: payment.createdAt,
				creditTransactionType: creditTransaction.type,
				creditTransactionNotes: creditTransaction.notes,
			})
			.from(payment)
			.leftJoin(
				creditTransaction,
				and(
					eq(creditTransaction.paymentId, payment.id),
					eq(creditTransaction.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(payment.organizationId, organizationId),
					eq(payment.saleId, saleRow.id),
				),
			)
			.orderBy(desc(payment.createdAt), desc(payment.id)),
		db
			.select({
				id: saleItem.id,
				productId: saleItem.productId,
				productName: product.name,
				quantity: saleItem.quantity,
				unitPrice: saleItem.unitPrice,
				subtotal: saleItem.subtotal,
				taxRate: saleItem.taxRate,
				taxAmount: saleItem.taxAmount,
				discountAmount: saleItem.discountAmount,
				totalAmount: saleItem.totalAmount,
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
					eq(saleItem.saleId, saleRow.id),
				),
			)
			.orderBy(desc(saleItem.id)),
	]);

	const saleItemIds = itemRows.map((row) => row.id);
	const modifierRows =
		saleItemIds.length > 0
			? await db
					.select({
						id: saleItemModifier.id,
						saleItemId: saleItemModifier.saleItemId,
						modifierProductId: saleItemModifier.modifierProductId,
						modifierName: product.name,
						quantity: saleItemModifier.quantity,
						unitPrice: saleItemModifier.unitPrice,
						subtotal: saleItemModifier.subtotal,
					})
					.from(saleItemModifier)
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
							inArray(saleItemModifier.saleItemId, saleItemIds),
						),
					)
			: [];

	const modifiersBySaleItemId = new Map<
		string,
		Array<{
			id: string;
			modifierProductId: string;
			name: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
		}>
	>();
	for (const modifierRow of modifierRows) {
		const current = modifiersBySaleItemId.get(modifierRow.saleItemId) ?? [];
		current.push({
			id: modifierRow.id,
			modifierProductId: modifierRow.modifierProductId,
			name: modifierRow.modifierName,
			quantity: normalizeNumber(modifierRow.quantity),
			unitPrice: normalizeNumber(modifierRow.unitPrice),
			subtotal: normalizeNumber(modifierRow.subtotal),
		});
		modifiersBySaleItemId.set(modifierRow.saleItemId, current);
	}

	const payments = paymentRows.map((paymentRow) => ({
		id: paymentRow.id,
		method: paymentRow.method,
		reference: paymentRow.reference,
		amount: normalizeNumber(paymentRow.amount),
		createdAt: normalizeTimestamp(paymentRow.createdAt),
		kind:
			paymentRow.creditTransactionType === "payment"
				? "debt_payment"
				: "sale_payment",
		notes: paymentRow.creditTransactionNotes,
	}));
	const paidAmount = payments.reduce(
		(total, currentPayment) => total + currentPayment.amount,
		0,
	);
	const effectivePaidAmount = saleRow.status === "cancelled" ? 0 : paidAmount;

	return {
		id: saleRow.id,
		status: saleRow.status,
		createdAt: normalizeTimestamp(saleRow.createdAt),
		subtotal: normalizeNumber(saleRow.subtotal),
		taxAmount: normalizeNumber(saleRow.taxAmount),
		discountAmount: normalizeNumber(saleRow.discountAmount),
		totalAmount: normalizeNumber(saleRow.totalAmount),
		paidAmount: effectivePaidAmount,
		balanceDue:
			saleRow.status === "cancelled"
				? 0
				: Math.max(
						normalizeNumber(saleRow.totalAmount) - effectivePaidAmount,
						0,
					),
		customer: saleRow.customerId
			? {
					id: saleRow.customerId,
					name: saleRow.customerName ?? "Cliente",
					phone: saleRow.customerPhone,
					documentType: saleRow.customerDocumentType,
					documentNumber: saleRow.customerDocumentNumber,
				}
			: null,
		cashier: saleRow.cashierId
			? {
					id: saleRow.cashierId,
					name: saleRow.cashierName ?? "Cajero",
					email: saleRow.cashierEmail,
				}
			: null,
		shift: saleRow.shiftId
			? {
					id: saleRow.shiftId,
					terminalName: saleRow.terminalName,
				}
			: null,
		payments,
		items: itemRows.map((itemRow) => ({
			id: itemRow.id,
			productId: itemRow.productId,
			name: itemRow.productName,
			quantity: normalizeNumber(itemRow.quantity),
			unitPrice: normalizeNumber(itemRow.unitPrice),
			subtotal: normalizeNumber(itemRow.subtotal),
			taxRate: normalizeNumber(itemRow.taxRate),
			taxAmount: normalizeNumber(itemRow.taxAmount),
			discountAmount: normalizeNumber(itemRow.discountAmount),
			totalAmount: normalizeNumber(itemRow.totalAmount),
			modifiers: modifiersBySaleItemId.get(itemRow.id) ?? [],
		})),
	};
}
