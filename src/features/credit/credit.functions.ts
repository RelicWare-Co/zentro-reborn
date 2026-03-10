import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	listCreditTransactionsForCurrentOrganization,
	registerCreditPaymentForCurrentOrganization,
	searchCreditAccountsForCurrentOrganization,
} from "./credit.server";

const nullableString = z.string().trim().optional().nullable();

const searchCreditAccountsInputSchema = z.object({
	searchQuery: nullableString,
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
});

const listCreditTransactionsInputSchema = z.object({
	creditAccountId: z.string().trim().min(1),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	cursor: z.coerce.number().int().min(0).optional(),
});

const registerCreditPaymentInputSchema = z.object({
	shiftId: z.string().trim().min(1),
	creditAccountId: z.string().trim().min(1),
	saleId: nullableString,
	amount: z.coerce.number().int().positive(),
	method: z.string().trim().min(1),
	reference: nullableString,
	notes: nullableString,
	createdAt: z.coerce.number().int().min(0).optional(),
});

export const searchCreditAccounts = createServerFn({ method: "GET" })
	.inputValidator(searchCreditAccountsInputSchema)
	.handler(async ({ data }) => {
		return searchCreditAccountsForCurrentOrganization({
			searchQuery: data.searchQuery ?? undefined,
			limit: data.limit,
			cursor: data.cursor,
		});
	});

export const listCreditTransactions = createServerFn({ method: "GET" })
	.inputValidator(listCreditTransactionsInputSchema)
	.handler(async ({ data }) => {
		return listCreditTransactionsForCurrentOrganization(data);
	});

export const registerCreditPayment = createServerFn({ method: "POST" })
	.inputValidator(registerCreditPaymentInputSchema)
	.handler(async ({ data }) => {
		return registerCreditPaymentForCurrentOrganization(data);
	});
