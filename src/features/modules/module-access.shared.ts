export const MODULE_KEYS = ["restaurants"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ModuleEntitlementStatus = "granted" | "blocked";
export type ModuleActivationPolicy =
	| "self_service"
	| "entitled_self_service"
	| "platform_admin_only";

export type ModuleAccessState = {
	key: ModuleKey;
	label: string;
	entitlementStatus: ModuleEntitlementStatus;
	activationPolicy: ModuleActivationPolicy;
	enabled: boolean;
	accessible: boolean;
	canManageToggle: boolean;
	requiresPlatformAdmin: boolean;
	kitchenDisplayEnabled: boolean;
};

export const MODULE_CATALOG: Record<
	ModuleKey,
	{
		label: string;
		activationPolicy: ModuleActivationPolicy;
		defaultEntitlementStatus: ModuleEntitlementStatus;
	}
> = {
	restaurants: {
		label: "Restaurantes",
		activationPolicy: "entitled_self_service",
		defaultEntitlementStatus: "granted",
	},
};

export function isModuleEntitled(status: ModuleEntitlementStatus) {
	return status === "granted";
}
