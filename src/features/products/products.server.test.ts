import { describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";

async function setupProductsServer() {
	const ctx = await createBackendTestContext("products");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const server = await import("./products.server");
	return { ctx, server };
}

describe("products.server", () => {
	test("creates categories with normalized values", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const result = await server.createCategoryForCurrentOrganization({
				name: "  Bebidas  ",
				description: "   ",
			});
			const [createdCategory] = await ctx.db
				.select()
				.from(schema.category)
				.where(eq(schema.category.id, result.id))
				.limit(1);

			expect(createdCategory).toBeDefined();
			expect(createdCategory?.organizationId).toBe(ctx.organizationId);
			expect(createdCategory?.name).toBe("Bebidas");
			expect(createdCategory?.description).toBeNull();
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects product creation with category from another organization", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const otherOrganizationId = crypto.randomUUID();
			await ctx.db.insert(schema.organization).values({
				id: otherOrganizationId,
				name: "Org Externa",
				slug: `org-${crypto.randomUUID()}`,
				createdAt: new Date(),
				metadata: null,
				logo: null,
			});

			const externalCategoryId = crypto.randomUUID();
			await ctx.db.insert(schema.category).values({
				id: externalCategoryId,
				organizationId: otherOrganizationId,
				name: "Externa",
				description: null,
				createdAt: new Date(),
			});

			await expect(
				server.createProductForCurrentOrganization({
					name: "Producto X",
					categoryId: externalCategoryId,
					price: 1000,
				}),
			).rejects.toThrow(
				"La categoría seleccionada no existe en la organización actual",
			);
		} finally {
			ctx.cleanup();
		}
	});

	test("soft-deletes products and excludes them from list", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: categoryId } =
				await server.createCategoryForCurrentOrganization({
					name: "Comidas",
					description: null,
				});
			const { id: productId } = await server.createProductForCurrentOrganization({
				name: "Almuerzo",
				categoryId,
				price: 25000,
				cost: 12000,
				stock: 5,
				trackInventory: true,
			});

			await server.deleteProductForCurrentOrganization(productId);

			const listedProducts = await server.getProductsForCurrentOrganization();
			expect(listedProducts).toHaveLength(0);

			const [deletedRow] = await ctx.db
				.select()
				.from(schema.product)
				.where(
					and(
						eq(schema.product.id, productId),
						eq(schema.product.organizationId, ctx.organizationId),
					),
				)
				.limit(1);

			expect(deletedRow).toBeDefined();
			expect(deletedRow?.deletedAt).not.toBeNull();

			const activeRows = await ctx.db
				.select({ id: schema.product.id })
				.from(schema.product)
				.where(
					and(
						eq(schema.product.organizationId, ctx.organizationId),
						isNull(schema.product.deletedAt),
					),
				);
			expect(activeRows).toHaveLength(0);
		} finally {
			ctx.cleanup();
		}
	});

	test("updates product values and keeps normalization rules", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: sourceCategoryId } =
				await server.createCategoryForCurrentOrganization({
					name: "Snacks",
					description: null,
				});
			const { id: destinationCategoryId } =
				await server.createCategoryForCurrentOrganization({
					name: "Bebidas",
					description: null,
				});
			const { id: productId } = await server.createProductForCurrentOrganization({
				name: "Papas",
				categoryId: sourceCategoryId,
				price: 3000,
				trackInventory: true,
				stock: 5,
			});

			const updateResult = await server.updateProductForCurrentOrganization({
				id: productId,
				name: "  Papas Grande  ",
				categoryId: destinationCategoryId,
				price: 3500,
				cost: 1800,
				taxRate: 19,
				stock: 7,
				sku: "   ",
			});

			expect(updateResult.success).toBe(true);

			const [updatedProduct] = await ctx.db
				.select({
					name: schema.product.name,
					categoryId: schema.product.categoryId,
					price: schema.product.price,
					cost: schema.product.cost,
					taxRate: schema.product.taxRate,
					stock: schema.product.stock,
					sku: schema.product.sku,
				})
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			expect(updatedProduct?.name).toBe("Papas Grande");
			expect(updatedProduct?.categoryId).toBe(destinationCategoryId);
			expect(updatedProduct?.price).toBe(3500);
			expect(updatedProduct?.cost).toBe(1800);
			expect(updatedProduct?.taxRate).toBe(19);
			expect(updatedProduct?.stock).toBe(7);
			expect(updatedProduct?.sku).toBeNull();
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects update operations without fields", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const category = await server.createCategoryForCurrentOrganization({
				name: "Categoría Base",
				description: null,
			});
			const product = await server.createProductForCurrentOrganization({
				name: "Producto Base",
				price: 5000,
				categoryId: category.id,
			});

			await expect(
				server.updateCategoryForCurrentOrganization({ id: category.id }),
			).rejects.toThrow("No hay campos para actualizar");
			await expect(
				server.updateProductForCurrentOrganization({ id: product.id }),
			).rejects.toThrow("No hay campos para actualizar");
		} finally {
			ctx.cleanup();
		}
	});

	test("deletes categories from current organization", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const category = await server.createCategoryForCurrentOrganization({
				name: "Temporal",
				description: "Eliminar",
			});

			const result = await server.deleteCategoryForCurrentOrganization(category.id);
			expect(result.success).toBe(true);

			const rows = await ctx.db
				.select({ id: schema.category.id })
				.from(schema.category)
				.where(
					and(
						eq(schema.category.id, category.id),
						eq(schema.category.organizationId, ctx.organizationId),
					),
				);
			expect(rows).toHaveLength(0);
		} finally {
			ctx.cleanup();
		}
	});
});
