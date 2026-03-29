import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	restaurantModuleSettingsSchema,
	restaurantModuleToggleSettingsSchema,
} from "#/features/restaurants/restaurants.module";
import {
	getSettingsForCurrentOrganization,
	updateSettingsForCurrentOrganization,
} from "./settings.server";
import {
	normalizePaymentMethodId,
	PAYMENT_METHOD_ID_PATTERN,
} from "./settings.shared";

const paymentMethodIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(40)
	.transform(normalizePaymentMethodId)
	.refine((value) => PAYMENT_METHOD_ID_PATTERN.test(value), {
		message: "El identificador del método de pago es inválido",
	});

const paymentMethodSettingsSchema = z.object({
	id: paymentMethodIdSchema,
	label: z.string().trim().min(1).max(40),
	enabled: z.boolean(),
	requiresReference: z.boolean(),
});

const paymentMethodsSchema = z
	.array(paymentMethodSettingsSchema)
	.min(1)
	.superRefine((paymentMethods, ctx) => {
		const seenMethodIds = new Set<string>();
		let hasCashMethod = false;
		let hasEnabledMethod = false;

		for (const [index, paymentMethod] of paymentMethods.entries()) {
			if (seenMethodIds.has(paymentMethod.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Método de pago duplicado: ${paymentMethod.id}`,
					path: [index, "id"],
				});
			}

			seenMethodIds.add(paymentMethod.id);
			hasCashMethod = hasCashMethod || paymentMethod.id === "cash";
			hasEnabledMethod = hasEnabledMethod || paymentMethod.enabled;

			if (paymentMethod.id === "cash" && !paymentMethod.enabled) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Efectivo debe permanecer activo para apertura y cierre",
					path: [index, "enabled"],
				});
			}
		}

		if (!hasCashMethod) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "La configuración debe incluir el método efectivo",
				path: [],
			});
		}

		if (!hasEnabledMethod) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Debes mantener al menos un método de pago activo",
				path: [],
			});
		}
	});

const settingsSchema = z.object({
	modules: z.object({
		restaurants: restaurantModuleToggleSettingsSchema,
	}),
	restaurants: restaurantModuleSettingsSchema,
	pos: z.object({
		defaultTerminalName: z.string().trim().min(1).max(80),
		defaultStartingCash: z.coerce.number().int().min(0),
		paymentMethods: paymentMethodsSchema,
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
