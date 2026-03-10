import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";
import type { createTestDatabase } from "#/test/test-db";

type TestDb = ReturnType<typeof createTestDatabase>["db"];

async function setupPosServers() {
	const ctx = await createBackendTestContext("pos");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const shiftsServer = await import("./shifts");
	const salesServer = await import("./sales");
	const catalogServer = await import("./catalog");
	return { ctx, shiftsServer, salesServer, catalogServer };
}

async function insertProduct(input: {
	organizationId: string;
	db: TestDb;
	name?: string;
	categoryId?: string | null;
	sku?: string | null;
	barcode?: string | null;
	price?: number;
	stock?: number;
	trackInventory?: boolean;
	isModifier?: boolean;
	deletedAt?: Date | null;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.product).values({
		id,
		organizationId: input.organizationId,
		categoryId: input.categoryId ?? null,
		name: input.name ?? "Producto POS",
		sku: input.sku ?? null,
		barcode: input.barcode ?? null,
		price: input.price ?? 1000,
		cost: 500,
		taxRate: 0,
		isModifier: input.isModifier ?? false,
		trackInventory: input.trackInventory ?? true,
		stock: input.stock ?? 10,
		deletedAt: input.deletedAt ?? null,
		createdAt: new Date(),
	});
	return id;
}

async function insertCategory(input: {
	db: TestDb;
	organizationId: string;
	name: string;
	description?: string | null;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.category).values({
		id,
		organizationId: input.organizationId,
		name: input.name,
		description: input.description ?? null,
		createdAt: new Date(),
	});
	return id;
}

