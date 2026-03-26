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
	const salesHistoryServer = await import("./sales-history");
	return { ctx, shiftsServer, salesServer, catalogServer, salesHistoryServer };
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
				"La suma de los pagos debe ser igual al total de la venta, salvo excedente en efectivo para devolver cambio",
			);
		} finally {
			ctx.cleanup();
		}
	});

	test("allows completed sales with cash overpayment and zero balance due", async () => {
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
				name: "Producto con vuelto",
				price: 22000,
				trackInventory: false,
				stock: 0,
			});

			const sale = await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 1 }],
				payments: [{ method: "cash", amount: 23000 }],
			});

			expect(sale.status).toBe("completed");
			expect(sale.totalAmount).toBe(22000);
			expect(sale.paidAmount).toBe(23000);
			expect(sale.balanceDue).toBe(0);
		} finally {
			ctx.cleanup();
		}
	});

	test("calculates expected cash using net sale amount when there is change", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 200000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto con devuelta",
				price: 22000,
				trackInventory: false,
				stock: 0,
			});

			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 1 }],
				payments: [{ method: "cash", amount: 25000 }],
			});

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			const cashSummary = summary.summaryByMethod.find(
				(row: { paymentMethod: string }) => row.paymentMethod === "cash",
			);
			expect(cashSummary?.expectedAmount).toBe(222000);
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects completed sales with overpayment when cash cannot cover the change", async () => {
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
				name: "Producto sobrepago tarjeta",
				price: 22000,
				trackInventory: false,
				stock: 0,
			});

			await expect(
				salesServer.createPosSaleForCurrentOrganization({
					shiftId: openedShift.id,
					items: [{ productId, quantity: 1 }],
					payments: [
						{ method: "card", amount: 23000 },
						{ method: "cash", amount: 1000 },
					],
				}),
			).rejects.toThrow(
				"La suma de los pagos debe ser igual al total de la venta, salvo excedente en efectivo para devolver cambio",
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
				.select({
					saleId: schema.payment.saleId,
					amount: schema.payment.amount,
				})
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
				paymentMethod: "cash",
				amount: 2000,
				description: "Ingreso extra",
			});
			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "expense",
				paymentMethod: "cash",
				amount: 500,
				description: "Compra insumos",
			});

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			const cashSummary = summary.summaryByMethod.find(
				(row: { paymentMethod: string }) => row.paymentMethod === "cash",
			);
			expect(cashSummary?.expectedAmount).toBe(12500);
			expect(summary.movements.totals).toEqual({
				inflow: 2000,
				expense: 500,
				payout: 0,
				net: 1500,
			});
			expect(summary.movements.items).toHaveLength(2);
			expect(summary.movements.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: "inflow",
						paymentMethod: "cash",
						amount: 2000,
						description: "Ingreso extra",
					}),
					expect.objectContaining({
						type: "expense",
						paymentMethod: "cash",
						amount: 500,
						description: "Compra insumos",
					}),
				]),
			);

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

	test("applies movements to non-cash payment methods in shift close summary", async () => {
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
				price: 4000,
				trackInventory: false,
			});
			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 1 }],
				payments: [{ method: "card", amount: 4000 }],
			});

			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "inflow",
				paymentMethod: "card",
				amount: 700,
				description: "Ajuste terminal tarjeta",
			});
			await shiftsServer.registerCashMovementForCurrentOrganization({
				shiftId: openedShift.id,
				type: "expense",
				paymentMethod: "card",
				amount: 200,
				description: "Comisión reversada manualmente",
			});

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			const cashSummary = summary.summaryByMethod.find(
				(row: { paymentMethod: string }) => row.paymentMethod === "cash",
			);
			const cardSummary = summary.summaryByMethod.find(
				(row: { paymentMethod: string }) => row.paymentMethod === "card",
			);

			expect(cashSummary?.expectedAmount).toBe(5000);
			expect(cardSummary?.expectedAmount).toBe(4500);
			expect(summary.totalExpected).toBe(9500);
			expect(summary.movements.items).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: "inflow",
						paymentMethod: "card",
						amount: 700,
					}),
					expect.objectContaining({
						type: "expense",
						paymentMethod: "card",
						amount: 200,
					}),
				]),
			);
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
					paymentMethod: "cash",
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

	test("allows sale to leave tracked product stock in negative", async () => {
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

			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId, quantity: 2 }],
				payments: [{ method: "cash", amount: 2400 }],
			});

			const [updatedProduct] = await ctx.db
				.select({ stock: schema.product.stock })
				.from(schema.product)
				.where(eq(schema.product.id, productId))
				.limit(1);

			expect(updatedProduct?.stock).toBe(-1);
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

			const pageOne =
				await catalogServer.searchPosProductsForCurrentOrganization({
					searchQuery: "a",
					categoryId: bebidasId,
					limit: 1,
					cursor: 0,
				});

			expect(pageOne.data).toHaveLength(1);
			expect(pageOne.hasMore).toBe(true);
			expect(pageOne.data[0]?.name).toBe("Agua");

			const pageTwo =
				await catalogServer.searchPosProductsForCurrentOrganization({
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

			const pageOne =
				await catalogServer.searchPosCustomersForCurrentOrganization({
					searchQuery: "an",
					limit: 1,
					cursor: 0,
				});
			expect(pageOne.data).toHaveLength(1);
			expect(pageOne.hasMore).toBe(true);

			const pageTwo =
				await catalogServer.searchPosCustomersForCurrentOrganization({
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
				paymentMethod: "cash",
				amount: 200,
				description: "Fondo adicional",
			});

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			expect(
				summary.summaryByMethod.map(
					(row: { paymentMethod: string }) => row.paymentMethod,
				),
			).toEqual(["cash", "card", "zelle"]);
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

	test("cancels a paid sale, restores stock, and removes it from cash summary", async () => {
		const { ctx, shiftsServer, salesServer, salesHistoryServer } =
			await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 1000,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto Anulable",
				price: 2000,
				stock: 10,
				trackInventory: true,
			});

			const createdSale = await salesServer.createPosSaleForCurrentOrganization(
				{
					shiftId: openedShift.id,
					items: [{ productId, quantity: 2 }],
					payments: [{ method: "cash", amount: 4000 }],
				},
			);

			await salesServer.cancelSaleForCurrentOrganization({
				saleId: createdSale.saleId,
			});

			const [cancelledSale, restoredProduct] = await Promise.all([
				ctx.db
					.select({ status: schema.sale.status })
					.from(schema.sale)
					.where(eq(schema.sale.id, createdSale.saleId))
					.limit(1),
				ctx.db
					.select({ stock: schema.product.stock })
					.from(schema.product)
					.where(eq(schema.product.id, productId))
					.limit(1),
			]);

			expect(cancelledSale[0]?.status).toBe("cancelled");
			expect(restoredProduct[0]?.stock).toBe(10);

			const inventoryMovements = await ctx.db
				.select({
					type: schema.inventoryMovement.type,
					quantity: schema.inventoryMovement.quantity,
					notes: schema.inventoryMovement.notes,
				})
				.from(schema.inventoryMovement)
				.where(eq(schema.inventoryMovement.productId, productId));

			expect(inventoryMovements).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ type: "sale", quantity: -2 }),
					expect.objectContaining({
						type: "adjustment",
						quantity: 2,
						notes: expect.stringContaining(createdSale.saleId),
					}),
				]),
			);

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			expect(summary.summaryByMethod).toEqual([
				{
					paymentMethod: "cash",
					expectedAmount: 1000,
					actualAmount: null,
					difference: null,
				},
			]);

			const listedSales =
				await salesHistoryServer.listSalesForCurrentOrganization({
					status: "cancelled",
				});
			expect(listedSales.data[0]).toEqual(
				expect.objectContaining({
					id: createdSale.saleId,
					status: "cancelled",
					totalAmount: 4000,
					paidAmount: 0,
					balanceDue: 0,
				}),
			);

			const detail = await salesHistoryServer.getSaleByIdForCurrentOrganization(
				{
					saleId: createdSale.saleId,
				},
			);
			expect(detail).toEqual(
				expect.objectContaining({
					id: createdSale.saleId,
					status: "cancelled",
					paidAmount: 0,
					balanceDue: 0,
				}),
			);
			expect(detail?.payments).toHaveLength(1);
		} finally {
			ctx.cleanup();
		}
	});

	test("cancels a credit sale and reverts the credit account balance", async () => {
		const { ctx, shiftsServer, salesServer } = await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 0,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});
			const customerId = await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Cliente Credito",
				documentNumber: "9001",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto Credito",
				price: 3000,
				trackInventory: false,
				stock: 0,
			});

			const createdSale = await salesServer.createPosSaleForCurrentOrganization(
				{
					shiftId: openedShift.id,
					customerId,
					items: [{ productId, quantity: 1 }],
					payments: [{ method: "cash", amount: 1000 }],
					isCreditSale: true,
				},
			);

			const [accountBeforeCancel] = await ctx.db
				.select({
					id: schema.creditAccount.id,
					balance: schema.creditAccount.balance,
				})
				.from(schema.creditAccount)
				.where(
					and(
						eq(schema.creditAccount.organizationId, ctx.organizationId),
						eq(schema.creditAccount.customerId, customerId),
					),
				)
				.limit(1);

			expect(accountBeforeCancel?.balance).toBe(2000);

			await salesServer.cancelSaleForCurrentOrganization({
				saleId: createdSale.saleId,
			});

			const [accountAfterCancel, cancelledSale] = await Promise.all([
				ctx.db
					.select({ balance: schema.creditAccount.balance })
					.from(schema.creditAccount)
					.where(eq(schema.creditAccount.id, accountBeforeCancel?.id ?? ""))
					.limit(1),
				ctx.db
					.select({ status: schema.sale.status })
					.from(schema.sale)
					.where(eq(schema.sale.id, createdSale.saleId))
					.limit(1),
			]);

			expect(accountAfterCancel[0]?.balance).toBe(0);
			expect(cancelledSale[0]?.status).toBe("cancelled");

			const summary =
				await shiftsServer.getShiftCloseSummaryForCurrentOrganization(
					openedShift.id,
				);
			expect(summary.summaryByMethod).toEqual([
				{
					paymentMethod: "cash",
					expectedAmount: 0,
					actualAmount: null,
					difference: null,
				},
			]);
		} finally {
			ctx.cleanup();
		}
	});

	test("lists sales with payment filters and balance summaries", async () => {
		const { ctx, shiftsServer, salesServer, salesHistoryServer } =
			await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja Historial",
			});
			const customerId = await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Cliente Historial",
				documentNumber: "500",
			});
			const firstProductId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto Card",
				price: 4000,
				trackInventory: false,
				stock: 0,
			});
			const secondProductId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Producto Credito",
				price: 3000,
				trackInventory: false,
				stock: 0,
			});

			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				items: [{ productId: firstProductId, quantity: 2 }],
				payments: [
					{ method: "card", amount: 5000 },
					{ method: "cash", amount: 3000 },
				],
			});
			await salesServer.createPosSaleForCurrentOrganization({
				shiftId: openedShift.id,
				customerId,
				items: [{ productId: secondProductId, quantity: 2 }],
				payments: [{ method: "cash", amount: 1000 }],
				isCreditSale: true,
			});

			const cardSales =
				await salesHistoryServer.listSalesForCurrentOrganization({
					paymentMethod: "card",
				});
			expect(cardSales.data).toHaveLength(1);
			expect(cardSales.data[0]).toEqual(
				expect.objectContaining({
					status: "completed",
					totalAmount: 8000,
					paidAmount: 8000,
					balanceDue: 0,
					itemCount: 2,
					paymentMethods: ["card", "cash"],
				}),
			);

			const creditSales =
				await salesHistoryServer.listSalesForCurrentOrganization({
					status: "credit",
					searchQuery: "Cliente Historial",
				});
			expect(creditSales.data).toHaveLength(1);
			expect(creditSales.data[0]).toEqual(
				expect.objectContaining({
					status: "credit",
					totalAmount: 6000,
					paidAmount: 1000,
					balanceDue: 5000,
					customerName: "Cliente Historial",
				}),
			);
		} finally {
			ctx.cleanup();
		}
	});

	test("returns sale details including modifiers and debt payments", async () => {
		const { ctx, shiftsServer, salesServer, salesHistoryServer } =
			await setupPosServers();
		try {
			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 5000,
				terminalId: "terminal-1",
				terminalName: "Caja Detalle",
			});
			const customerId = await insertCustomer({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Cliente Detalle",
				documentNumber: "501",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Hamburguesa",
				price: 5000,
				trackInventory: false,
				stock: 0,
			});
			const modifierId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Extra Queso",
				price: 1000,
				isModifier: true,
				trackInventory: false,
				stock: 0,
			});

			const createdSale = await salesServer.createPosSaleForCurrentOrganization(
				{
					shiftId: openedShift.id,
					customerId,
					items: [
						{
							productId,
							quantity: 2,
							modifiers: [{ modifierProductId: modifierId, quantity: 1 }],
						},
					],
					payments: [{ method: "cash", amount: 4000 }],
					isCreditSale: true,
				},
			);

			const [creditAccountRow] = await ctx.db
				.select({ id: schema.creditAccount.id })
				.from(schema.creditAccount)
				.where(
					and(
						eq(schema.creditAccount.organizationId, ctx.organizationId),
						eq(schema.creditAccount.customerId, customerId),
					),
				)
				.limit(1);

			expect(creditAccountRow?.id).toBeDefined();

			const debtPaymentId = crypto.randomUUID();
			await ctx.db.insert(schema.payment).values({
				id: debtPaymentId,
				organizationId: ctx.organizationId,
				saleId: createdSale.saleId,
				shiftId: openedShift.id,
				method: "card",
				reference: "ABONO-1",
				amount: createdSale.balanceDue,
				createdAt: new Date(Date.now() + 1_000),
			});
			await ctx.db.insert(schema.creditTransaction).values({
				id: crypto.randomUUID(),
				organizationId: ctx.organizationId,
				creditAccountId: creditAccountRow?.id ?? "",
				saleId: createdSale.saleId,
				paymentId: debtPaymentId,
				type: "payment",
				amount: createdSale.balanceDue,
				notes: "Abono final",
				createdAt: new Date(Date.now() + 1_000),
			});

			const detail = await salesHistoryServer.getSaleByIdForCurrentOrganization(
				{
					saleId: createdSale.saleId,
				},
			);

			expect(detail).toEqual(
				expect.objectContaining({
					id: createdSale.saleId,
					status: "credit",
					totalAmount: 12000,
					paidAmount: 12000,
					balanceDue: 0,
					customer: expect.objectContaining({
						id: customerId,
						name: "Cliente Detalle",
					}),
					shift: expect.objectContaining({
						id: openedShift.id,
						terminalName: "Caja Detalle",
					}),
				}),
			);
			expect(detail?.payments.map((payment) => payment.kind)).toEqual([
				"debt_payment",
				"sale_payment",
			]);
			expect(detail?.payments[0]).toEqual(
				expect.objectContaining({
					method: "card",
					amount: 8000,
					notes: "Abono final",
				}),
			);
			expect(detail?.items).toHaveLength(1);
			expect(detail?.items[0]).toEqual(
				expect.objectContaining({
					name: "Hamburguesa",
					quantity: 2,
					totalAmount: 12000,
					modifiers: [
						expect.objectContaining({
							modifierProductId: modifierId,
							name: "Extra Queso",
							quantity: 1,
							unitPrice: 1000,
							subtotal: 2000,
						}),
					],
				}),
			);
		} finally {
			ctx.cleanup();
		}
	});
});
