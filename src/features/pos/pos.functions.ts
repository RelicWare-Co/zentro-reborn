import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	closeShiftForCurrentOrganization,
	createPosSaleForCurrentOrganization,
	getPosBootstrapForCurrentOrganization,
	getShiftCloseSummaryForCurrentOrganization,
	openShiftForCurrentOrganization,
	registerCashMovementForCurrentOrganization,
} from "./pos.server";

const nullableString = z.string().trim().optional().nullable();

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
