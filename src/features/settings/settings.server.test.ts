import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";
import { parseOrganizationSettingsMetadata } from "./settings.shared";

async function setupSettingsServer() {
	const ctx = await createBackendTestContext("settings");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const server = await import("./settings.server");
	return { ctx, server };
}

describe("settings.server", () => {
	test("returns organization stats and parsed settings for the current organization", async () => {
		const { ctx, server } = await setupSettingsServer();
		try {
			await ctx.db
				.update(schema.organization)
				.set({
					metadata: JSON.stringify({
						pos: {
							defaultTerminalName: "Caja Terraza",
							defaultStartingCash: 25000,
						},
						credit: {
							allowCreditSales: false,
						},
						inventory: {
							lowStockThreshold: 3,
						},
					}),
				})
				.where(eq(schema.organization.id, ctx.organizationId));

			const invitedUserId = crypto.randomUUID();
			await ctx.db.insert(schema.user).values({
				id: invitedUserId,
				name: "Segundo Usuario",
				email: "segundo.usuario@example.com",
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: "cashier",
				banned: false,
				banReason: null,
				banExpires: null,
			});
			await ctx.db.insert(schema.member).values({
				id: crypto.randomUUID(),
				organizationId: ctx.organizationId,
				userId: invitedUserId,
				role: "member",
				createdAt: new Date(),
			});
			await ctx.db.insert(schema.invitation).values({
				id: crypto.randomUUID(),
				organizationId: ctx.organizationId,
				email: "nuevo.miembro@example.com",
				role: "member",
				status: "pending",
				expiresAt: new Date(Date.now() + 86_400_000),
				createdAt: new Date(),
				inviterId: ctx.userId,
			});

			await ctx.db.insert(schema.product).values([
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					categoryId: null,
					name: "Producto Activo",
					sku: null,
					barcode: null,
					price: 5000,
					cost: 3000,
					taxRate: 0,
					isModifier: false,
					trackInventory: true,
					stock: 4,
					deletedAt: null,
					createdAt: new Date(),
				},
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					categoryId: null,
					name: "Producto Eliminado",
					sku: null,
					barcode: null,
					price: 2000,
					cost: 1000,
					taxRate: 0,
					isModifier: false,
					trackInventory: true,
					stock: 0,
					deletedAt: new Date(),
					createdAt: new Date(),
				},
			]);

			await ctx.db.insert(schema.customer).values([
				{
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					type: "natural",
					documentType: "CC",
					documentNumber: "1001",
					name: "Cliente Activo",
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
					id: crypto.randomUUID(),
					organizationId: ctx.organizationId,
					type: "natural",
					documentType: "CC",
					documentNumber: "1002",
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

			const result = await server.getSettingsForCurrentOrganization();

			expect(result.organization.id).toBe(ctx.organizationId);
			expect(result.stats).toEqual({
				membersCount: 2,
				invitationsCount: 1,
				productsCount: 1,
				customersCount: 1,
			});
			expect(result.settings.pos.defaultTerminalName).toBe("Caja Terraza");
			expect(result.settings.pos.defaultStartingCash).toBe(25000);
			expect(result.settings.credit.allowCreditSales).toBe(false);
			expect(result.settings.inventory.lowStockThreshold).toBe(3);
			expect(result.modules.restaurants.entitlementStatus).toBe("granted");
			expect(result.settings.modules.restaurants.enabled).toBe(false);
		} finally {
			ctx.cleanup();
		}
	});

	test("normalizes and persists updated settings", async () => {
		const { ctx, server } = await setupSettingsServer();
		try {
			const result = await server.updateSettingsForCurrentOrganization({
				settings: {
					modules: {
						restaurants: {
							enabled: true,
						},
					},
					restaurants: {
						kitchen: {
							displayEnabled: true,
							printTicketsEnabled: false,
							autoPrintOnSend: false,
						},
					},
					pos: {
						defaultTerminalName: "   ",
						defaultStartingCash: -10,
						paymentMethods: [
							{
								id: "cash",
								label: "Caja",
								enabled: false,
								requiresReference: true,
							},
							{
								id: "card",
								label: "Tarjeta personalizada",
								enabled: false,
								requiresReference: false,
							},
							{
								id: "transfer_nequi",
								label: "Nequi",
								enabled: false,
								requiresReference: false,
							},
							{
								id: "transfer_bancolombia",
								label: "Bancolombia",
								enabled: false,
								requiresReference: false,
							},
						],
					},
					credit: {
						allowCreditSales: false,
						defaultInterestRate: 999,
					},
					inventory: {
						defaultTaxRate: -5,
						trackInventoryByDefault: false,
						modifiersEnabledByDefault: false,
						lowStockThreshold: -2,
					},
				},
			});

			expect(result.success).toBe(true);
			expect(result.settings.pos.defaultTerminalName).toBe("Caja Principal");
			expect(result.settings.pos.defaultStartingCash).toBe(0);
			expect(result.settings.credit.allowCreditSales).toBe(false);
			expect(result.settings.credit.defaultInterestRate).toBe(100);
			expect(result.settings.inventory.defaultTaxRate).toBe(0);
			expect(result.settings.inventory.lowStockThreshold).toBe(0);
			expect(result.settings.modules.restaurants.enabled).toBe(true);
			expect(result.settings.restaurants.kitchen.displayEnabled).toBe(true);

			const cashMethod = result.settings.pos.paymentMethods.find(
				(method) => method.id === "cash",
			);
			const cardMethod = result.settings.pos.paymentMethods.find(
				(method) => method.id === "card",
			);
			expect(cashMethod).toEqual({
				id: "cash",
				label: "Caja",
				enabled: true,
				requiresReference: false,
			});
			expect(cardMethod).toEqual({
				id: "card",
				label: "Tarjeta personalizada",
				enabled: false,
				requiresReference: false,
			});

			const [organizationRow] = await ctx.db
				.select({ metadata: schema.organization.metadata })
				.from(schema.organization)
				.where(eq(schema.organization.id, ctx.organizationId))
				.limit(1);

			expect(
				parseOrganizationSettingsMetadata(organizationRow?.metadata),
			).toEqual(result.settings);
		} finally {
			ctx.cleanup();
		}
	});
});
