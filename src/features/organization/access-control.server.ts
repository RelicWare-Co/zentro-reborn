import "@tanstack/react-start/server-only";
import { and, eq } from "drizzle-orm";
import { db } from "#/db";
import { member, user } from "#/db/schema";
import { requireAuthContext } from "#/features/pos/server/auth-context";
import {
	isOrganizationManagerRole,
	isPlatformAdminRole,
} from "./access-control.shared";

export async function getCurrentOrganizationAccess() {
	const { session, organizationId } = await requireAuthContext();
	const userId = session.user.id;

	const [memberRow, userRow] = await Promise.all([
		db
			.select({ role: member.role })
			.from(member)
			.where(
				and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
			)
			.limit(1)
			.then((rows) => rows[0] ?? null),
		db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1)
			.then((rows) => rows[0] ?? null),
	]);

	if (!memberRow) {
		throw new Error("No perteneces a la organización activa.");
	}

	return {
		session,
		organizationId,
		userId,
		organizationRole: memberRow.role,
		platformRole: userRow?.role ?? null,
		isOrganizationManager: isOrganizationManagerRole(memberRow.role),
		isPlatformAdmin: isPlatformAdminRole(userRow?.role),
	};
}

export async function requireOrganizationManagerAccess() {
	const access = await getCurrentOrganizationAccess();
	if (!access.isOrganizationManager) {
		throw new Error(
			"No tienes permisos para cambiar la configuración de esta organización.",
		);
	}

	return access;
}

export async function requirePlatformAdminAccess() {
	const access = await getCurrentOrganizationAccess();
	if (!access.isPlatformAdmin) {
		throw new Error("Esta acción requiere permisos de administrador de la app.");
	}

	return access;
}
