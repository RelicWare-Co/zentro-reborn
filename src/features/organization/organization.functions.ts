import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createOrganizationJoinLinkForCurrentOrganization,
	getOrganizationJoinLinkPreviewByToken,
	getOrganizationManagementDataForCurrentOrganization,
	getOrganizationSelectionDataForCurrentUser,
	redeemOrganizationJoinLinkByToken,
	revokeOrganizationJoinLinkForCurrentOrganization,
} from "./organization.server";

const joinTokenSchema = z.object({
	token: z.string().trim().min(1).max(255),
});

const createJoinLinkSchema = z.object({
	label: z.string().trim().max(80).optional(),
	expiresInDays: z.coerce.number().int().min(1).max(90),
});

const revokeJoinLinkSchema = z.object({
	joinLinkId: z.string().trim().min(1),
});

export const getOrganizationSelectionData = createServerFn({
	method: "GET",
}).handler(async () => {
	return getOrganizationSelectionDataForCurrentUser();
});

export const getOrganizationManagementData = createServerFn({
	method: "GET",
}).handler(async () => {
	return getOrganizationManagementDataForCurrentOrganization();
});

export const createOrganizationJoinLink = createServerFn({ method: "POST" })
	.inputValidator(createJoinLinkSchema)
	.handler(async ({ data }) => {
		return createOrganizationJoinLinkForCurrentOrganization(data);
	});

export const revokeOrganizationJoinLink = createServerFn({ method: "POST" })
	.inputValidator(revokeJoinLinkSchema)
	.handler(async ({ data }) => {
		return revokeOrganizationJoinLinkForCurrentOrganization(data);
	});

export const getOrganizationJoinLinkPreview = createServerFn({ method: "GET" })
	.inputValidator(joinTokenSchema)
	.handler(async ({ data }) => {
		return getOrganizationJoinLinkPreviewByToken(data);
	});

export const redeemOrganizationJoinLink = createServerFn({ method: "POST" })
	.inputValidator(joinTokenSchema)
	.handler(async ({ data }) => {
		return redeemOrganizationJoinLinkByToken(data);
	});
