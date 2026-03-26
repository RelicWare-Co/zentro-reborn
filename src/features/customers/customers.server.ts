import "@tanstack/react-start/server-only";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { DBInstance } from "#/db";
import { customer } from "#/db/schema";
import { requireAuthContext } from "#/features/pos/server/auth-context";
import {
	normalizeOptionalString,
	normalizeRequiredString,
} from "#/features/pos/server/utils";

export type SearchCustomersInput = {
	searchQuery?: string | null;
	limit?: number | null;
	cursor?: number | null;
};

export type CreateCustomerInput = {
	type?: string | null;
	documentType?: string | null;
	documentNumber?: string | null;
	name: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	city?: string | null;
	taxRegime?: string | null;
};

export type UpdateCustomerInput = {
	id: string;
	type?: string | null;
	documentType?: string | null;
	documentNumber?: string | null;
	name?: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	city?: string | null;
	taxRegime?: string | null;
};

const { db } = DBInstance.getIstance();

function normalizeLimit(limit?: number | null) {
	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function normalizeCursor(cursor?: number | null) {
	return Math.max(cursor ?? 0, 0);
}

function normalizeSearchQuery(searchQuery?: string | null) {
	return searchQuery?.trim().toLowerCase() ?? "";
}

async function assertUniqueDocumentNumber(
	organizationId: string,
	documentNumber: string | null,
	excludeCustomerId?: string,
) {
	if (!documentNumber) {
		return;
	}

	const clauses = [
		eq(customer.organizationId, organizationId),
		eq(customer.documentNumber, documentNumber),
		isNull(customer.deletedAt),
	];
	if (excludeCustomerId) {
		clauses.push(ne(customer.id, excludeCustomerId));
	}

	const [existingCustomer] = await db
		.select({ id: customer.id })
		.from(customer)
		.where(and(...clauses))
		.limit(1);

	if (existingCustomer) {
		throw new Error("Ya existe un cliente activo con ese documento");
	}
}

export async function searchCustomersForCurrentOrganization(
	input: SearchCustomersInput,
) {
	const { organizationId } = await requireAuthContext();
	const limit = normalizeLimit(input.limit);
	const cursor = normalizeCursor(input.cursor);
	const normalizedSearch = normalizeSearchQuery(input.searchQuery);
	const searchPattern = `%${normalizedSearch}%`;

	const clauses = [
		eq(customer.organizationId, organizationId),
		isNull(customer.deletedAt),
	];
	if (normalizedSearch) {
		clauses.push(
			sql`(
				lower(${customer.name}) LIKE ${searchPattern} OR
				lower(${customer.documentNumber}) LIKE ${searchPattern} OR
				lower(${customer.phone}) LIKE ${searchPattern} OR
				lower(${customer.email}) LIKE ${searchPattern}
			)`,
		);
	}

	const rows = await db
		.select({
			id: customer.id,
			type: customer.type,
			documentType: customer.documentType,
			documentNumber: customer.documentNumber,
			name: customer.name,
			email: customer.email,
			phone: customer.phone,
			address: customer.address,
			city: customer.city,
			taxRegime: customer.taxRegime,
			createdAt: customer.createdAt,
			updatedAt: customer.updatedAt,
		})
		.from(customer)
		.where(and(...clauses))
		.orderBy(asc(customer.name))
		.limit(limit + 1)
		.offset(cursor);

	return {
		data: rows.slice(0, limit).map((row) => ({
			...row,
			createdAt:
				row.createdAt instanceof Date
					? row.createdAt.getTime()
					: new Date(row.createdAt).getTime(),
			updatedAt:
				row.updatedAt instanceof Date
					? row.updatedAt.getTime()
					: new Date(row.updatedAt).getTime(),
		})),
		hasMore: rows.length > limit,
		total: Math.max(rows.length - (rows.length > limit ? 1 : 0), 0),
		nextCursor: rows.length > limit ? cursor + limit : null,
	};
}

export async function createCustomerForCurrentOrganization(
	input: CreateCustomerInput,
) {
	const { organizationId } = await requireAuthContext();
	const name = normalizeRequiredString(input.name, "name");
	const normalizedDocumentNumber = normalizeOptionalString(
		input.documentNumber,
	);

	await assertUniqueDocumentNumber(organizationId, normalizedDocumentNumber);

	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(customer).values({
		id,
		organizationId,
		type: normalizeOptionalString(input.type) ?? "natural",
		documentType: normalizeOptionalString(input.documentType),
		documentNumber: normalizedDocumentNumber,
		name,
		email: normalizeOptionalString(input.email),
		phone: normalizeOptionalString(input.phone),
		address: normalizeOptionalString(input.address),
		city: normalizeOptionalString(input.city),
		taxRegime: normalizeOptionalString(input.taxRegime),
		deletedAt: null,
		createdAt: now,
		updatedAt: now,
	});

	return { id };
}

export async function updateCustomerForCurrentOrganization(
	input: UpdateCustomerInput,
) {
	const { organizationId } = await requireAuthContext();
	const updates: Partial<typeof customer.$inferInsert> = {};

	if (input.type !== undefined) {
		updates.type = normalizeOptionalString(input.type) ?? "natural";
	}
	if (input.documentType !== undefined) {
		updates.documentType = normalizeOptionalString(input.documentType);
	}
	if (input.documentNumber !== undefined) {
		updates.documentNumber = normalizeOptionalString(input.documentNumber);
	}
	if (input.name !== undefined) {
		updates.name = normalizeRequiredString(input.name, "name");
	}
	if (input.email !== undefined) {
		updates.email = normalizeOptionalString(input.email);
	}
	if (input.phone !== undefined) {
		updates.phone = normalizeOptionalString(input.phone);
	}
	if (input.address !== undefined) {
		updates.address = normalizeOptionalString(input.address);
	}
	if (input.city !== undefined) {
		updates.city = normalizeOptionalString(input.city);
	}
	if (input.taxRegime !== undefined) {
		updates.taxRegime = normalizeOptionalString(input.taxRegime);
	}

	if (Object.keys(updates).length === 0) {
		throw new Error("No hay campos para actualizar");
	}

	await assertUniqueDocumentNumber(
		organizationId,
		updates.documentNumber ?? null,
		input.id,
	);

	updates.updatedAt = new Date();
	await db
		.update(customer)
		.set(updates)
		.where(
			and(
				eq(customer.id, input.id),
				eq(customer.organizationId, organizationId),
				isNull(customer.deletedAt),
			),
		);

	return { success: true };
}

export async function deleteCustomerForCurrentOrganization(id: string) {
	const { organizationId } = await requireAuthContext();

	await db
		.update(customer)
		.set({ deletedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(customer.id, id),
				eq(customer.organizationId, organizationId),
				isNull(customer.deletedAt),
			),
		);

	return { success: true };
}
