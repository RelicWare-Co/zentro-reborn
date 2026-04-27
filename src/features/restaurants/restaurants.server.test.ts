import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";
import type { createTestDatabase } from "#/test/test-db";

type TestDb = ReturnType<typeof createTestDatabase>["db"];

async function setupRestaurantServers() {
	const ctx = await createBackendTestContext("restaurants");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const restaurantsServer = await import("./restaurants.server");
	const shiftsServer = await import("#/features/pos/server/shifts");
	return { ctx, restaurantsServer, shiftsServer };
}

async function enableRestaurantsModule(input: {
	db: TestDb;
	organizationId: string;
	displayEnabled?: boolean;
}) {
	await input.db
		.update(schema.organization)
		.set({
			metadata: JSON.stringify({
				modules: {
					restaurants: {
						enabled: true,
					},
				},
				restaurants: {
					kitchen: {
						displayEnabled: input.displayEnabled ?? false,
						printTicketsEnabled: true,
						autoPrintOnSend: true,
					},
				},
			}),
		})
		.where(eq(schema.organization.id, input.organizationId));
}

async function insertRestaurantArea(input: {
	db: TestDb;
	organizationId: string;
	name: string;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.restaurantArea).values({
		id,
		organizationId: input.organizationId,
		name: input.name,
		sortOrder: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return id;
}

async function insertRestaurantTable(input: {
	db: TestDb;
	organizationId: string;
	areaId: string;
	name: string;
	seats?: number;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.restaurantTable).values({
		id,
		organizationId: input.organizationId,
		areaId: input.areaId,
		name: input.name,
		seats: input.seats ?? 4,
		sortOrder: 0,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return id;
}

async function insertProduct(input: {
	db: TestDb;
	organizationId: string;
	name: string;
	price: number;
	isModifier?: boolean;
}) {
	const id = crypto.randomUUID();
	await input.db.insert(schema.product).values({
		id,
		organizationId: input.organizationId,
		categoryId: null,
		name: input.name,
		sku: null,
		barcode: null,
		price: input.price,
		cost: 0,
		taxRate: 0,
		isModifier: input.isModifier ?? false,
		trackInventory: false,
		stock: 0,
		deletedAt: null,
		createdAt: new Date(),
	});
	return id;
}

describe("restaurants.server", () => {
	test("rejects restaurant bootstrap when module is disabled", async () => {
		const { ctx, restaurantsServer } = await setupRestaurantServers();
		try {
			await expect(
				restaurantsServer.getRestaurantBootstrapForCurrentOrganization(),
			).rejects.toThrow("no está habilitado");
		} finally {
			ctx.cleanup();
		}
	});

	test("creates an open order and exposes table summary in bootstrap", async () => {
		const { ctx, restaurantsServer } = await setupRestaurantServers();
		try {
			await enableRestaurantsModule({
				db: ctx.db,
				organizationId: ctx.organizationId,
			});
			const areaId = await insertRestaurantArea({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Salon",
			});
			const tableId = await insertRestaurantTable({
				db: ctx.db,
				organizationId: ctx.organizationId,
				areaId,
				name: "Mesa 1",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Hamburguesa",
				price: 18000,
			});

			await restaurantsServer.addRestaurantOrderItemForCurrentOrganization({
				tableId,
				productId,
				quantity: 2,
			});

			const bootstrap =
				await restaurantsServer.getRestaurantBootstrapForCurrentOrganization();
			const table = bootstrap.areas[0]?.tables[0];

			expect(table?.openOrder?.orderNumber).toBe(1);
			expect(table?.openOrder?.itemCount).toBe(2);
			expect(table?.openOrder?.draftItemsCount).toBe(2);
			expect(table?.openOrder?.totalAmount).toBe(36000);
		} finally {
			ctx.cleanup();
		}
	});

	test("sends an order to kitchen and closes it as a POS sale", async () => {
		const { ctx, restaurantsServer, shiftsServer } =
			await setupRestaurantServers();
		try {
			await enableRestaurantsModule({
				db: ctx.db,
				organizationId: ctx.organizationId,
				displayEnabled: true,
			});
			const areaId = await insertRestaurantArea({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Terraza",
			});
			const tableId = await insertRestaurantTable({
				db: ctx.db,
				organizationId: ctx.organizationId,
				areaId,
				name: "Mesa 7",
			});
			const productId = await insertProduct({
				db: ctx.db,
				organizationId: ctx.organizationId,
				name: "Pizza",
				price: 24000,
			});

			await restaurantsServer.addRestaurantOrderItemForCurrentOrganization({
				tableId,
				productId,
				quantity: 1,
			});
			const tableDetail =
				await restaurantsServer.getRestaurantTableDetailForCurrentOrganization({
					tableId,
				});
			const orderId = tableDetail.openOrder?.id;
			expect(orderId).toBeTruthy();
			if (!orderId) throw new Error("Expected orderId to be defined");

			const sendResult =
				await restaurantsServer.sendRestaurantOrderToKitchenForCurrentOrganization(
					orderId,
				);
			expect(sendResult.ticket.sequenceNumber).toBe(1);
			expect(sendResult.ticket.items).toHaveLength(1);

			const kitchenBoard =
				await restaurantsServer.getKitchenBoardForCurrentOrganization();
			expect(kitchenBoard.tickets).toHaveLength(1);

			const openedShift = await shiftsServer.openShiftForCurrentOrganization({
				startingCash: 0,
				terminalId: "terminal-1",
				terminalName: "Caja 1",
			});

			const saleResult =
				await restaurantsServer.closeRestaurantOrderForCurrentOrganization({
					orderId,
					shiftId: openedShift.id,
					payments: [{ method: "cash", amount: 24000 }],
				});

			expect(saleResult.totalAmount).toBe(24000);
			expect(saleResult.status).toBe("completed");

			const [restaurantOrderRow] = await ctx.db
				.select({
					status: schema.restaurantOrder.status,
					saleId: schema.restaurantOrder.saleId,
				})
				.from(schema.restaurantOrder)
				.where(
					and(
						eq(schema.restaurantOrder.organizationId, ctx.organizationId),
						eq(schema.restaurantOrder.id, orderId),
					),
				)
				.limit(1);

			const [saleRow] = await ctx.db
				.select({
					id: schema.sale.id,
					totalAmount: schema.sale.totalAmount,
				})
				.from(schema.sale)
				.where(
					and(
						eq(schema.sale.organizationId, ctx.organizationId),
						eq(schema.sale.id, saleResult.saleId),
					),
				)
				.limit(1);

			expect(restaurantOrderRow?.status).toBe("closed");
			expect(restaurantOrderRow?.saleId).toBe(saleResult.saleId);
			expect(saleRow?.totalAmount).toBe(24000);
		} finally {
			ctx.cleanup();
		}
	});
});
