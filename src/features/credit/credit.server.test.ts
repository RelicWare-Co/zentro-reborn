import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";
import type { createTestDatabase } from "#/test/test-db";

async function setupCreditServer() {
	const ctx = await createBackendTestContext("credit");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const server = await import("./credit.server");
	return { ctx, server };
}

async function insertOpenShift(input: {
	db: ReturnType<typeof createTestDatabase>["db"];
	organizationId: string;
	userId: string;
	status?: "open" | "closed";
}) {
	const id = crypto.randomUUID();
	const status = input.status ?? "open";
	const closedAt = status === "closed" ? new Date() : null;
	await input.db.insert(schema.shift).values({
		id,
		organizationId: input.organizationId,
		userId: input.userId,
		terminalId: "terminal-1",
		terminalName: "Caja 1",
		status,
		startingCash: 10000,
		openedAt: new Date(),
		closedAt,
		notes: null,
	});
	return id;
}

describe("credit.server", () => {
	test("searches credit accounts with customer data", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const customerId = crypto.randomUUID();
			const customerIdTwo = crypto.randomUUID();
			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: "CC",
				documentNumber: "777",
				name: "Cliente Credito",
				email: "cliente@demo.com",
				phone: "3000000",
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.customer).values({
				id: customerIdTwo,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: "CC",
				documentNumber: "778",
				name: "Cliente Credito Dos",
				email: "cliente2@demo.com",
				phone: "3000001",
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await ctx.db.insert(schema.creditAccount).values({
				id: crypto.randomUUID(),
				organizationId: ctx.organizationId,
				customerId,
				balance: 45000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: crypto.randomUUID(),
				organizationId: ctx.organizationId,
				customerId: customerIdTwo,
				balance: 25000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const result = await server.searchCreditAccountsForCurrentOrganization({
				searchQuery: "credito",
				limit: 1,
				cursor: 0,
			});

			expect(result.data).toHaveLength(1);
			expect(result.hasMore).toBe(true);
			expect(result.total).toBe(2);
			expect(result.data[0]?.customerName).toBe("Cliente Credito");
			expect(result.data[0]?.balance).toBe(45000);
		} finally {
			ctx.cleanup();
		}
	});

	test("lists account transactions in descending order", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const customerId = crypto.randomUUID();
			const accountId = crypto.randomUUID();
			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: null,
				documentNumber: "900",
				name: "Cliente Uno",
				email: null,
				phone: null,
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: accountId,
				organizationId: ctx.organizationId,
				customerId,
				balance: 10000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditTransaction).values([
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					creditAccountId: accountId,
					saleId: null,
					paymentId: null,
					type: "charge",
					amount: 8000,
					notes: null,
					createdAt: new Date(1_700_000_000_000),
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					creditAccountId: accountId,
					saleId: null,
					paymentId: null,
					type: "payment",
					amount: 2000,
					notes: null,
					createdAt: new Date(1_800_000_000_000),
				},
			]);

			const result = await server.listCreditTransactionsForCurrentOrganization({
				creditAccountId: accountId,
				limit: 1,
				cursor: 0,
			});

			expect(result.data).toHaveLength(1);
			expect(result.hasMore).toBe(true);
			expect(result.total).toBe(2);
			expect(result.data[0]?.type).toBe("payment");
		} finally {
			ctx.cleanup();
		}
	});

	test("registers credit payments and decreases balance", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const shiftId = await insertOpenShift({
				db: ctx.db,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const customerId = crypto.randomUUID();
			const creditAccountId = crypto.randomUUID();
			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: null,
				documentNumber: "901",
				name: "Cliente Pago",
				email: null,
				phone: null,
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: creditAccountId,
				organizationId: ctx.organizationId,
				customerId,
				balance: 15000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const paymentResult =
				await server.registerCreditPaymentForCurrentOrganization({
					shiftId,
					creditAccountId,
					amount: 5000,
					method: "CASH",
					reference: "R1",
					notes: "Abono",
				});

			expect(paymentResult.amount).toBe(5000);
			expect(paymentResult.newBalance).toBe(10000);

			const [updatedAccount] = await ctx.db
				.select({ balance: schema.creditAccount.balance })
				.from(schema.creditAccount)
				.where(
					and(
						eq(schema.creditAccount.id, creditAccountId),
						eq(schema.creditAccount.organizationId, ctx.organizationId),
					),
				)
				.limit(1);
			expect(updatedAccount?.balance).toBe(10000);

			const [createdPayment] = await ctx.db
				.select({
					method: schema.payment.method,
					amount: schema.payment.amount,
				})
				.from(schema.payment)
				.where(eq(schema.payment.id, paymentResult.paymentId))
				.limit(1);
			expect(createdPayment?.method).toBe("cash");
			expect(createdPayment?.amount).toBe(5000);
		} finally {
			ctx.cleanup();
		}
	});

	test("links a credit payment to a sale and marks it paid", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const shiftId = await insertOpenShift({
				db: ctx.db,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const customerId = crypto.randomUUID();
			const creditAccountId = crypto.randomUUID();
			const saleId = crypto.randomUUID();
			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: null,
				documentNumber: "905",
				name: "Cliente Venta Vinculada",
				email: null,
				phone: null,
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: creditAccountId,
				organizationId: ctx.organizationId,
				customerId,
				balance: 7000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.sale).values({
				id: saleId,
				organizationId: ctx.organizationId,
				shiftId,
				customerId,
				userId: ctx.userId,
				subtotal: 7000,
				taxAmount: 0,
				discountAmount: 0,
				totalAmount: 7000,
				status: "credit",
				createdAt: new Date(),
			});

			const paymentResult =
				await server.registerCreditPaymentForCurrentOrganization({
					shiftId,
					creditAccountId,
					saleId,
					amount: 7000,
					method: "cash",
					reference: "AB-VENTA",
				});

			expect(paymentResult.saleId).toBe(saleId);
			expect(paymentResult.newBalance).toBe(0);

			const [updatedSale] = await ctx.db
				.select({ status: schema.sale.status })
				.from(schema.sale)
				.where(eq(schema.sale.id, saleId))
				.limit(1);
			expect(updatedSale?.status).toBe("completed");

			const [linkedPayment] = await ctx.db
				.select({
					saleId: schema.payment.saleId,
					amount: schema.payment.amount,
				})
				.from(schema.payment)
				.where(eq(schema.payment.id, paymentResult.paymentId))
				.limit(1);
			expect(linkedPayment?.saleId).toBe(saleId);
			expect(linkedPayment?.amount).toBe(7000);

			const [linkedTransaction] = await ctx.db
				.select({ saleId: schema.creditTransaction.saleId })
				.from(schema.creditTransaction)
				.where(eq(schema.creditTransaction.id, paymentResult.transactionId))
				.limit(1);
			expect(linkedTransaction?.saleId).toBe(saleId);
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects credit payments that exceed account balance", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const shiftId = await insertOpenShift({
				db: ctx.db,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
			});
			const customerId = crypto.randomUUID();
			const creditAccountId = crypto.randomUUID();

			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: null,
				documentNumber: "902",
				name: "Cliente Exceso",
				email: null,
				phone: null,
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: creditAccountId,
				organizationId: ctx.organizationId,
				customerId,
				balance: 6000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await expect(
				server.registerCreditPaymentForCurrentOrganization({
					shiftId,
					creditAccountId,
					amount: 7000,
					method: "cash",
				}),
			).rejects.toThrow("El abono no puede superar el saldo pendiente");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects credit payments on closed shifts", async () => {
		const { ctx, server } = await setupCreditServer();
		try {
			const shiftId = await insertOpenShift({
				db: ctx.db,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
				status: "closed",
			});
			const customerId = crypto.randomUUID();
			const creditAccountId = crypto.randomUUID();

			await ctx.db.insert(schema.customer).values({
				id: customerId,
				organizationId: ctx.organizationId,
				type: "natural",
				documentType: null,
				documentNumber: "903",
				name: "Cliente Turno Cerrado",
				email: null,
				phone: null,
				address: null,
				city: null,
				taxRegime: null,
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await ctx.db.insert(schema.creditAccount).values({
				id: creditAccountId,
				organizationId: ctx.organizationId,
				customerId,
				balance: 4000,
				interestRate: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await expect(
				server.registerCreditPaymentForCurrentOrganization({
					shiftId,
					creditAccountId,
					amount: 1000,
					method: "cash",
				}),
			).rejects.toThrow("No se puede registrar pago en un turno cerrado");
		} finally {
			ctx.cleanup();
		}
	});
});
