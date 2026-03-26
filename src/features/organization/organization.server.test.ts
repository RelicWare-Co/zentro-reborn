import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "#/db/schema";
import {
	createAuthSession,
	createOrgContext,
	createTestDatabase,
	seedOrganizationWithMember,
} from "#/test/test-db";

let currentDb: ReturnType<typeof createTestDatabase>["db"];
let currentSession: {
	user: {
		id: string;
		email: string;
		role: string | null;
	};
	session: { activeOrganizationId: string | null };
} | null = null;

mock.module("#/db", () => ({
	db: new Proxy({} as typeof currentDb, {
		get(_target, property, receiver) {
			const value = Reflect.get(currentDb, property, receiver);
			return typeof value === "function" ? value.bind(currentDb) : value;
		},
	}),
}));

mock.module("#/lib/auth", () => ({
	auth: {
		api: {
			getSession: async () => currentSession,
		},
	},
}));

mock.module("#/features/pos/server/auth-context", () => ({
	requireAuthContext: async () => {
		if (!currentSession?.session.activeOrganizationId) {
			throw new Error("No hay una organización activa");
		}

		return {
			organizationId: currentSession.session.activeOrganizationId,
			session: currentSession,
		};
	},
}));

mock.module("@tanstack/react-start/server", () => ({
	getRequest: () => ({ headers: new Headers() }),
}));

const serverPromise = import("./organization.server");

function extractToken(joinPath: string) {
	const joinUrl = new URL(joinPath, "https://zentro.test");
	return joinUrl.searchParams.get("token");
}

describe("organization.server", () => {
	beforeEach(() => {
		delete process.env.ALLOW_ORGANIZATION_CREATION;
		delete process.env.ORGANIZATION_CONTACT_EMAIL;
		delete process.env.ORGANIZATION_CONTACT_URL;
	});

	afterEach(() => {
		currentSession = null;
	});

	test("returns pending invitations and contact fallback for the selector", async () => {
		const testDatabase = createTestDatabase(
			`tmp-organization-selector-${crypto.randomUUID()}.db`,
		);
		currentDb = testDatabase.db;

		try {
			const orgContext = createOrgContext();
			await seedOrganizationWithMember(testDatabase.db, orgContext);

			const inviteeUserId = crypto.randomUUID();
			await testDatabase.db.insert(schema.user).values({
				id: inviteeUserId,
				name: "Cliente Invitado",
				email: "cliente.invitado@example.com",
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: "user",
				banned: false,
				banReason: null,
				banExpires: null,
			});

			await testDatabase.db.insert(schema.invitation).values({
				id: crypto.randomUUID(),
				organizationId: orgContext.organizationId,
				email: "cliente.invitado@example.com",
				role: "member",
				status: "pending",
				expiresAt: new Date(Date.now() + 86_400_000),
				createdAt: new Date(),
				inviterId: orgContext.userId,
			});

			process.env.ALLOW_ORGANIZATION_CREATION = "false";
			process.env.ORGANIZATION_CONTACT_EMAIL = "admin@zentro.test";
			currentSession = {
				user: {
					id: inviteeUserId,
					email: "cliente.invitado@example.com",
					role: "user",
				},
				session: {
					activeOrganizationId: null,
				},
			};

			const server = await serverPromise;
			const result = await server.getOrganizationSelectionDataForCurrentUser();

			expect(result.allowOrganizationCreation).toBe(false);
			expect(result.contactHref).toBe("mailto:admin@zentro.test");
			expect(result.invitations).toHaveLength(1);
			expect(result.invitations[0]?.organizationId).toBe(
				orgContext.organizationId,
			);
		} finally {
			testDatabase.cleanup();
		}
	});

	test("creates join links for an organization manager and exposes them in management data", async () => {
		const testDatabase = createTestDatabase(
			`tmp-organization-management-${crypto.randomUUID()}.db`,
		);
		currentDb = testDatabase.db;

		try {
			const orgContext = createOrgContext();
			await seedOrganizationWithMember(testDatabase.db, orgContext);

			const [ownerRow] = await testDatabase.db
				.select({
					email: schema.user.email,
				})
				.from(schema.user)
				.where(eq(schema.user.id, orgContext.userId))
				.limit(1);

			currentSession = {
				user: {
					id: orgContext.userId,
					email: ownerRow?.email ?? "owner@example.com",
					role: "admin",
				},
				session: createAuthSession(orgContext.userId, orgContext.organizationId)
					.session,
			};

			const server = await serverPromise;
			const createdJoinLink =
				await server.createOrganizationJoinLinkForCurrentOrganization({
					label: "Cliente Centro",
					expiresInDays: 7,
				});
			const managementData =
				await server.getOrganizationManagementDataForCurrentOrganization();

			expect(createdJoinLink.joinPath).toContain("/join?token=");
			expect(managementData.viewer.canManageAccess).toBe(true);
			expect(managementData.joinLinks).toHaveLength(1);
			expect(managementData.joinLinks[0]?.label).toBe("Cliente Centro");
			expect(managementData.stats.activeJoinLinksCount).toBe(1);
		} finally {
			testDatabase.cleanup();
		}
	});

	test("redeems a join link and adds the current user as member", async () => {
		const testDatabase = createTestDatabase(
			`tmp-organization-redeem-${crypto.randomUUID()}.db`,
		);
		currentDb = testDatabase.db;

		try {
			const orgContext = createOrgContext();
			await seedOrganizationWithMember(testDatabase.db, orgContext);

			const [ownerRow] = await testDatabase.db
				.select({
					email: schema.user.email,
				})
				.from(schema.user)
				.where(eq(schema.user.id, orgContext.userId))
				.limit(1);

			currentSession = {
				user: {
					id: orgContext.userId,
					email: ownerRow?.email ?? "owner@example.com",
					role: "admin",
				},
				session: createAuthSession(orgContext.userId, orgContext.organizationId)
					.session,
			};

			const server = await serverPromise;
			const joinLink =
				await server.createOrganizationJoinLinkForCurrentOrganization({
					label: "Cliente Nuevo",
					expiresInDays: 7,
				});
			const token = extractToken(joinLink.joinPath);
			expect(token).toBeTruthy();

			const newUserId = crypto.randomUUID();
			await testDatabase.db.insert(schema.user).values({
				id: newUserId,
				name: "Cliente Nuevo",
				email: "cliente.nuevo@example.com",
				emailVerified: true,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				role: "user",
				banned: false,
				banReason: null,
				banExpires: null,
			});

			currentSession = {
				user: {
					id: newUserId,
					email: "cliente.nuevo@example.com",
					role: "user",
				},
				session: {
					activeOrganizationId: null,
				},
			};

			const redeemResult = await server.redeemOrganizationJoinLinkByToken({
				token: token ?? "",
			});
			const previewResult = await server.getOrganizationJoinLinkPreviewByToken({
				token: token ?? "",
			});

			const [createdMembership] = await testDatabase.db
				.select({
					role: schema.member.role,
				})
				.from(schema.member)
				.where(
					and(
						eq(schema.member.organizationId, orgContext.organizationId),
						eq(schema.member.userId, newUserId),
					),
				)
				.limit(1);

			expect(redeemResult.status).toBe("joined");
			expect(redeemResult.organizationId).toBe(orgContext.organizationId);
			expect(createdMembership?.role).toBe("member");
			expect(previewResult.status).toBe("used");
			expect(previewResult.canJoin).toBe(false);
		} finally {
			testDatabase.cleanup();
		}
	});
});
