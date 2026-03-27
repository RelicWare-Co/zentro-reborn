import { describe, expect, test } from "bun:test";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";

async function setupCustomersServer() {
	const ctx = await createBackendTestContext("customers");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const server = await import("./customers.server");
	return { ctx, server };
}

describe("customers.server", () => {
	test("creates customers with normalized fields", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			const result = await server.createCustomerForCurrentOrganization({
				name: "  Ana Perez  ",
				documentNumber: "  9001  ",
				email: "   ",
				phone: " 300123 ",
			});

			const [createdCustomer] = await ctx.db
				.select()
				.from(schema.customer)
				.where(eq(schema.customer.id, result.id))
				.limit(1);

			expect(createdCustomer).toBeDefined();
			expect(createdCustomer?.organizationId).toBe(ctx.organizationId);
			expect(createdCustomer?.name).toBe("Ana Perez");
			expect(createdCustomer?.type).toBe("natural");
			expect(createdCustomer?.documentNumber).toBe("9001");
			expect(createdCustomer?.email).toBeNull();
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects duplicated active document numbers", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			await server.createCustomerForCurrentOrganization({
				name: "Cliente Uno",
				documentNumber: "123456",
			});

			await expect(
				server.createCustomerForCurrentOrganization({
					name: "Cliente Dos",
					documentNumber: "123456",
				}),
			).rejects.toThrow("Ya existe un cliente activo con ese documento");
		} finally {
			ctx.cleanup();
		}
	});

	test("search paginates active customers and excludes soft deleted rows", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			const first = await server.createCustomerForCurrentOrganization({
				name: "Carlos Uno",
				documentNumber: "A1",
			});
			await server.createCustomerForCurrentOrganization({
				name: "Carlos Dos",
				documentNumber: "A2",
			});
			await server.createCustomerForCurrentOrganization({
				name: "Carlos Tres",
				documentNumber: "A3",
			});

			await server.deleteCustomerForCurrentOrganization(first.id);

			const page = await server.searchCustomersForCurrentOrganization({
				searchQuery: "carlos",
				limit: 1,
				cursor: 0,
			});
			expect(page.data).toHaveLength(1);
			expect(page.hasMore).toBe(true);
			expect(page.total).toBe(2);
			expect(page.nextCursor).toBe(1);
			expect(page.data[0]?.name).toBe("Carlos Dos");

			const activeRows = await ctx.db
				.select({ id: schema.customer.id })
				.from(schema.customer)
				.where(
					and(
						eq(schema.customer.organizationId, ctx.organizationId),
						isNull(schema.customer.deletedAt),
					),
				);
			expect(activeRows).toHaveLength(2);
		} finally {
			ctx.cleanup();
		}
	});

	test("updates customer fields with normalized values", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			const created = await server.createCustomerForCurrentOrganization({
				name: "Cliente Inicial",
				documentNumber: "321",
				email: "inicial@demo.com",
			});

			const updateResult = await server.updateCustomerForCurrentOrganization({
				id: created.id,
				name: "  Cliente Actualizado  ",
				email: "   ",
				phone: " 3005550000 ",
			});

			expect(updateResult.success).toBe(true);

			const [updatedRow] = await ctx.db
				.select({
					name: schema.customer.name,
					email: schema.customer.email,
					phone: schema.customer.phone,
				})
				.from(schema.customer)
				.where(eq(schema.customer.id, created.id))
				.limit(1);

			expect(updatedRow?.name).toBe("Cliente Actualizado");
			expect(updatedRow?.email).toBeNull();
			expect(updatedRow?.phone).toBe("3005550000");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects update when document number already exists in another active customer", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			await server.createCustomerForCurrentOrganization({
				name: "Cliente Uno",
				documentNumber: "7777",
			});
			const second = await server.createCustomerForCurrentOrganization({
				name: "Cliente Dos",
				documentNumber: "8888",
			});

			await expect(
				server.updateCustomerForCurrentOrganization({
					id: second.id,
					documentNumber: "7777",
				}),
			).rejects.toThrow("Ya existe un cliente activo con ese documento");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects updates without fields", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			const created = await server.createCustomerForCurrentOrganization({
				name: "Cliente Sin Cambios",
				documentNumber: "9911",
			});

			await expect(
				server.updateCustomerForCurrentOrganization({ id: created.id }),
			).rejects.toThrow("No hay campos para actualizar");
		} finally {
			ctx.cleanup();
		}
	});

	test("rejects mutations for customers that are no longer active", async () => {
		const { ctx, server } = await setupCustomersServer();
		try {
			const created = await server.createCustomerForCurrentOrganization({
				name: "Cliente Eliminado",
				documentNumber: "9912",
			});

			await server.deleteCustomerForCurrentOrganization(created.id);

			await expect(
				server.updateCustomerForCurrentOrganization({
					id: created.id,
					name: "Cliente Reactivado",
				}),
			).rejects.toThrow(
				"El cliente no existe o ya fue eliminado en la organización actual",
			);
			await expect(
				server.deleteCustomerForCurrentOrganization(created.id),
			).rejects.toThrow(
				"El cliente no existe o ya fue eliminado en la organización actual",
			);
		} finally {
			ctx.cleanup();
		}
	});
});
