import { createServerFn } from "@tanstack/react-start";
import { getDashboardOverviewForCurrentOrganization } from "./dashboard.server";

export const getDashboardOverview = createServerFn({ method: "GET" }).handler(
	async () => {
		return getDashboardOverviewForCurrentOrganization();
	},
);
