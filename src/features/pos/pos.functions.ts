import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	cancelSaleForCurrentOrganization,
	closeShiftForCurrentOrganization,
	createPosSaleForCurrentOrganization,
	getPosBootstrapForCurrentOrganization,
	getSaleByIdForCurrentOrganization,
	getShiftCloseSummaryForCurrentOrganization,
	listSalesForCurrentOrganization,
	listShiftsForCurrentOrganization,
	openShiftForCurrentOrganization,
	registerCashMovementForCurrentOrganization,
	searchPosCustomersForCurrentOrganization,
	searchPosProductsForCurrentOrganization,
} from "./pos.server";

const nullableString = z.string().trim().optional().nullable();
const nullableNonNegativeInteger = z.coerce
	.number()
	.int()
	.min(0)
	.optional()
	.nullable();

const searchPosProductsInputSchema = z.object({
	searchQuery: nullableString,
	categoryId: nullableString,
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
});

const searchPosCustomersInputSchema = z.object({
	searchQuery: nullableString,
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
});

const listSalesInputSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
	status: nullableString,
	searchQuery: nullableString,
	paymentMethod: nullableString,
	cashierId: nullableString,
	terminalName: nullableString,
	balanceStatus: z.enum(["with_balance", "settled"]).optional().nullable(),
	amountMin: nullableNonNegativeInteger,
	amountMax: nullableNonNegativeInteger,
	startDate: nullableString,
	endDate: nullableString,
});

const listShiftsInputSchema = z.object({
	limit: z.coerce.number().int().min(1).max(50).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
	status: nullableString,
	searchQuery: nullableString,
	cashierId: nullableString,
	terminalName: nullableString,
	paymentMethod: nullableString,
	differenceStatus: z.enum(["short", "over", "balanced"]).optional().nullable(),
	hasMovements: z.enum(["yes", "no"]).optional().nullable(),
	startDate: nullableString,
	endDate: nullableString,
});

const getSaleByIdInputSchema = z.object({
	saleId: z.string().trim().min(1),
});

const cancelSaleInputSchema = z.object({
	saleId: z.string().trim().min(1),
	cancelledAt: z.coerce.number().int().min(0).optional(),
});

const openShiftInputSchema = z.object({
	startingCash: z.coerce.number().min(0),
	terminalId: nullableString,
	terminalName: nullableString,
	notes: nullableString,
	openedAt: z.coerce.number().int().min(0).optional(),
});

const registerCashMovementInputSchema = z.object({
	shiftId: z.string().trim().min(1),
	type: z.enum(["expense", "payout", "inflow"]),
	paymentMethod: z.string().trim().min(1),
	amount: z.coerce.number().int().positive(),
	description: z.string().trim().min(1),
	createdAt: z.coerce.number().int().min(0).optional(),
});

const closeShiftInputSchema = z.object({
	shiftId: z.string().trim().min(1),
	closures: z
		.array(
			z.object({
				paymentMethod: z.string().trim().min(1),
				actualAmount: z.coerce.number().int().min(0),
			}),
		)
		.min(1),
	notes: nullableString,
	closedAt: z.coerce.number().int().min(0).optional(),
});

const checkoutModifierInputSchema = z.object({
	modifierProductId: z.string().trim().min(1),
	quantity: z.coerce.number().int().positive(),
	unitPrice: z.coerce.number().int().min(0).optional(),
});

const checkoutItemInputSchema = z.object({
	productId: z.string().trim().min(1),
	quantity: z.coerce.number().int().positive(),
	unitPrice: z.coerce.number().int().min(0).optional(),
	taxRate: z.coerce.number().int().min(0).max(100).optional(),
	discountAmount: z.coerce.number().int().min(0).optional(),
	modifiers: z.array(checkoutModifierInputSchema).optional(),
});

const checkoutPaymentInputSchema = z.object({
	method: z.string().trim().min(1),
	amount: z.coerce.number().int().positive(),
	reference: nullableString,
});

const createPosSaleInputSchema = z
	.object({
		shiftId: z.string().trim().min(1),
		customerId: nullableString,
		items: z.array(checkoutItemInputSchema).min(1),
		discountAmount: z.coerce.number().int().min(0).optional(),
		payments: z.array(checkoutPaymentInputSchema).optional(),
		isCreditSale: z.boolean().optional(),
		createdAt: z.coerce.number().int().min(0).optional(),
	})
	.superRefine((input, ctx) => {
		if (input.isCreditSale && !input.customerId?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Debes seleccionar un cliente para registrar una venta a crédito",
				path: ["customerId"],
			});
		}

		if (
			!input.isCreditSale &&
			(!input.payments || input.payments.length === 0)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Debes enviar al menos un método de pago para ventas normales",
				path: ["payments"],
			});
		}
	});

