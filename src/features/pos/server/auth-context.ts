import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { asc, eq } from "drizzle-orm";
import { db } from "#/db";
import { member } from "#/db/schema";
import { auth } from "#/lib/auth";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

async function requireSession(): Promise<AuthSession> {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
	});

	if (!session) {
		throw new Error("No autorizado");
	}

	return session;
}

async function resolveOrganizationId(session: AuthSession) {
	const activeOrganizationId = session.session.activeOrganizationId;
	if (activeOrganizationId) {
		return activeOrganizationId;
	}

	const [membership] = await db
		.select({
			organizationId: member.organizationId,
		})
		.from(member)
		.where(eq(member.userId, session.user.id))
		.orderBy(asc(member.createdAt), asc(member.id))
		.limit(1);

	if (!membership) {
		return null;
	}

	return membership.organizationId;
}

export async function requireAuthContext() {
	const session = await requireSession();
	const organizationId = await resolveOrganizationId(session);
	if (!organizationId) {
		throw new Error("No hay una organización activa");
	}

	return { session, organizationId };
}
