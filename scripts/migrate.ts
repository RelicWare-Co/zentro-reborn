import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!authToken) {
  throw new Error("DATABASE_AUTH_TOKEN environment variable is not set");
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(currentDir, "..", "drizzle");

console.log("[INFO] Running database migrations...");

const db = drizzle({
  connection: {
    url: databaseUrl,
    authToken,
  },
});

await migrate(db, { migrationsFolder });

console.log("[SUCCESS] Database migrations completed.");