const shiftSummaryInputSchema = z.object({
	shiftId: z.string().trim().min(1),
});

export const getPosBootstrap = createServerFn({ method: "GET" }).handler(
	async () => {
		return getPosBootstrapForCurrentOrganization();
	},
);

export const searchPosProducts = createServerFn({ method: "GET" })
	.inputValidator(searchPosProductsInputSchema)
	.handler(async ({ data }) => {
		return searchPosProductsForCurrentOrganization({
			searchQuery: data.searchQuery ?? undefined,
			categoryId: data.categoryId ?? undefined,
			limit: data.limit,
			cursor: data.cursor,
		});
	});

export const searchPosCustomers = createServerFn({ method: "GET" })
	.inputValidator(searchPosCustomersInputSchema)
	.handler(async ({ data }) => {
		return searchPosCustomersForCurrentOrganization({
			searchQuery: data.searchQuery ?? undefined,
			limit: data.limit,
			cursor: data.cursor,
		});
	});

export const listSales = createServerFn({ method: "GET" })
	.inputValidator(listSalesInputSchema)
	.handler(async ({ data }) => {
		return listSalesForCurrentOrganization({
			limit: data.limit,
			cursor: data.cursor,
			status: data.status ?? undefined,
			searchQuery: data.searchQuery ?? undefined,
			paymentMethod: data.paymentMethod ?? undefined,
			cashierId: data.cashierId ?? undefined,
			terminalName: data.terminalName ?? undefined,
			balanceStatus: data.balanceStatus ?? undefined,
			amountMin: data.amountMin ?? undefined,
			amountMax: data.amountMax ?? undefined,
			startDate: data.startDate ?? undefined,
			endDate: data.endDate ?? undefined,
		});
	});

export const listShifts = createServerFn({ method: "GET" })
	.inputValidator(listShiftsInputSchema)
	.handler(async ({ data }) => {
		return listShiftsForCurrentOrganization({
			limit: data.limit,
			cursor: data.cursor,
			status: data.status ?? undefined,
			searchQuery: data.searchQuery ?? undefined,
			cashierId: data.cashierId ?? undefined,
			terminalName: data.terminalName ?? undefined,
			paymentMethod: data.paymentMethod ?? undefined,
			differenceStatus: data.differenceStatus ?? undefined,
			hasMovements: data.hasMovements ?? undefined,
			startDate: data.startDate ?? undefined,
			endDate: data.endDate ?? undefined,
		});
	});

export const getSaleById = createServerFn({ method: "GET" })
	.inputValidator(getSaleByIdInputSchema)
	.handler(async ({ data }) => {
		return getSaleByIdForCurrentOrganization({
			saleId: data.saleId,
		});
	});

export const cancelSale = createServerFn({ method: "POST" })
	.inputValidator(cancelSaleInputSchema)
	.handler(async ({ data }) => {
		return cancelSaleForCurrentOrganization({
			saleId: data.saleId,
			cancelledAt: data.cancelledAt,
		});
	});

export const openShift = createServerFn({ method: "POST" })
	.inputValidator(openShiftInputSchema)
	.handler(async ({ data }) => {
		return openShiftForCurrentOrganization(data);
	});

export const registerCashMovement = createServerFn({ method: "POST" })
	.inputValidator(registerCashMovementInputSchema)
	.handler(async ({ data }) => {
		return registerCashMovementForCurrentOrganization(data);
	});

export const getShiftCloseSummary = createServerFn({ method: "POST" })
	.inputValidator(shiftSummaryInputSchema)
	.handler(async ({ data }) => {
		return getShiftCloseSummaryForCurrentOrganization(data.shiftId);
	});

export const closeShift = createServerFn({ method: "POST" })
	.inputValidator(closeShiftInputSchema)
	.handler(async ({ data }) => {
		return closeShiftForCurrentOrganization(data);
	});

export const createPosSale = createServerFn({ method: "POST" })
	.inputValidator(createPosSaleInputSchema)
	.handler(async ({ data }) => {
		return createPosSaleForCurrentOrganization(data);
	});
