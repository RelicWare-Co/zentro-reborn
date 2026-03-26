// TODO: migrate to LibSQL and update tests accordingly.
import { Database } from "bun:sqlite";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "#/db/schema";

const MIGRATIONS_DIR_PATH = resolve(process.cwd(), "drizzle");

function getMigrationFilePaths() {
	return readdirSync(MIGRATIONS_DIR_PATH)
		.filter((fileName) => fileName.endsWith(".sql"))
		.sort()
		.map((fileName) => resolve(MIGRATIONS_DIR_PATH, fileName));
}

export function createTestDatabase(fileName = "test.db") {
	const dbPath = resolve(process.cwd(), fileName);
	if (existsSync(dbPath)) {
		rmSync(dbPath);
	}

	const sqlite = new Database(dbPath, { create: true });
	sqlite.exec("PRAGMA foreign_keys = ON;");
	for (const migrationFilePath of getMigrationFilePaths()) {
		sqlite.exec(readFileSync(migrationFilePath, "utf8"));
	}

	const db = drizzle(sqlite, { schema });

	const cleanup = () => {
		sqlite.close();
		if (existsSync(dbPath)) {
			rmSync(dbPath);
		}
	};

	return { db, sqlite, dbPath, cleanup };
}

export function createOrgContext() {
	return {
		organizationId: faker.string.uuid(),
		userId: faker.string.uuid(),
	};
}

export function createAuthSession(
	userId: string,
	organizationId: string,
): {
	user: { id: string };
	session: { activeOrganizationId: string };
} {
	return {
		user: { id: userId },
		session: { activeOrganizationId: organizationId },
	};
}

export async function seedOrganizationWithMember(
	db: ReturnType<typeof createTestDatabase>["db"],
	input: { organizationId: string; userId: string },
) {
	const now = new Date();
	await db.insert(schema.organization).values({
		id: input.organizationId,
		name: faker.company.name(),
		slug: `org-${faker.string.alphanumeric(10).toLowerCase()}`,
		createdAt: now,
		metadata: null,
	});

	await db.insert(schema.user).values({
		id: input.userId,
		name: faker.person.fullName(),
		email: faker.internet.email().toLowerCase(),
		emailVerified: true,
		image: null,
		createdAt: now,
		updatedAt: now,
		role: "admin",
		banned: false,
		banReason: null,
		banExpires: null,
	});

	await db.insert(schema.member).values({
		id: faker.string.uuid(),
		organizationId: input.organizationId,
		userId: input.userId,
		role: "owner",
		createdAt: now,
	});
}
