import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { category, member, product } from "#/db/schema";
import { auth } from "#/lib/auth";

export type CreateProductInput = {
	name: string;
	categoryId?: string | null;
	sku?: string | null;
	barcode?: string | null;
	price: number;
	cost?: number;
	taxRate?: number;
	stock?: number;
	trackInventory?: boolean;
};

export type UpdateProductInput = {
	id: string;
	name?: string;
	categoryId?: string | null;
	sku?: string | null;
	barcode?: string | null;
	price?: number;
	cost?: number;
	taxRate?: number;
	stock?: number;
	trackInventory?: boolean;
};

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

function normalizeOptionalString(value?: string | null) {
	if (value == null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function toNonNegativeInteger(value: number, fieldName: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(
			`El campo "${fieldName}" debe ser un número válido mayor o igual a 0`,
		);
	}
	return Math.round(value);
}

async function requireSession(): Promise<AuthSession> {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
	});

	if (!session) {
		throw new Error("No autorizado");
	}

	return session;
}

async function resolveOrganizationId(session: AuthSession) {
	const activeOrganizationId = session.session.activeOrganizationId;
	if (activeOrganizationId) {
		return activeOrganizationId;
	}

	const [membership] = await db
		.select({
			organizationId: member.organizationId,
		})
		.from(member)
		.where(eq(member.userId, session.user.id))
		.limit(1);

	if (!membership) {
		throw new Error("El usuario no pertenece a ninguna organización");
	}

	return membership.organizationId;
}

async function getAuthContext() {
	const session = await requireSession();
	const organizationId = await resolveOrganizationId(session);
	return { session, organizationId };
}

async function assertCategoryFromOrganization(
	organizationId: string,
	categoryId?: string | null,
) {
	const normalizedCategoryId = normalizeOptionalString(categoryId);
	if (!normalizedCategoryId) {
		return null;
	}

	const [existingCategory] = await db
		.select({ id: category.id })
		.from(category)
		.where(
			and(
				eq(category.id, normalizedCategoryId),
				eq(category.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!existingCategory) {
		throw new Error(
			"La categoría seleccionada no existe en la organización actual",
		);
	}

	return normalizedCategoryId;
}

export async function getProductsForCurrentOrganization() {
	const { organizationId } = await getAuthContext();

	const rows = await db
		.select({
			id: product.id,
			name: product.name,
			categoryId: product.categoryId,
			categoryName: category.name,
			sku: product.sku,
			barcode: product.barcode,
			price: product.price,
			cost: product.cost,
			taxRate: product.taxRate,
			stock: product.stock,
			trackInventory: product.trackInventory,
			createdAt: product.createdAt,
		})
		.from(product)
		.leftJoin(
			category,
			and(
				eq(product.categoryId, category.id),
				eq(category.organizationId, organizationId),
			),
		)
		.where(
			and(
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
			),
		)
		.orderBy(asc(product.name));

	return rows.map((row) => ({
		...row,
		cost: row.cost ?? 0,
		createdAt:
			row.createdAt instanceof Date
				? row.createdAt.getTime()
				: new Date(row.createdAt).getTime(),
	}));
}

export async function getCategoriesForCurrentOrganization() {
	const { organizationId } = await getAuthContext();

	return db
		.select({
			id: category.id,
			name: category.name,
			description: category.description,
		})
		.from(category)
		.where(eq(category.organizationId, organizationId))
		.orderBy(asc(category.name));
}

export async function createProductForCurrentOrganization(
	input: CreateProductInput,
) {
	const { organizationId } = await getAuthContext();
	const resolvedCategoryId = await assertCategoryFromOrganization(
		organizationId,
		input.categoryId,
	);

	const id = crypto.randomUUID();
	await db.insert(product).values({
		id,
		organizationId,
		categoryId: resolvedCategoryId,
		name: input.name.trim(),
		sku: normalizeOptionalString(input.sku),
		barcode: normalizeOptionalString(input.barcode),
		price: toNonNegativeInteger(input.price, "price"),
		cost: toNonNegativeInteger(input.cost ?? 0, "cost"),
		taxRate: toNonNegativeInteger(input.taxRate ?? 0, "taxRate"),
		stock: toNonNegativeInteger(input.stock ?? 0, "stock"),
		trackInventory: input.trackInventory ?? true,
		createdAt: new Date(),
	});

	return { id };
}

export async function updateProductForCurrentOrganization(
	input: UpdateProductInput,
) {
	const { organizationId } = await getAuthContext();

	const updates: Partial<typeof product.$inferInsert> = {};
	if (input.name !== undefined) {
		updates.name = input.name.trim();
	}
	if (input.sku !== undefined) {
		updates.sku = normalizeOptionalString(input.sku);
	}
	if (input.barcode !== undefined) {
		updates.barcode = normalizeOptionalString(input.barcode);
	}
	if (input.price !== undefined) {
		updates.price = toNonNegativeInteger(input.price, "price");
	}
	if (input.cost !== undefined) {
		updates.cost = toNonNegativeInteger(input.cost, "cost");
	}
	if (input.taxRate !== undefined) {
		updates.taxRate = toNonNegativeInteger(input.taxRate, "taxRate");
	}
	if (input.stock !== undefined) {
		updates.stock = toNonNegativeInteger(input.stock, "stock");
	}
	if (input.trackInventory !== undefined) {
		updates.trackInventory = input.trackInventory;
	}
	if (input.categoryId !== undefined) {
		updates.categoryId = await assertCategoryFromOrganization(
			organizationId,
			input.categoryId,
		);
	}

	if (Object.keys(updates).length === 0) {
		throw new Error("No hay campos para actualizar");
	}

	const result = await db
		.update(product)
		.set(updates)
		.where(
			and(
				eq(product.id, input.id),
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
			),
		);

	if (result.changes === 0) {
		throw new Error(
			"Producto no encontrado o fuera del alcance de la organización",
		);
	}

	return { success: true };
}

export async function deleteProductForCurrentOrganization(id: string) {
	const { organizationId } = await getAuthContext();

	const result = await db
		.update(product)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(product.id, id),
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
			),
		);

	if (result.changes === 0) {
		throw new Error("Producto no encontrado o ya eliminado");
	}

	return { success: true };
}
