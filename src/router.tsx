import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { AppBootSplash } from "./components/AppBootSplash";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		context: getContext(),

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultPendingComponent: AppBootSplash,
		defaultPendingMs: 0,
		defaultPendingMinMs: 250,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
