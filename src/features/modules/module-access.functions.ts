import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	getOrganizationCapabilitiesForCurrentOrganization,
	setModuleEntitlementForCurrentOrganization,
} from "./module-access.server";

export const getOrganizationCapabilities = createServerFn({
	method: "GET",
}).handler(async () => {
	return getOrganizationCapabilitiesForCurrentOrganization();
});

export const setOrganizationModuleEntitlement = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			moduleKey: z.enum(["restaurants"]),
			status: z.enum(["granted", "blocked"]),
		}),
	)
	.handler(async ({ data }) => {
		return setModuleEntitlementForCurrentOrganization(data);
	});
