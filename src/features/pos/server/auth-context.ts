import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
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
	return session.session.activeOrganizationId ?? null;
}

export async function requireAuthContext() {
	const session = await requireSession();
	const organizationId = await resolveOrganizationId(session);
	if (!organizationId) {
		throw new Error("No hay una organización activa");
	}

	return { session, organizationId };
}
