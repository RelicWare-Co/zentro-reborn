import "@tanstack/react-start/server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "#/db";
import { organization, organizationModuleEntitlement } from "#/db/schema";
import { getCurrentOrganizationAccess } from "#/features/organization/access-control.server";
import { parseOrganizationSettingsMetadata } from "#/features/settings/settings.shared";
import {
	isModuleEntitled,
	type ModuleAccessState,
	type ModuleEntitlementStatus,
	type ModuleKey,
} from "./module-access.shared";
import { getModuleDefinition, MODULE_KEYS } from "./module-registry";

async function getModuleAccessEnvironmentForCurrentOrganization() {
	const access = await getCurrentOrganizationAccess();
	const [organizationRow, entitlementRows] = await Promise.all([
		db
			.select({ metadata: organization.metadata })
			.from(organization)
			.where(eq(organization.id, access.organizationId))
			.limit(1)
			.then((rows) => rows[0] ?? null),
		db
			.select({
				moduleKey: organizationModuleEntitlement.moduleKey,
				status: organizationModuleEntitlement.status,
			})
			.from(organizationModuleEntitlement)
			.where(
				and(
					eq(
						organizationModuleEntitlement.organizationId,
						access.organizationId,
					),
					inArray(organizationModuleEntitlement.moduleKey, MODULE_KEYS),
				),
			),
	]);

	return {
		access,
		settings: parseOrganizationSettingsMetadata(organizationRow?.metadata),
		entitlementStatusByKey: new Map<ModuleKey, ModuleEntitlementStatus>(
			entitlementRows.map((row) => [
				row.moduleKey as ModuleKey,
				row.status as ModuleEntitlementStatus,
			]),
		),
	};
}

function resolveModuleAccessState(
	environment: Awaited<
		ReturnType<typeof getModuleAccessEnvironmentForCurrentOrganization>
	>,
	moduleKey: ModuleKey,
): ModuleAccessState {
	const definition = getModuleDefinition(moduleKey);
	const entitlementStatus =
		environment.entitlementStatusByKey.get(moduleKey) ??
		definition.defaultEntitlementStatus;
	const entitlementGranted = isModuleEntitled(entitlementStatus);
	const enabled = definition.getEnabled(environment.settings);
	const flags = definition.getFlags(environment.settings);
	const requiresPlatformAdmin =
		definition.activationPolicy === "platform_admin_only";
	const canManageToggle =
		environment.access.isOrganizationManager &&
		definition.activationPolicy !== "platform_admin_only" &&
		entitlementGranted;
	const accessible = entitlementGranted && enabled;

	return {
		key: moduleKey,
		label: definition.label,
		entitlementStatus,
		activationPolicy: definition.activationPolicy,
		enabled,
		accessible,
		canManageToggle,
		requiresPlatformAdmin,
		flags,
		navigation: definition.getNavigation({
			settings: environment.settings,
			accessible,
			flags,
		}),
	};
}

export async function getModuleAccessForCurrentOrganization(
	moduleKey: ModuleKey,
): Promise<ModuleAccessState> {
	const environment = await getModuleAccessEnvironmentForCurrentOrganization();
	return resolveModuleAccessState(environment, moduleKey);
}

export async function getOrganizationCapabilitiesForCurrentOrganization() {
	const environment = await getModuleAccessEnvironmentForCurrentOrganization();
	const modules = Object.fromEntries(
		MODULE_KEYS.map((moduleKey) => [
			moduleKey,
			resolveModuleAccessState(environment, moduleKey),
		]),
	) as Record<ModuleKey, ModuleAccessState>;

	return {
		viewer: {
			organizationRole: environment.access.organizationRole,
			isOrganizationManager: environment.access.isOrganizationManager,
			isPlatformAdmin: environment.access.isPlatformAdmin,
		},
		modules,
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
		throw new Error(
			"Esta acción requiere permisos de administrador de la app.",
		);
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
