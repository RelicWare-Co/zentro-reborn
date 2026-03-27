import "@tanstack/react-start/server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "#/db";
import { category, customer, product } from "#/db/schema";
import { requireAuthContext } from "./auth-context";

function normalizeLimit(limit?: number | null) {
	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function normalizeCursor(cursor?: number | null) {
	return Math.max(cursor ?? 0, 0);
}

function normalizeSearchQuery(searchQuery?: string | null) {
	return searchQuery?.trim().toLowerCase() ?? "";
}

function normalizeCount(value: number | string | null | undefined) {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) ? parsedValue : 0;
	}

	return 0;
}

function normalizePaymentMethodSort(a: string, b: string) {
	if (a === "cash") return -1;
	if (b === "cash") return 1;
	return a.localeCompare(b);
}

export async function searchPosProductsForCurrentOrganization(input: {
	searchQuery?: string | null;
	categoryId?: string | null;
	limit?: number | null;
	cursor?: number | null;
}) {
	const { organizationId } = await requireAuthContext();

	if (!organizationId) {
		return { data: [], hasMore: false, total: 0 };
	}

	const limit = normalizeLimit(input.limit);
	const cursor = normalizeCursor(input.cursor);
	const normalizedSearch = normalizeSearchQuery(input.searchQuery);
	const normalizedCategoryId = input.categoryId?.trim() ?? "";
	const searchPattern = `%${normalizedSearch}%`;
	const searchRank = normalizedSearch
		? sql<number>`case
			when lower(coalesce(${product.barcode}, '')) = ${normalizedSearch} then 0
			when lower(coalesce(${product.sku}, '')) = ${normalizedSearch} then 1
			when lower(${product.name}) = ${normalizedSearch} then 2
			else 3
		end`
		: null;
	const productOrderBy = searchRank
		? [asc(searchRank), asc(product.name), asc(product.id)]
		: [asc(product.name), asc(product.id)];

	const clauses = [
		eq(product.organizationId, organizationId),
		isNull(product.deletedAt),
		eq(product.isModifier, false),
	];
	if (normalizedCategoryId) {
		clauses.push(eq(product.categoryId, normalizedCategoryId));
	}
	if (normalizedSearch) {
		clauses.push(
			sql`(lower(${product.name}) LIKE ${searchPattern} OR lower(${product.sku}) LIKE ${searchPattern} OR lower(${product.barcode}) LIKE ${searchPattern})`,
		);
	}

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: product.id,
				name: product.name,
				categoryId: product.categoryId,
				categoryName: category.name,
				sku: product.sku,
				barcode: product.barcode,
				price: product.price,
				taxRate: product.taxRate,
				trackInventory: product.trackInventory,
				stock: product.stock,
				isModifier: product.isModifier,
			})
			.from(product)
			.leftJoin(
				category,
				and(
					eq(product.categoryId, category.id),
					eq(category.organizationId, organizationId),
				),
			)
			.where(and(...clauses))
			.orderBy(...productOrderBy)
			.limit(limit + 1)
			.offset(cursor),
		db
			.select({
				total: sql<number>`count(*)`,
			})
			.from(product)
			.where(and(...clauses)),
	]);

	return {
		data: rows.slice(0, limit).map((row) => ({
			...row,
			categoryName: row.categoryName ?? "Sin categoría",
		})),
		hasMore: rows.length > limit,
		total: normalizeCount(totalRows[0]?.total),
		nextCursor: rows.length > limit ? cursor + limit : null,
	};
}

export async function searchPosCustomersForCurrentOrganization(input: {
	searchQuery?: string | null;
	limit?: number | null;
	cursor?: number | null;
}) {
	const { organizationId } = await requireAuthContext();

	if (!organizationId) {
		return { data: [], hasMore: false, total: 0 };
	}

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

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: customer.id,
				name: customer.name,
				documentNumber: customer.documentNumber,
				phone: customer.phone,
				email: customer.email,
				taxRegime: customer.taxRegime,
			})
			.from(customer)
			.where(and(...clauses))
			.orderBy(asc(customer.name), asc(customer.id))
			.limit(limit + 1)
			.offset(cursor),
		db
			.select({
				total: sql<number>`count(*)`,
			})
			.from(customer)
			.where(and(...clauses)),
	]);

	return {
		data: rows.slice(0, limit),
		hasMore: rows.length > limit,
		total: normalizeCount(totalRows[0]?.total),
		nextCursor: rows.length > limit ? cursor + limit : null,
	};
}

export function sortSummaryMethods<T extends { paymentMethod: string }>(
	rows: T[],
) {
	return [...rows].sort((a, b) =>
		normalizePaymentMethodSort(a.paymentMethod, b.paymentMethod),
	);
}
