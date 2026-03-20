import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";

export const auth = betterAuth({
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // Cache duration in seconds
		},
	},
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	experimental: { joins: true },
	emailAndPassword: {
		enabled: true,
	},
	plugins: [tanstackStartCookies(), admin(), organization()],
});
