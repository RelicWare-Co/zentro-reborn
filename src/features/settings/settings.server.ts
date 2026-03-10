import "@tanstack/react-start/server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "#/db";
import {
	customer,
	invitation,
	member,
	organization,
	product,
} from "#/db/schema";
import { requireAuthContext } from "#/features/pos/server/auth-context";
import {
	normalizeOrganizationSettings,
	parseOrganizationSettingsMetadata,
	serializeOrganizationSettingsMetadata,
	type OrganizationSettings,
} from "./settings.shared";

function normalizeCount(value: unknown) {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "string") {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) ? parsedValue : 0;
	}

	return 0;
}

export async function getSettingsForCurrentOrganization() {
	const { organizationId } = await requireAuthContext();

	const [
		organizationRows,
		memberCountRows,
		invitationCountRows,
		productCountRows,
		customerCountRows,
	] = await Promise.all([
		db
			.select({
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
				logo: organization.logo,
				metadata: organization.metadata,
				createdAt: organization.createdAt,
			})
			.from(organization)
			.where(eq(organization.id, organizationId))
			.limit(1),
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(member)
			.where(eq(member.organizationId, organizationId)),
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(invitation)
			.where(eq(invitation.organizationId, organizationId)),
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(product)
			.where(
				and(
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
				),
			),
		db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(customer)
			.where(
				and(
					eq(customer.organizationId, organizationId),
					isNull(customer.deletedAt),
				),
			),
	]);

	const organizationRow = organizationRows[0];
	if (!organizationRow) {
		throw new Error("No se encontró la organización activa");
	}

	return {
		organization: {
			id: organizationRow.id,
			name: organizationRow.name,
			slug: organizationRow.slug,
			logo: organizationRow.logo,
			createdAt:
				organizationRow.createdAt instanceof Date
					? organizationRow.createdAt.getTime()
					: new Date(organizationRow.createdAt).getTime(),
		},
		stats: {
			membersCount: normalizeCount(memberCountRows[0]?.count),
			invitationsCount: normalizeCount(invitationCountRows[0]?.count),
			productsCount: normalizeCount(productCountRows[0]?.count),
			customersCount: normalizeCount(customerCountRows[0]?.count),
		},
		settings: parseOrganizationSettingsMetadata(organizationRow.metadata),
	};
}

export async function updateSettingsForCurrentOrganization(input: {
	settings: OrganizationSettings;
}) {
	const { organizationId } = await requireAuthContext();
	const normalizedSettings = normalizeOrganizationSettings(input.settings);

	await db
		.update(organization)
		.set({
			metadata: serializeOrganizationSettingsMetadata(normalizedSettings),
		})
		.where(eq(organization.id, organizationId));

	return {
		success: true,
		settings: normalizedSettings,
	};
}
