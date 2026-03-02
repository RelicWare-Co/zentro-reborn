import { createServerFn } from "@tanstack/react-start";
import { getIsAuthenticatedForRequest } from "./auth.server";

export const getIsAuthenticated = createServerFn({ method: "GET" }).handler(
	async () => {
		return getIsAuthenticatedForRequest();
	},
);
