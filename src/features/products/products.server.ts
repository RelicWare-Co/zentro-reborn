import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { DBInstance } from "#/db";
import { category, inventoryMovement, member, product } from "#/db/schema";
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
	isModifier?: boolean;
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
	isModifier?: boolean;
};

export type RegisterInventoryMovementInput = {
	productId: string;
	type: "restock" | "waste" | "adjustment";
	quantity: number;
	restockMode?: "add_to_stock" | "set_as_total";
	notes?: string | null;
	createdAt?: number;
};

export type CreateCategoryInput = {
	name: string;
	description?: string | null;
};

export type UpdateCategoryInput = {
	id: string;
	name?: string;
	description?: string | null;
};

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

const { db } = DBInstance.getIstance();

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

function toInteger(value: number, fieldName: string) {
	if (!Number.isFinite(value)) {
		throw new Error(`El campo "${fieldName}" debe ser un número válido`);
	}
	return Math.round(value);
}

function resolveDate(input?: number) {
	if (input === undefined) {
		return new Date();
	}

	if (!Number.isFinite(input) || input < 0) {
		throw new Error("La fecha indicada no es válida");
	}

	return new Date(Math.round(input));
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
		return null;
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
	if (!organizationId) return [];

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
			isModifier: product.isModifier,
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
	if (!organizationId) return [];

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

export async function createCategoryForCurrentOrganization(
	input: CreateCategoryInput,
) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");
	const normalizedName = input.name.trim();
	if (!normalizedName) {
		throw new Error("El nombre de la categoría es obligatorio");
	}

	const id = crypto.randomUUID();
	await db.insert(category).values({
		id,
		organizationId,
		name: normalizedName,
		description: normalizeOptionalString(input.description),
		createdAt: new Date(),
	});

	return { id };
}

export async function updateCategoryForCurrentOrganization(
	input: UpdateCategoryInput,
) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");

	const updates: Partial<typeof category.$inferInsert> = {};
	if (input.name !== undefined) {
		const normalizedName = input.name.trim();
		if (!normalizedName) {
			throw new Error("El nombre de la categoría es obligatorio");
		}
		updates.name = normalizedName;
	}
	if (input.description !== undefined) {
		updates.description = normalizeOptionalString(input.description);
	}

	if (Object.keys(updates).length === 0) {
		throw new Error("No hay campos para actualizar");
	}

	await db
		.update(category)
		.set(updates)
		.where(
			and(
				eq(category.id, input.id),
				eq(category.organizationId, organizationId),
			),
		);

	return { success: true };
}

export async function deleteCategoryForCurrentOrganization(id: string) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");

	await db
		.delete(category)
		.where(
			and(eq(category.id, id), eq(category.organizationId, organizationId)),
		);

	return { success: true };
}

export async function createProductForCurrentOrganization(
	input: CreateProductInput,
) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");
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
		isModifier: input.isModifier ?? false,
		createdAt: new Date(),
	});

	return { id };
}

export async function updateProductForCurrentOrganization(
	input: UpdateProductInput,
) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");

	const updates: Partial<typeof product.$inferInsert> = {};
	if (input.name !== undefined) {
		const normalizedName = input.name.trim();
		if (!normalizedName) {
			throw new Error("El nombre del producto es obligatorio");
		}
		updates.name = normalizedName;
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
	if (input.isModifier !== undefined) {
		updates.isModifier = input.isModifier;
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

	await db
		.update(product)
		.set(updates)
		.where(
			and(
				eq(product.id, input.id),
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
			),
		);

	return { success: true };
}

export async function registerInventoryMovementForCurrentOrganization(
	input: RegisterInventoryMovementInput,
) {
	const { session, organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");

	const normalizedType = input.type;
	const baseQuantity = toInteger(input.quantity, "quantity");
	if (baseQuantity === 0) {
		throw new Error("La cantidad debe ser diferente de 0");
	}

	let deltaQuantity = baseQuantity;
	const normalizedRestockMode = input.restockMode ?? "add_to_stock";
	if (normalizedType === "restock" && baseQuantity < 0) {
		throw new Error("La reposición debe tener una cantidad positiva");
	}
	if (normalizedType === "waste") {
		deltaQuantity = -Math.abs(baseQuantity);
	}

	const createdAt = resolveDate(input.createdAt);

	return db.transaction(async (tx) => {
		const [targetProduct] = await tx
			.select({
				id: product.id,
				name: product.name,
				stock: product.stock,
				trackInventory: product.trackInventory,
			})
			.from(product)
			.where(
				and(
					eq(product.id, input.productId),
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
				),
			)
			.limit(1);

		if (!targetProduct) {
			throw new Error("Producto no encontrado en la organización activa");
		}

		if (!targetProduct.trackInventory) {
			throw new Error(
				"No puedes registrar movimientos en un producto sin control de inventario",
			);
		}

		if (
			normalizedType === "restock" &&
			normalizedRestockMode === "set_as_total" &&
			targetProduct.stock < 0
		) {
			deltaQuantity = baseQuantity - targetProduct.stock;
		}

		const updated = await tx
			.update(product)
			.set({ stock: sql`${product.stock} + ${deltaQuantity}` })
			.where(
				and(
					eq(product.id, targetProduct.id),
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
					...(deltaQuantity < 0
						? [gte(product.stock, Math.abs(deltaQuantity))]
						: []),
				),
			)
			.returning({ id: product.id });

		if (updated.length === 0) {
			throw new Error(
				`Stock insuficiente para ${targetProduct.name}. Disponible: ${targetProduct.stock}`,
			);
		}

		const movementId = crypto.randomUUID();
		await tx.insert(inventoryMovement).values({
			id: movementId,
			organizationId,
			productId: targetProduct.id,
			userId: session.user.id,
			type: normalizedType,
			quantity: deltaQuantity,
			notes: normalizeOptionalString(input.notes),
			createdAt,
		});

		return {
			id: movementId,
			productId: targetProduct.id,
			quantity: deltaQuantity,
		};
	});
}

export async function deleteProductForCurrentOrganization(id: string) {
	const { organizationId } = await getAuthContext();
	if (!organizationId) throw new Error("No hay una organización activa");

	await db
		.update(product)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(product.id, id),
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
			),
		);

	return { success: true };
}
