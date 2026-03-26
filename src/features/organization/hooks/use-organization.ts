import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createOrganizationJoinLink,
	getOrganizationManagementData,
	getOrganizationSelectionData,
	revokeOrganizationJoinLink,
} from "@/features/organization/organization.functions";

export const ORGANIZATION_SELECTION_QUERY_KEY = ["organization-selection"];
export const ORGANIZATION_MANAGEMENT_QUERY_KEY = ["organization-management"];

export type OrganizationSelectionData = Awaited<
	ReturnType<typeof getOrganizationSelectionData>
>;
export type OrganizationManagementData = Awaited<
	ReturnType<typeof getOrganizationManagementData>
>;

export function useOrganizationSelectionData(
	initialData?: OrganizationSelectionData,
) {
	return useQuery({
		queryKey: ORGANIZATION_SELECTION_QUERY_KEY,
		queryFn: () => getOrganizationSelectionData(),
		initialData,
	});
}

export function useOrganizationManagement(
	initialData?: OrganizationManagementData,
) {
	return useQuery({
		queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
		queryFn: () => getOrganizationManagementData(),
		initialData,
	});
}

export function useCreateOrganizationJoinLinkMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: { label?: string; expiresInDays: number }) =>
			createOrganizationJoinLink({
				data: payload,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useRevokeOrganizationJoinLinkMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: { joinLinkId: string }) =>
			revokeOrganizationJoinLink({
				data: payload,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}
