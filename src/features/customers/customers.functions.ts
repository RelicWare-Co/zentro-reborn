import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createCustomerForCurrentOrganization,
	deleteCustomerForCurrentOrganization,
	searchCustomersForCurrentOrganization,
	updateCustomerForCurrentOrganization,
} from "./customers.server";

const nullableString = z.string().trim().optional().nullable();

const searchCustomersInputSchema = z.object({
	searchQuery: nullableString,
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
});

const createCustomerInputSchema = z.object({
	type: nullableString,
	documentType: nullableString,
	documentNumber: nullableString,
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	email: nullableString,
	phone: nullableString,
	address: nullableString,
	city: nullableString,
	taxRegime: nullableString,
});

const updateCustomerInputSchema = z
	.object({
		id: z.string().trim().min(1),
		type: nullableString,
		documentType: nullableString,
		documentNumber: nullableString,
		name: z.string().trim().min(1).optional(),
		email: nullableString,
		phone: nullableString,
		address: nullableString,
		city: nullableString,
		taxRegime: nullableString,
	})
	.refine(
		(input) =>
			input.type !== undefined ||
			input.documentType !== undefined ||
			input.documentNumber !== undefined ||
			input.name !== undefined ||
			input.email !== undefined ||
			input.phone !== undefined ||
			input.address !== undefined ||
			input.city !== undefined ||
			input.taxRegime !== undefined,
		{
			message: "Debes enviar al menos un campo para actualizar",
		},
	);

const deleteCustomerInputSchema = z.object({
	id: z.string().trim().min(1),
});

export const searchCustomers = createServerFn({ method: "GET" })
	.inputValidator(searchCustomersInputSchema)
	.handler(async ({ data }) => {
		return searchCustomersForCurrentOrganization({
			searchQuery: data.searchQuery ?? undefined,
			limit: data.limit,
			cursor: data.cursor,
		});
	});

export const createCustomer = createServerFn({ method: "POST" })
	.inputValidator(createCustomerInputSchema)
	.handler(async ({ data }) => {
		return createCustomerForCurrentOrganization(data);
	});

export const updateCustomer = createServerFn({ method: "POST" })
	.inputValidator(updateCustomerInputSchema)
	.handler(async ({ data }) => {
		return updateCustomerForCurrentOrganization(data);
	});

export const deleteCustomer = createServerFn({ method: "POST" })
	.inputValidator(deleteCustomerInputSchema)
	.handler(async ({ data }) => {
		return deleteCustomerForCurrentOrganization(data.id);
	});
