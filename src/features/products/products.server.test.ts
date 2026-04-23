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
			const { id: productId } =
				await server.createProductForCurrentOrganization({
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
			const { id: productId } =
				await server.createProductForCurrentOrganization({
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

	test("persists modifier product flag", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: productId } =
				await server.createProductForCurrentOrganization({
					name: "Extra Queso",
					price: 2500,
					isModifier: true,
					trackInventory: false,
				});

			const [createdProduct] = await ctx.db
				.select({ isModifier: schema.product.isModifier })
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			expect(createdProduct?.isModifier).toBe(true);

			await server.updateProductForCurrentOrganization({
				id: productId,
				isModifier: false,
			});

			const [updatedProduct] = await ctx.db
				.select({ isModifier: schema.product.isModifier })
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			expect(updatedProduct?.isModifier).toBe(false);
		} finally {
			ctx.cleanup();
		}
	});

	test("registers restock and waste inventory movements", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: productId } =
				await server.createProductForCurrentOrganization({
					name: "Pan",
					price: 1500,
					stock: 10,
					trackInventory: true,
				});

			await server.registerInventoryMovementForCurrentOrganization({
				productId,
				type: "restock",
				quantity: 5,
				notes: "Compra proveedor",
			});

			await server.registerInventoryMovementForCurrentOrganization({
				productId,
				type: "waste",
				quantity: 3,
				notes: "Producto dañado",
			});

			const [productRow] = await ctx.db
				.select({ stock: schema.product.stock })
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			expect(productRow?.stock).toBe(12);

			const movementRows = await ctx.db
				.select({
					type: schema.inventoryMovement.type,
					quantity: schema.inventoryMovement.quantity,
				})
				.from(schema.inventoryMovement)
				.where(eq(schema.inventoryMovement.productId, productId));

			expect(movementRows).toHaveLength(2);
			expect(movementRows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: "restock", quantity: 5 }),
					expect.objectContaining({ type: "waste", quantity: -3 }),
				]),
			);
		} finally {
			ctx.cleanup();
		}
	});

	test("can restock a negative stock product using the entered quantity as final total", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: productId } =
				await server.createProductForCurrentOrganization({
					name: "Harina",
					price: 4000,
					stock: 0,
					trackInventory: true,
				});

			await ctx.db
				.update(schema.product)
				.set({ stock: -5 })
				.where(eq(schema.product.id, productId));

			await server.registerInventoryMovementForCurrentOrganization({
				productId,
				type: "restock",
				quantity: 10,
				restockMode: "set_as_total",
				notes: "Conteo físico recibido",
			});

			const [productRow] = await ctx.db
				.select({ stock: schema.product.stock })
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			const [movementRow] = await ctx.db
				.select({
					type: schema.inventoryMovement.type,
					quantity: schema.inventoryMovement.quantity,
				})
				.from(schema.inventoryMovement)
				.where(eq(schema.inventoryMovement.productId, productId))
				.limit(1);

			expect(productRow?.stock).toBe(10);
			expect(movementRow).toEqual(
				expect.objectContaining({ type: "restock", quantity: 15 }),
			);
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

			const result = await server.deleteCategoryForCurrentOrganization(
				category.id,
			);
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

	test("rejects mutations for missing categories and deleted products", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const category = await server.createCategoryForCurrentOrganization({
				name: "Activa",
				description: null,
			});
			const product = await server.createProductForCurrentOrganization({
				name: "Producto Temporal",
				price: 5000,
				categoryId: category.id,
			});

			await server.deleteProductForCurrentOrganization(product.id);

			await expect(
				server.updateProductForCurrentOrganization({
					id: product.id,
					name: "Producto Editado",
				}),
			).rejects.toThrow(
				"El producto no existe o ya fue eliminado en la organización actual",
			);
			await expect(
				server.deleteProductForCurrentOrganization(product.id),
			).rejects.toThrow(
				"El producto no existe o ya fue eliminado en la organización actual",
			);
			await expect(
				server.updateCategoryForCurrentOrganization({
					id: crypto.randomUUID(),
					name: "Inexistente",
				}),
			).rejects.toThrow("La categoría no existe en la organización actual");
			await expect(
				server.deleteCategoryForCurrentOrganization(crypto.randomUUID()),
			).rejects.toThrow("La categoría no existe en la organización actual");
		} finally {
			ctx.cleanup();
		}
	});

	test("allows recreating a product with the same barcode or sku after soft delete", async () => {
		const { ctx, server } = await setupProductsServer();
		try {
			const { id: productId } =
				await server.createProductForCurrentOrganization({
					name: "Producto Original",
					price: 1000,
					barcode: "123456789",
					sku: "SKU-001",
				});

			await server.deleteProductForCurrentOrganization(productId);

			const { id: newProductId } =
				await server.createProductForCurrentOrganization({
					name: "Producto Nuevo",
					price: 2000,
					barcode: "123456789",
					sku: "SKU-001",
				});

			const [newProduct] = await ctx.db
				.select()
				.from(schema.product)
				.where(eq(schema.product.id, newProductId))
				.limit(1);

			expect(newProduct).toBeDefined();
			expect(newProduct?.barcode).toBe("123456789");
			expect(newProduct?.sku).toBe("SKU-001");
		} finally {
			ctx.cleanup();
		}
	});

	test("requires an active organization instead of falling back to another membership", async () => {
		const ctx = await createBackendTestContext("products-no-active-org");
		mockBackendRuntime({
			db: ctx.db,
			authContext: {
				...ctx.authContext,
				organizationId: ctx.organizationId,
				session: {
					...ctx.authContext.session,
					session: { activeOrganizationId: null },
				},
			},
		});
		const server = await import("./products.server");

		try {
			await expect(server.getProductsForCurrentOrganization()).rejects.toThrow(
				"No hay una organización activa",
			);
			await expect(
				server.createProductForCurrentOrganization({
					name: "Sin Organizacion",
					price: 1000,
				}),
			).rejects.toThrow("No hay una organización activa");
		} finally {
			ctx.cleanup();
		}
	});
});
