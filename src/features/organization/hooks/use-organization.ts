import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import {
	createOrganizationJoinLink,
	getOrganizationManagementData,
	getOrganizationSelectionData,
	revokeOrganizationJoinLink,
} from "@/features/organization/organization.functions";

export const ORGANIZATION_SELECTION_QUERY_KEY = ["organization-selection"];
export const ORGANIZATION_MANAGEMENT_QUERY_KEY = ["organization-management"];
export const ORGANIZATION_MEMBERS_QUERY_KEY = ["organization-members"];
export const ORGANIZATION_INVITATIONS_QUERY_KEY = ["organization-invitations"];

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

export function useInviteMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { email: string; role: string }) => {
			const result = await authClient.organization.inviteMember({
				email: payload.email,
				role: payload.role,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo enviar la invitación.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { memberIdOrEmail: string }) => {
			const result = await authClient.organization.removeMember({
				memberIdOrEmail: payload.memberIdOrEmail,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo eliminar al miembro.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useUpdateMemberRoleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { memberId: string; role: string }) => {
			const result = await authClient.organization.updateMemberRole({
				memberId: payload.memberId,
				role: payload.role,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo actualizar el rol.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useCancelInvitationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { invitationId: string }) => {
			const result = await authClient.organization.cancelInvitation({
				invitationId: payload.invitationId,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo cancelar la invitación.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useUpdateOrganizationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: {
			organizationId: string;
			data: { name?: string; slug?: string; logo?: string };
		}) => {
			const result = await authClient.organization.update({
				organizationId: payload.organizationId,
				data: payload.data,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo actualizar la organización.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
			await queryClient.invalidateQueries({
				queryKey: ["active-organization"],
			});
		},
	});
}

export function useDeleteOrganizationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { organizationId: string }) => {
			const result = await authClient.organization.delete({
				organizationId: payload.organizationId,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo eliminar la organización.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}

export function useLeaveOrganizationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: { organizationId: string }) => {
			const result = await authClient.organization.leave({
				organizationId: payload.organizationId,
			});
			if (result.error) {
				throw new Error(result.error.message || "No se pudo salir de la organización.");
			}
			return result.data;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ORGANIZATION_MANAGEMENT_QUERY_KEY,
			});
		},
	});
}
