import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	PAYMENT_METHOD_IDS,
	type PaymentMethodCatalogId,
} from "./settings.shared";
import {
	getSettingsForCurrentOrganization,
	updateSettingsForCurrentOrganization,
} from "./settings.server";

const paymentMethodIdSchema = z.enum(
	PAYMENT_METHOD_IDS as [
		PaymentMethodCatalogId,
		...PaymentMethodCatalogId[],
	],
);

const settingsSchema = z.object({
	pos: z.object({
		defaultTerminalName: z.string().trim().min(1).max(80),
		defaultStartingCash: z.coerce.number().int().min(0),
		paymentMethods: z.array(
			z.object({
				id: paymentMethodIdSchema,
				label: z.string().trim().min(1).max(40),
				enabled: z.boolean(),
				requiresReference: z.boolean(),
			}),
		),
	}),
	credit: z.object({
		allowCreditSales: z.boolean(),
		defaultInterestRate: z.coerce.number().int().min(0).max(100),
	}),
	inventory: z.object({
		defaultTaxRate: z.coerce.number().int().min(0).max(100),
		trackInventoryByDefault: z.boolean(),
		modifiersEnabledByDefault: z.boolean(),
		lowStockThreshold: z.coerce.number().int().min(0).max(9999),
	}),
});

export const getSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		return getSettingsForCurrentOrganization();
	},
);

export const updateSettings = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			settings: settingsSchema,
		}),
	)
	.handler(async ({ data }) => {
		return updateSettingsForCurrentOrganization(data);
	});
