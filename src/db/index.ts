import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index.ts";

function createDb() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	const authToken = process.env.DATABASE_AUTH_TOKEN;
	if (!authToken) {
		throw new Error("DATABASE_AUTH_TOKEN environment variable is not set");
	}

	return drizzle({
		connection: { url: databaseUrl, authToken },
		schema,
	});
}

type Database = ReturnType<typeof createDb>;

let dbInstance: Database | undefined;

export function getDb(): Database {
	if (dbInstance) {
		return dbInstance;
	}

	dbInstance = createDb();
	return dbInstance;
}

export const db = new Proxy({} as Database, {
	get(_target, property, receiver) {
		const target = getDb();
		const value = Reflect.get(target, property, receiver);
		return typeof value === "function" ? value.bind(target) : value;
	},
});
