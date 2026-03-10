import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!authToken) {
	throw new Error("DATABASE_AUTH_TOKEN environment variable is not set");
}

export const db = drizzle({ connection: { url: databaseUrl, authToken }, schema});
