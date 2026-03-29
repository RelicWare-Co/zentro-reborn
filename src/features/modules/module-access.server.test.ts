import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createBackendTestContext,
	mockBackendRuntime,
} from "#/test/backend-test-utils";

async function setupModuleAccessServer() {
	const ctx = await createBackendTestContext("module-access");
	mockBackendRuntime({ db: ctx.db, authContext: ctx.authContext });
	const moduleAccessServer = await import("./module-access.server");
	return { ctx, moduleAccessServer };
}

async function updateOrganizationSettings(input: {
	db: Awaited<ReturnType<typeof createBackendTestContext>>["db"];
	organizationId: string;
	metadata: Record<string, unknown>;
}) {
	await input.db
		.update(schema.organization)
		.set({
			metadata: JSON.stringify(input.metadata),
		})
		.where(eq(schema.organization.id, input.organizationId));
}

describe("module-access.server", () => {
	test("builds navigation from the module descriptor", async () => {
		const { ctx, moduleAccessServer } = await setupModuleAccessServer();
		try {
			await updateOrganizationSettings({
				db: ctx.db,
				organizationId: ctx.organizationId,
				metadata: {
					modules: {
						restaurants: {
							enabled: true,
						},
					},
					restaurants: {
						kitchen: {
							displayEnabled: true,
							printTicketsEnabled: true,
							autoPrintOnSend: true,
						},
					},
				},
			});

			const result =
				await moduleAccessServer.getOrganizationCapabilitiesForCurrentOrganization();

			expect(result.modules.restaurants.accessible).toBe(true);
			expect(
				result.modules.restaurants.navigation.map((item) => item.path),
			).toEqual(["/restaurants", "/kitchen"]);
			expect(result.modules.restaurants.flags.kitchenDisplayEnabled).toBe(true);
		} finally {
			ctx.cleanup();
		}
	});

	test("omits module navigation when the module is disabled", async () => {
		const { ctx, moduleAccessServer } = await setupModuleAccessServer();
		try {
			await updateOrganizationSettings({
				db: ctx.db,
				organizationId: ctx.organizationId,
				metadata: {
					modules: {
						restaurants: {
							enabled: false,
						},
					},
					restaurants: {
						kitchen: {
							displayEnabled: true,
							printTicketsEnabled: true,
							autoPrintOnSend: true,
						},
					},
				},
			});

			const result =
				await moduleAccessServer.getOrganizationCapabilitiesForCurrentOrganization();

			expect(result.modules.restaurants.accessible).toBe(false);
			expect(result.modules.restaurants.navigation).toEqual([]);
		} finally {
			ctx.cleanup();
		}
	});
});
