import { mock } from "bun:test";
import {
	createAuthSession,
	createOrgContext,
	createTestDatabase,
	seedOrganizationWithMember,
} from "./test-db";

type TestDatabase = ReturnType<typeof createTestDatabase>;

export type MockAuthContext = {
	organizationId: string;
	session: {
		user: { id: string };
		session: { activeOrganizationId: string | null };
	};
};

export async function createBackendTestContext(prefix: string) {
	const testDatabase = createTestDatabase(
		`tmp-${prefix}-${crypto.randomUUID()}.db`,
	);
	const orgContext = createOrgContext();
	await seedOrganizationWithMember(testDatabase.db, orgContext);
	const session = createAuthSession(orgContext.userId, orgContext.organizationId);

	return {
		...testDatabase,
		organizationId: orgContext.organizationId,
		userId: orgContext.userId,
		authContext: {
			organizationId: orgContext.organizationId,
			session: {
				...session,
				session: {
					activeOrganizationId: session.session.activeOrganizationId ?? null,
				},
			},
		} satisfies MockAuthContext,
	};
}

export function mockBackendRuntime(input: {
	db: TestDatabase["db"];
	authContext: MockAuthContext;
}) {
	mock.module("#/db", () => ({ db: input.db }));
	mock.module("#/features/pos/server/auth-context", () => ({
		requireAuthContext: async () => input.authContext,
	}));
	mock.module("#/lib/auth", () => ({
		auth: {
			api: {
				getSession: async () => input.authContext.session,
			},
		},
	}));
	mock.module("@tanstack/react-start/server", () => ({
		getRequest: () => ({ headers: new Headers() }),
	}));
}
