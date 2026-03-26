import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date) {
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

async function setupDashboardServer() {
	const ctx = await createBackendTestContext("dashboard");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const server = await import("./dashboard.server");
	return { ctx, server };
}

describe("dashboard.server", () => {
	test("aggregates dashboard metrics, trends and rankings for the active organization", async () => {
		const { ctx, server } = await setupDashboardServer();
		try {
			const now = new Date();
			const todayAt = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				10,
				0,
				0,
				0,
			);
			const todayLaterAt = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				12,
				0,
				0,
				0,
			);
			const yesterdayAt = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() - 1,
				11,
				0,
				0,
				0,
			);
			const previousMonthAt = new Date(
				now.getFullYear(),
				now.getMonth(),
				0,
				13,
				0,
				0,
				0,
			);

			await ctx.db
				.update(schema.organization)
				.set({
					metadata: JSON.stringify({
						inventory: {
							lowStockThreshold: 3,
						},
					}),
				})
				.where(eq(schema.organization.id, ctx.organizationId));

			const categoryId = crypto.randomUUID();
			await ctx.db.insert(schema.category).values({
				id: categoryId,
				organizationId: ctx.organizationId,
				name: "Bebidas",
				description: null,
				createdAt: new Date(),
			});

			const lowStockProductId = crypto.randomUUID();
			const highStockProductId = crypto.randomUUID();
			await ctx.db.insert(schema.product).values([
				{
					id: lowStockProductId,
					organizationId: ctx.organizationId,
					categoryId,
					name: "Coca Cola",
					sku: null,
					barcode: null,
					price: 5000,
					cost: 3000,
					taxRate: 0,
					isModifier: false,
					trackInventory: true,
					stock: 2,
					deletedAt: null,
					createdAt: new Date(),
				},
				{
					id: highStockProductId,
					organizationId: ctx.organizationId,
					categoryId,
					name: "Jugo Natural",
					sku: null,
					barcode: null,
					price: 5000,
					cost: 2500,
					taxRate: 0,
					isModifier: false,
					trackInventory: true,
					stock: 10,
					deletedAt: null,
					createdAt: new Date(),
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					categoryId,
					name: "Extra Hielo",
					sku: null,
					barcode: null,
					price: 500,
					cost: 0,
					taxRate: 0,
					isModifier: true,
					trackInventory: false,
					stock: 100,
					deletedAt: null,
					createdAt: new Date(),
				},
			]);

			const customerOneId = crypto.randomUUID();
			const customerTwoId = crypto.randomUUID();
			const deletedCustomerId = crypto.randomUUID();
			await ctx.db.insert(schema.customer).values([
				{
					id: customerOneId,
					organizationId: ctx.organizationId,
					type: "natural",
					documentType: "CC",
					documentNumber: "2001",
					name: "Cliente Uno",
					email: null,
					phone: null,
					address: null,
					city: null,
					taxRegime: null,
					deletedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: customerTwoId,
					organizationId: ctx.organizationId,
					type: "natural",
					documentType: "CC",
					documentNumber: "2002",
					name: "Cliente Dos",
					email: null,
					phone: null,
					address: null,
					city: null,
					taxRegime: null,
					deletedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: deletedCustomerId,
					organizationId: ctx.organizationId,
					type: "natural",
					documentType: "CC",
					documentNumber: "2003",
					name: "Cliente Eliminado",
					email: null,
					phone: null,
					address: null,
					city: null,
					taxRegime: null,
					deletedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			await ctx.db.insert(schema.creditAccount).values([
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					customerId: customerOneId,
					balance: 4500,
					interestRate: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					customerId: deletedCustomerId,
					balance: 9999,
					interestRate: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			const activeShiftId = crypto.randomUUID();
			await ctx.db.insert(schema.shift).values({
				id: activeShiftId,
				organizationId: ctx.organizationId,
				userId: ctx.userId,
				terminalId: "terminal-dashboard",
				terminalName: "Caja Dashboard",
				status: "open",
				startingCash: 30000,
				openedAt: todayAt,
				closedAt: null,
				notes: null,
			});

			const todaySaleOneId = crypto.randomUUID();
			const todaySaleTwoId = crypto.randomUUID();
			const yesterdaySaleId = crypto.randomUUID();
			const previousMonthSaleId = crypto.randomUUID();
			const cancelledSaleId = crypto.randomUUID();
			await ctx.db.insert(schema.sale).values([
				{
					id: todaySaleOneId,
					organizationId: ctx.organizationId,
					shiftId: activeShiftId,
					customerId: customerOneId,
					userId: ctx.userId,
					subtotal: 10000,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 10000,
					status: "completed",
					createdAt: todayAt,
				},
				{
					id: todaySaleTwoId,
					organizationId: ctx.organizationId,
					shiftId: activeShiftId,
					customerId: customerTwoId,
					userId: ctx.userId,
					subtotal: 5000,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 5000,
					status: "completed",
					createdAt: todayLaterAt,
				},
				{
					id: yesterdaySaleId,
					organizationId: ctx.organizationId,
					shiftId: activeShiftId,
					customerId: customerOneId,
					userId: ctx.userId,
					subtotal: 7000,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 7000,
					status: "completed",
					createdAt: yesterdayAt,
				},
				{
					id: previousMonthSaleId,
					organizationId: ctx.organizationId,
					shiftId: activeShiftId,
					customerId: customerOneId,
					userId: ctx.userId,
					subtotal: 8000,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 8000,
					status: "completed",
					createdAt: previousMonthAt,
				},
				{
					id: cancelledSaleId,
					organizationId: ctx.organizationId,
					shiftId: activeShiftId,
					customerId: customerOneId,
					userId: ctx.userId,
					subtotal: 4000,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 4000,
					status: "cancelled",
					createdAt: todayLaterAt,
				},
			]);

			await ctx.db.insert(schema.saleItem).values([
				{
					id: crypto.randomUUID(),
					saleId: todaySaleOneId,
					organizationId: ctx.organizationId,
					productId: lowStockProductId,
					quantity: 2,
					unitPrice: 5000,
					subtotal: 10000,
					taxRate: 0,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 10000,
				},
				{
					id: crypto.randomUUID(),
					saleId: todaySaleTwoId,
					organizationId: ctx.organizationId,
					productId: highStockProductId,
					quantity: 1,
					unitPrice: 5000,
					subtotal: 5000,
					taxRate: 0,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 5000,
				},
				{
					id: crypto.randomUUID(),
					saleId: yesterdaySaleId,
					organizationId: ctx.organizationId,
					productId: lowStockProductId,
					quantity: 1,
					unitPrice: 7000,
					subtotal: 7000,
					taxRate: 0,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 7000,
				},
				{
					id: crypto.randomUUID(),
					saleId: previousMonthSaleId,
					organizationId: ctx.organizationId,
					productId: lowStockProductId,
					quantity: 1,
					unitPrice: 8000,
					subtotal: 8000,
					taxRate: 0,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 8000,
				},
				{
					id: crypto.randomUUID(),
					saleId: cancelledSaleId,
					organizationId: ctx.organizationId,
					productId: highStockProductId,
					quantity: 1,
					unitPrice: 4000,
					subtotal: 4000,
					taxRate: 0,
					taxAmount: 0,
					discountAmount: 0,
					totalAmount: 4000,
				},
			]);

			await ctx.db.insert(schema.payment).values([
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					saleId: todaySaleOneId,
					shiftId: activeShiftId,
					method: "cash",
					reference: null,
					amount: 10000,
					createdAt: todayAt,
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					saleId: todaySaleTwoId,
					shiftId: activeShiftId,
					method: "card",
					reference: "VOUCHER-1",
					amount: 5000,
					createdAt: todayLaterAt,
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					saleId: yesterdaySaleId,
					shiftId: activeShiftId,
					method: "cash",
					reference: null,
					amount: 7000,
					createdAt: yesterdayAt,
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					saleId: previousMonthSaleId,
					shiftId: activeShiftId,
					method: "cash",
					reference: null,
					amount: 8000,
					createdAt: previousMonthAt,
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					saleId: cancelledSaleId,
					shiftId: activeShiftId,
					method: "cash",
					reference: null,
					amount: 4000,
					createdAt: todayLaterAt,
				},
			]);

			const dashboard =
				await server.getDashboardOverviewForCurrentOrganization();

			expect(dashboard.lowStockThreshold).toBe(3);
			expect(dashboard.activeShift).toEqual({
				id: activeShiftId,
				terminalName: "Caja Dashboard",
				startingCash: 30000,
				openedAt: todayAt.getTime(),
			});
			expect(dashboard.stats).toEqual({
				todayRevenue: 15000,
				todaySalesCount: 2,
				todayAvgTicket: 7500,
				todayCustomersServed: 2,
				yesterdayRevenue: 7000,
				monthRevenue: 22000,
				monthSalesCount: 3,
				previousMonthRevenue: 8000,
				activeProductsCount: 2,
				activeCustomersCount: 2,
				lowStockCount: 1,
				pendingCreditBalance: 4500,
				creditAccountsCount: 1,
			});
			expect(dashboard.paymentMix).toEqual([
				{ method: "cash", amount: 10000 },
				{ method: "card", amount: 5000 },
			]);
			expect(dashboard.paymentMethodLabels).toEqual(
				expect.objectContaining({
					cash: "Efectivo",
					card: "Tarjeta",
				}),
			);
			expect(dashboard.topProducts[0]).toEqual({
				productId: lowStockProductId,
				name: "Coca Cola",
				quantitySold: 4,
				revenue: 25000,
				stock: 2,
			});
			expect(dashboard.lowStockProducts).toEqual([
				{
					id: lowStockProductId,
					name: "Coca Cola",
					categoryName: "Bebidas",
					stock: 2,
				},
			]);
			expect(dashboard.recentSales.map((sale) => sale.id)).toEqual([
				todaySaleTwoId,
				todaySaleOneId,
				yesterdaySaleId,
				previousMonthSaleId,
			]);

			const salesTrendByDate = new Map(
				dashboard.salesTrend.map((row) => [row.dateKey, row]),
			);
			expect(salesTrendByDate.get(formatDateKey(startOfDay(todayAt)))).toEqual({
				dateKey: formatDateKey(startOfDay(todayAt)),
				revenue: 15000,
				salesCount: 2,
			});
			expect(
				salesTrendByDate.get(formatDateKey(startOfDay(yesterdayAt))),
			).toEqual({
				dateKey: formatDateKey(startOfDay(yesterdayAt)),
				revenue: 7000,
				salesCount: 1,
			});
		} finally {
			ctx.cleanup();
		}
	});
});
