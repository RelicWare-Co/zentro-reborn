import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

export async function getIsAuthenticatedForRequest() {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
	});

	return Boolean(session);
}
