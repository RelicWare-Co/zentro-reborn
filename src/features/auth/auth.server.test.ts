import { describe, expect, mock, test } from "bun:test";

let currentSession:
	| {
			user: { id: string };
			session: { activeOrganizationId: string | null };
	  }
	| null = null;

mock.module("#/lib/auth", () => ({
	auth: {
		api: {
			getSession: async () => currentSession,
		},
	},
}));

mock.module("@tanstack/react-start/server", () => ({
	getRequest: () => ({ headers: new Headers() }),
}));

const serverPromise = import("./auth.server");

describe("auth.server", () => {
	test("returns true when the current request has a session", async () => {
		currentSession = {
			user: { id: "user-1" },
			session: { activeOrganizationId: "org-1" },
		};

		const server = await serverPromise;

		await expect(server.getIsAuthenticatedForRequest()).resolves.toBe(true);
	});

	test("returns false when the current request is anonymous", async () => {
		currentSession = null;

		const server = await serverPromise;

		await expect(server.getIsAuthenticatedForRequest()).resolves.toBe(false);
	});
});
