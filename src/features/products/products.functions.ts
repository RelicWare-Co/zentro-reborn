import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createCategoryForCurrentOrganization,
	createProductForCurrentOrganization,
	deleteCategoryForCurrentOrganization,
	deleteProductForCurrentOrganization,
	getCategoriesForCurrentOrganization,
	getProductsForCurrentOrganization,
	registerInventoryMovementForCurrentOrganization,
	updateCategoryForCurrentOrganization,
	updateProductForCurrentOrganization,
} from "./products.server";

const nullableString = z.string().trim().optional().nullable();

const createProductInputSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	categoryId: nullableString,
	sku: nullableString,
	barcode: nullableString,
	price: z.coerce.number().min(0),
	cost: z.coerce.number().min(0).optional(),
	taxRate: z.coerce.number().min(0).max(100).optional(),
	stock: z.coerce.number().int().min(0).optional(),
	trackInventory: z.boolean().optional(),
	isModifier: z.boolean().optional(),
});

const updateProductInputSchema = z
	.object({
		id: z.string().trim().min(1),
		name: z.string().trim().min(1).optional(),
		categoryId: nullableString,
		sku: nullableString,
		barcode: nullableString,
		price: z.coerce.number().min(0).optional(),
		cost: z.coerce.number().min(0).optional(),
		taxRate: z.coerce.number().min(0).max(100).optional(),
		stock: z.coerce.number().int().min(0).optional(),
		trackInventory: z.boolean().optional(),
		isModifier: z.boolean().optional(),
	})
	.refine(
		(input) =>
			input.name !== undefined ||
			input.categoryId !== undefined ||
			input.sku !== undefined ||
			input.barcode !== undefined ||
			input.price !== undefined ||
			input.cost !== undefined ||
			input.taxRate !== undefined ||
			input.stock !== undefined ||
			input.trackInventory !== undefined ||
			input.isModifier !== undefined,
		{
			message: "Debes enviar al menos un campo para actualizar",
		},
	);

const registerInventoryMovementInputSchema = z.object({
	productId: z.string().trim().min(1),
	type: z.enum(["restock", "waste", "adjustment"]),
	quantity: z.coerce.number().int(),
	restockMode: z.enum(["add_to_stock", "set_as_total"]).optional(),
	notes: nullableString,
	createdAt: z.coerce.number().int().min(0).optional(),
});

const deleteProductInputSchema = z.object({
	id: z.string().trim().min(1),
});

const createCategoryInputSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	description: nullableString,
});

const updateCategoryInputSchema = z
	.object({
		id: z.string().trim().min(1),
		name: z.string().trim().min(1).optional(),
		description: nullableString,
	})
	.refine(
		(input) => input.name !== undefined || input.description !== undefined,
		{
			message: "Debes enviar al menos un campo para actualizar",
		},
	);

const deleteCategoryInputSchema = z.object({
	id: z.string().trim().min(1),
});

export const getProducts = createServerFn({ method: "GET" }).handler(
	async () => {
		return getProductsForCurrentOrganization();
	},
);

export const getCategories = createServerFn({ method: "GET" }).handler(
	async () => {
		return getCategoriesForCurrentOrganization();
	},
);

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator(createProductInputSchema)
	.handler(async ({ data }) => {
		return createProductForCurrentOrganization(data);
	});

export const updateProduct = createServerFn({ method: "POST" })
	.inputValidator(updateProductInputSchema)
	.handler(async ({ data }) => {
		return updateProductForCurrentOrganization(data);
	});

export const registerInventoryMovement = createServerFn({ method: "POST" })
	.inputValidator(registerInventoryMovementInputSchema)
	.handler(async ({ data }) => {
		return registerInventoryMovementForCurrentOrganization(data);
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.inputValidator(deleteProductInputSchema)
	.handler(async ({ data }) => {
		return deleteProductForCurrentOrganization(data.id);
	});

export const createCategory = createServerFn({ method: "POST" })
	.inputValidator(createCategoryInputSchema)
	.handler(async ({ data }) => {
		return createCategoryForCurrentOrganization(data);
	});

export const updateCategory = createServerFn({ method: "POST" })
	.inputValidator(updateCategoryInputSchema)
	.handler(async ({ data }) => {
		return updateCategoryForCurrentOrganization(data);
	});

export const deleteCategory = createServerFn({ method: "POST" })
	.inputValidator(deleteCategoryInputSchema)
	.handler(async ({ data }) => {
		return deleteCategoryForCurrentOrganization(data.id);
	});