async function insertCustomer(input: {
	db: TestDb;
	organizationId: string;
	name: string;
	documentNumber: string;
	deletedAt?: Date | null;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.customer).values({
		id,
		organizationId: input.organizationId,
		type: "natural",
		documentType: "CC",
		documentNumber: input.documentNumber,
		name: input.name,
		email: null,
		phone: null,
		address: null,
		city: null,
		taxRegime: null,
		deletedAt: input.deletedAt ?? null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return id;
}

describe("pos server modules", () => {
	test("prevents opening multiple shifts for the same user", async () => {
		const { ctx, shiftsServer } = await setupPosServers();
		try {
			await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 20000,
				terminalId: "terminal-1",
				terminalName: "Caja Principal",
			});

			await expect(
				shiftsServer.openShiftForCurrentOrganization({
					startingCash: 10000,
					terminalId: "terminal-2",
					terminalName: "Caja 2",
				}),
			).rejects.toThrow("El usuario ya tiene un turno abierto");
		} finally {
			ctx.cleanup();
		}
	});

	test("creates a sale, registers payment, and updates stock", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 10000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
			});

			const sale = await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 2 }],
				payments: [{ method: "cash", amount: 2000 }],
			});

			expect(sale.status).toBe("completed");
			expect(sale.totalAmount).toBe(2000);
			expect(sale.paidAmount).toBe(2000);

			const [updatedProduct] = await ctx.db
				.select({ stock: schema.product.stock })
				.from(schema.product)
				.where(
					and(
						eq(schema.product.id, productId),
						eq(schema.product.organizationId, ctx.organizationId),
					),
				)
				.limit(1);
			expect(updatedProduct?.stock).toBe(8);

			const [inventoryMovement] = await ctx.db
				.select({ quantity: schema.inventoryMovement.quantity })
				.from(schema.inventoryMovement)
				.where(
					and(
						eq(schema.inventoryMovement.organizationId, ctx.organizationId),
						eq(schema.inventoryMovement.productId, productId),
					),
				)
				.limit(1);
			expect(inventoryMovement?.quantity).toBe(-2);
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects completed sales when payment totals do not match", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto pago invalido",
				price: 1200,
				trackInventory: false,
				stock: 0,
			});

			await expect(
				salesServer.createPosSaleForCurrentOrganization({
					shiftId: openedShift.id,
					items: [{ productId, quantity: 2 }],
					payments: [{ method: "cash", amount: 1000 }],
				}),
			).rejects.toThrow(
				"La suma de los pagos debe ser igual al total de la venta",
			);
		} finally {
			ctx.cleanup();
		}
	});

	test("allows partial upfront payment on credit sales", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});
			const customerId = await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Cliente Mixto",
				documentNumber: "110",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto credito parcial",
				price: 3000,
				trackInventory: false,
				stock: 0,
			});

			const sale = await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				customerId,
				items: [{ productId, quantity: 2 }],
				payments: [{ method: "cash", amount: 2000 }],
				isCreditSale: true,
			});

			expect(sale.status).toBe("credit");
			expect(sale.totalAmount).toBe(6000);
			expect(sale.paidAmount).toBe(2000);
			expect(sale.balanceDue).toBe(4000);

			const [accountRow] = await ctx.db
				.select({ balance: schema.creditAccount.balance })
				.from(schema.creditAccount)
				.where(
					and(
						eq(schema.creditAccount.organizationId, ctx.organizationId),
						eq(schema.creditAccount.customerId, customerId),
					),
				)
				.limit(1);
			expect(accountRow?.balance).toBe(4000);

			const createdPayments = await ctx.db
				.select({ saleId: schema.payment.saleId, amount: schema.payment.amount })
				.from(schema.payment)
				.where(eq(schema.payment.shiftId, openedShift.id));
			expect(createdPayments).toHaveLength(1);
			expect(createdPayments[0]?.amount).toBe(2000);
			expect(createdPayments[0]?.saleId).toBe(sale.saleId);
		} finally {
			ctx.cleanup();
		}
	});

	test("registers cash movements and includes them in shift close summary", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 10000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				trackInventory: false,
			});
			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 1 }],
				payments: [{ method: "cash", amount: 1000 }],
			});

			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "inflow",
				amount: 2000,
				description: "Ingreso extra",
			});
			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "expense",
				amount: 500,
				description: "Compra insumos",
			});

			const summary = await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
				openedShift.id,
			);
			const cashSummary = summary.summaryByMethod.find(
				(row: { paymentMethod: string }) => row.paymentMethod === "cash",
			);
			expect(cashSummary?.expectedAmount).toBe(12500);

			const closeResult = await shiftsServer.closeShiftForCurrentOrganization({
				shiftId: openedShift.id,
				closures: [{ paymentMethod: "cash", actualAmount: 12400 }],
			});
			expect(closeResult.closures).toHaveLength(1);
			expect(closeResult.closures[0]?.difference).toBe(-100);
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects cash movements for closed shifts", async () => {
		const { ctx, shiftsServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 3000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});
			await shiftsServer.closeShiftForCurrentOrganization({
				shiftId: openedShift.id,
				closures: [{ paymentMethod: "cash", actualAmount: 3000 }],
			});

			await expect(
				shiftsServer.registerCashMovementForCurrentOrganization({
					shiftId: openedShift.id,
					type: "inflow",
					amount: 1000,
					description: "Ingreso tardío",
				}),
			).rejects.toThrow("No se puede registrar movimiento en un turno cerrado");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects sales for closed shifts", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 3000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});
			await shiftsServer.closeShiftForCurrentOrganization({
				shiftId: openedShift.id,
				closures: [{ paymentMethod: "cash", actualAmount: 3000 }],
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				trackInventory: false,
			});
			await expect(
				salesServer.createPosSaleForCurrentOrganization({
					shiftId: openedShift.id,
					items: [{ productId, quantity: 1 }],
					payments: [{ method: "cash", amount: 1000 }],
				}),
			).rejects.toThrow("No se puede registrar una venta en un turno cerrado");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects sales without items", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 3000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			await expect(
				salesServer.createPosSaleForCurrentOrganization({
					shiftId: openedShift.id,
					items: [],
					payments: [],
				}),
			).rejects.toThrow("La venta debe incluir al menos un ítem");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects sale when there is not enough inventory", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 3000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto corto",
				price: 1200,
				stock: 1,
				trackInventory: true,
			});

			await expect(
				salesServer.createPosSaleForCurrentOrganization({
					shiftId: openedShift.id,
					items: [{ productId, quantity: 2 }],
					payments: [{ method: "cash", amount: 2400 }],
				}),
			).rejects.toThrow("Stock insuficiente para Producto corto");
		} finally {
			ctx.cleanup();
		}
	});

	test("returns bootstrap with active shift, categories and only active modifiers", async () => {
		const { ctx, shiftsServer } = await setupPosServers();
		try {
			const beveragesId = await insertCategory({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Bebidas",
			});
			await insertCategory({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Comidas",
			});

			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Extra Queso",
				categoryId: beveragesId,
				isModifier: true,
				trackInventory: false,
			});
			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Modifier borrado",
				isModifier: true,
				deletedAt: new Date(),
				trackInventory: false,
			});
			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto normal",
				isModifier: false,
				trackInventory: false,
			});

			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const bootstrap =
				await shiftsServer.getPosBootstrapForCurrentOrganization();

			expect(bootstrap.activeShift?.id).toBe(openedShift.id);
			expect(bootstrap.categories).toHaveLength(2);
			expect(bootstrap.modifierProducts).toHaveLength(1);
			expect(bootstrap.modifierProducts[0]?.name).toBe("Extra Queso");
		} finally {
			ctx.cleanup();
		}
	});

	test("searches POS products with pagination, filters and excludes deleted", async () => {
		const { ctx, catalogServer } = await setupPosServers();
		try {
			const bebidasId = await insertCategory({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Bebidas",
			});
			const comidasId = await insertCategory({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Comidas",
			});

			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Agua",
				categoryId: bebidasId,
				sku: "A1",
				trackInventory: false,
			});
			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Avena",
				categoryId: bebidasId,
				sku: "A2",
				trackInventory: false,
			});
			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Almuerzo",
				categoryId: comidasId,
				barcode: "ALM-1",
				trackInventory: false,
			});
			await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Archivado",
				categoryId: bebidasId,
				deletedAt: new Date(),
				trackInventory: false,
			});

			const pageOne = await catalogServer.searchPosProductsForCurrentOrganization({
				searchQuery: "a",
				categoryId: bebidasId,
				limit: 1,
				cursor: 0,
			});

			expect(pageOne.data).toHaveLength(1);
			expect(pageOne.hasMore).toBe(true);
			expect(pageOne.data[0]?.name).toBe("Agua");

			const pageTwo = await catalogServer.searchPosProductsForCurrentOrganization({
				searchQuery: "a",
				categoryId: bebidasId,
				limit: 1,
				cursor: pageOne.nextCursor,
			});

			expect(pageTwo.data).toHaveLength(1);
			expect(pageTwo.hasMore).toBe(false);
			expect(pageTwo.data[0]?.name).toBe("Avena");
		} finally {
			ctx.cleanup();
		}
	});

	test("searches POS customers with pagination and excludes soft deleted", async () => {
		const { ctx, catalogServer } = await setupPosServers();
		try {
			await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Ana Diaz",
				documentNumber: "100",
			});
			await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Andres Ruiz",
				documentNumber: "101",
			});
			await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Anulada",
				documentNumber: "102",
				deletedAt: new Date(),
			});

			const pageOne = await catalogServer.searchPosCustomersForCurrentOrganization({
				searchQuery: "an",
				limit: 1,
				cursor: 0,
			});
			expect(pageOne.data).toHaveLength(1);
			expect(pageOne.hasMore).toBe(true);

			const pageTwo = await catalogServer.searchPosCustomersForCurrentOrganization({
				searchQuery: "an",
				limit: 1,
				cursor: pageOne.nextCursor,
			});
			expect(pageTwo.data).toHaveLength(1);
			expect(pageTwo.hasMore).toBe(false);
			expect(pageOne.data[0]?.name).toBe("Ana Diaz");
			expect(pageTwo.data[0]?.name).toBe("Andres Ruiz");
		} finally {
			ctx.cleanup();
		}
	});

	test("orders shift close summary by method with cash first", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 1000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				trackInventory: false,
			});

			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 1 }],
				payments: [
					{ method: "zelle", amount: 300 },
					{ method: "card", amount: 700 },
				],
			});

			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "inflow",
				amount: 200,
				description: "Fondo adicional",
			});

			const summary = await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
				openedShift.id,
			);
			expect(summary.summaryByMethod.map((row: { paymentMethod: string }) => row.paymentMethod)).toEqual([
				"cash",
				"card",
				"zelle",
			]);
			expect(summary.summaryByMethod[0]?.expectedAmount).toBe(1200);
			expect(summary.totalExpected).toBe(2200);
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects shift close with duplicated payment methods", async () => {
		const { ctx, shiftsServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			await expect(
				shiftsServer.closeShiftForCurrentOrganization({
					shiftId: openedShift.id,
					closures: [
						{ paymentMethod: "cash", actualAmount: 3000 },
						{ paymentMethod: "cash", actualAmount: 2000 },
					],
				}),
			).rejects.toThrow("Método de pago duplicado en cierre: cash");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects closing a shift twice", async () => {
		const { ctx, shiftsServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 4000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			await shiftsServer.closeShiftForCurrentOrganization({
				shiftId: openedShift.id,
				closures: [{ paymentMethod: "cash", actualAmount: 4000 }],
			});

			await expect(
				shiftsServer.closeShiftForCurrentOrganization({
					shiftId: openedShift.id,
					closures: [{ paymentMethod: "cash", actualAmount: 4000 }],
				}),
			).rejects.toThrow("El turno ya está cerrado");
		} finally {
			ctx.cleanup();
		}
	});
});
