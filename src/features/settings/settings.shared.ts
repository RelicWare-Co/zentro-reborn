export const PAYMENT_METHOD_CATALOG = [
	{
		id: "cash",
		label: "Efectivo",
		defaultEnabled: true,
		defaultRequiresReference: false,
	},
	{
		id: "card",
		label: "Tarjeta",
		defaultEnabled: true,
		defaultRequiresReference: true,
	},
	{
		id: "transfer_nequi",
		label: "Nequi",
		defaultEnabled: true,
		defaultRequiresReference: true,
	},
	{
		id: "transfer_bancolombia",
		label: "Bancolombia",
		defaultEnabled: true,
		defaultRequiresReference: true,
	},
] as const;

export const PAYMENT_METHOD_IDS = PAYMENT_METHOD_CATALOG.map((method) => method.id);

export type PaymentMethodCatalogId = (typeof PAYMENT_METHOD_CATALOG)[number]["id"];

export type OrganizationPaymentMethodSettings = {
	id: PaymentMethodCatalogId;
	label: string;
	enabled: boolean;
	requiresReference: boolean;
};

export type OrganizationSettings = {
	pos: {
		defaultTerminalName: string;
		defaultStartingCash: number;
		paymentMethods: OrganizationPaymentMethodSettings[];
	};
	credit: {
		allowCreditSales: boolean;
		defaultInterestRate: number;
	};
	inventory: {
		defaultTaxRate: number;
		trackInventoryByDefault: boolean;
		modifiersEnabledByDefault: boolean;
		lowStockThreshold: number;
	};
};

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
	pos: {
		defaultTerminalName: "Caja Principal",
		defaultStartingCash: 0,
		paymentMethods: PAYMENT_METHOD_CATALOG.map((method) => ({
			id: method.id,
			label: method.label,
			enabled: method.defaultEnabled,
			requiresReference: method.defaultRequiresReference,
		})),
	},
	credit: {
		allowCreditSales: true,
		defaultInterestRate: 0,
	},
	inventory: {
		defaultTaxRate: 0,
		trackInventoryByDefault: true,
		modifiersEnabledByDefault: true,
		lowStockThreshold: 5,
	},
};

function toSafeString(value: unknown, fallback: string) {
	if (typeof value !== "string") {
		return fallback;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.max(0, Math.round(value));
}

function toIntegerInRange(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.min(max, Math.max(min, Math.round(value)));
}

function toBoolean(value: unknown, fallback: boolean) {
	return typeof value === "boolean" ? value : fallback;
}

function normalizePaymentMethods(
	value: unknown,
): OrganizationPaymentMethodSettings[] {
	const rawMethodsById = new Map<string, Record<string, unknown>>();

	if (Array.isArray(value)) {
		for (const rawMethod of value) {
			if (!rawMethod || typeof rawMethod !== "object") {
				continue;
			}

			const methodId =
				"id" in rawMethod && typeof rawMethod.id === "string"
					? rawMethod.id
					: null;
			if (!methodId) {
				continue;
			}

			rawMethodsById.set(
				methodId,
				rawMethod as Record<string, unknown>,
			);
		}
	}

	const methods = PAYMENT_METHOD_CATALOG.map((catalogMethod) => {
		const rawMethod = rawMethodsById.get(catalogMethod.id);

		return {
			id: catalogMethod.id,
			label: catalogMethod.label,
			enabled: toBoolean(rawMethod?.enabled, catalogMethod.defaultEnabled),
			requiresReference:
				catalogMethod.id === "cash"
					? false
					: toBoolean(
							rawMethod?.requiresReference,
							catalogMethod.defaultRequiresReference,
						),
		};
	});

	if (methods.some((method) => method.enabled)) {
		return methods;
	}

	return methods.map((method) =>
		method.id === "cash" ? { ...method, enabled: true } : method,
	);
}

export function normalizeOrganizationSettings(
	value: unknown,
): OrganizationSettings {
	const source =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	const posSource =
		source.pos && typeof source.pos === "object"
			? (source.pos as Record<string, unknown>)
			: {};
	const creditSource =
		source.credit && typeof source.credit === "object"
			? (source.credit as Record<string, unknown>)
			: {};
	const inventorySource =
		source.inventory && typeof source.inventory === "object"
			? (source.inventory as Record<string, unknown>)
			: {};

	return {
		pos: {
			defaultTerminalName: toSafeString(
				posSource.defaultTerminalName,
				DEFAULT_ORGANIZATION_SETTINGS.pos.defaultTerminalName,
			),
			defaultStartingCash: toNonNegativeInteger(
				posSource.defaultStartingCash,
				DEFAULT_ORGANIZATION_SETTINGS.pos.defaultStartingCash,
			),
			paymentMethods: normalizePaymentMethods(posSource.paymentMethods),
		},
		credit: {
			allowCreditSales: toBoolean(
				creditSource.allowCreditSales,
				DEFAULT_ORGANIZATION_SETTINGS.credit.allowCreditSales,
			),
			defaultInterestRate: toIntegerInRange(
				creditSource.defaultInterestRate,
				DEFAULT_ORGANIZATION_SETTINGS.credit.defaultInterestRate,
				0,
				100,
			),
		},
		inventory: {
			defaultTaxRate: toIntegerInRange(
				inventorySource.defaultTaxRate,
				DEFAULT_ORGANIZATION_SETTINGS.inventory.defaultTaxRate,
				0,
				100,
			),
			trackInventoryByDefault: toBoolean(
				inventorySource.trackInventoryByDefault,
				DEFAULT_ORGANIZATION_SETTINGS.inventory.trackInventoryByDefault,
			),
			modifiersEnabledByDefault: toBoolean(
				inventorySource.modifiersEnabledByDefault,
				DEFAULT_ORGANIZATION_SETTINGS.inventory.modifiersEnabledByDefault,
			),
			lowStockThreshold: toNonNegativeInteger(
				inventorySource.lowStockThreshold,
				DEFAULT_ORGANIZATION_SETTINGS.inventory.lowStockThreshold,
			),
		},
	};
}

export function parseOrganizationSettingsMetadata(
	metadata: string | null | undefined,
): OrganizationSettings {
	if (!metadata) {
		return normalizeOrganizationSettings(DEFAULT_ORGANIZATION_SETTINGS);
	}

	try {
		return normalizeOrganizationSettings(JSON.parse(metadata));
	} catch {
		return normalizeOrganizationSettings(DEFAULT_ORGANIZATION_SETTINGS);
	}
}

export function serializeOrganizationSettingsMetadata(
	settings: OrganizationSettings,
) {
	return JSON.stringify(normalizeOrganizationSettings(settings));
}

export function getEnabledPaymentMethods(settings: OrganizationSettings) {
	return settings.pos.paymentMethods.filter((method) => method.enabled);
}
