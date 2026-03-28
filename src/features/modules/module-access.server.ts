import "@tanstack/react-start/server-only";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { organization, organizationModuleEntitlement } from "#/db/schema";
import { getCurrentOrganizationAccess } from "#/features/organization/access-control.server";
import { parseOrganizationSettingsMetadata } from "#/features/settings/settings.shared";
import {
	isModuleEntitled,
	MODULE_CATALOG,
	type ModuleAccessState,
	type ModuleEntitlementStatus,
	type ModuleKey,
} from "./module-access.shared";

async function getOrganizationEntitlementStatus(
	organizationId: string,
	moduleKey: ModuleKey,
) {
	const [row] = await db
		.select({
			status: organizationModuleEntitlement.status,
		})
		.from(organizationModuleEntitlement)
		.where(
			and(
				eq(organizationModuleEntitlement.organizationId, organizationId),
				eq(organizationModuleEntitlement.moduleKey, moduleKey),
			),
		)
		.limit(1);

	return (row?.status as ModuleEntitlementStatus | undefined) ?? null;
}

export async function getModuleAccessForCurrentOrganization(
	moduleKey: ModuleKey,
): Promise<ModuleAccessState> {
	const access = await getCurrentOrganizationAccess();
	const moduleDefinition = MODULE_CATALOG[moduleKey];
	const [organizationRow, storedEntitlementStatus] = await Promise.all([
		db
			.select({ metadata: organization.metadata })
			.from(organization)
			.where(eq(organization.id, access.organizationId))
			.limit(1)
			.then((rows) => rows[0] ?? null),
		getOrganizationEntitlementStatus(access.organizationId, moduleKey),
	]);
	const settings = parseOrganizationSettingsMetadata(organizationRow?.metadata);
	const entitlementStatus =
		storedEntitlementStatus ?? moduleDefinition.defaultEntitlementStatus;
	const entitlementGranted = isModuleEntitled(entitlementStatus);
	const enabled = settings.modules.restaurants.enabled;
	const requiresPlatformAdmin =
		moduleDefinition.activationPolicy === "platform_admin_only";
	const canManageToggle =
		access.isOrganizationManager &&
		moduleDefinition.activationPolicy !== "platform_admin_only" &&
		entitlementGranted;

	return {
		key: moduleKey,
		label: moduleDefinition.label,
		entitlementStatus,
		activationPolicy: moduleDefinition.activationPolicy,
		enabled,
		accessible: entitlementGranted && enabled,
		canManageToggle,
		requiresPlatformAdmin,
		kitchenDisplayEnabled: settings.restaurants.kitchen.displayEnabled,
	};
}

export async function getOrganizationCapabilitiesForCurrentOrganization() {
	const access = await getCurrentOrganizationAccess();
	const restaurants = await getModuleAccessForCurrentOrganization("restaurants");

	return {
		viewer: {
			organizationRole: access.organizationRole,
			isOrganizationManager: access.isOrganizationManager,
			isPlatformAdmin: access.isPlatformAdmin,
		},
		modules: {
			restaurants,
		},
	};
}

export async function requireModuleAccessForCurrentOrganization(
	moduleKey: ModuleKey,
) {
	const moduleAccess = await getModuleAccessForCurrentOrganization(moduleKey);
	if (!moduleAccess.accessible) {
		throw new Error(`El módulo ${moduleAccess.label} no está habilitado.`);
	}

	return moduleAccess;
}

export async function setModuleEntitlementForCurrentOrganization(input: {
	moduleKey: ModuleKey;
	status: ModuleEntitlementStatus;
}) {
	const access = await getCurrentOrganizationAccess();
	if (!access.isPlatformAdmin) {
		throw new Error("Esta acción requiere permisos de administrador de la app.");
	}

	const now = new Date();
	const [existingRow] = await db
		.select({ id: organizationModuleEntitlement.id })
		.from(organizationModuleEntitlement)
		.where(
			and(
				eq(organizationModuleEntitlement.organizationId, access.organizationId),
				eq(organizationModuleEntitlement.moduleKey, input.moduleKey),
			),
		)
		.limit(1);

	if (existingRow) {
		await db
			.update(organizationModuleEntitlement)
			.set({
				status: input.status,
				updatedByUserId: access.userId,
				updatedAt: now,
			})
			.where(eq(organizationModuleEntitlement.id, existingRow.id));
	} else {
		await db.insert(organizationModuleEntitlement).values({
			id: crypto.randomUUID(),
			organizationId: access.organizationId,
			moduleKey: input.moduleKey,
			status: input.status,
			updatedByUserId: access.userId,
			createdAt: now,
			updatedAt: now,
		});
	}

	return getModuleAccessForCurrentOrganization(input.moduleKey);
}
