import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { searchCreditAccounts } from "@/features/credit/credit.functions";
import { createCustomer } from "@/features/customers/customers.functions";
import {
	closeShift,
	createPosSale,
	getPosBootstrap,
	getShiftCloseSummary,
	openShift,
	registerCashMovement,
	searchPosCustomers,
	searchPosProducts,
} from "../pos.functions";
import type { PosBootstrap } from "../types";

export function usePosBootstrap(initialData?: PosBootstrap) {
	return useQuery({
		queryKey: ["pos-bootstrap"],
		queryFn: () => getPosBootstrap(),
		initialData,
	});
}

export function usePosProducts(
	activeCategoryId: string,
	searchQuery: string,
) {
	return useQuery({
		queryKey: ["pos-products", activeCategoryId, searchQuery],
		queryFn: () =>
			searchPosProducts({
				data: {
					searchQuery: searchQuery || null,
					categoryId: activeCategoryId === "all" ? null : activeCategoryId,
					limit: 100,
					cursor: 0,
				},
			}),
	});
}

export function usePosCustomers() {
	return useQuery({
		queryKey: ["pos-customers"],
		queryFn: () =>
			searchPosCustomers({
				data: {
					limit: 100,
					cursor: 0,
				},
			}),
	});
}

export function useCreditAccounts() {
	return useQuery({
		queryKey: ["credit-accounts-pos"],
		queryFn: () =>
			searchCreditAccounts({
				data: {
					limit: 100,
					cursor: 0,
				},
			}),
	});
}

export function useShiftCloseSummary(
	shiftId: string | undefined,
	enabled: boolean,
) {
	return useQuery({
		queryKey: ["pos-shift-close-summary", shiftId],
		queryFn: () =>
			getShiftCloseSummary({
				data: { shiftId: shiftId ?? "" },
			}),
		enabled: enabled && Boolean(shiftId),
	});
}

export function useOpenShiftMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			startingCash: number;
			notes: string | null;
		}) =>
			openShift({
				data: payload,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] });
		},
	});
}

export function useRegisterCashMovementMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			shiftId: string;
			type: "expense" | "payout" | "inflow";
			amount: number;
			description: string;
		}) =>
			registerCashMovement({
				data: payload,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["pos-shift-close-summary"],
			});
		},
	});
}

export function useCloseShiftMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			shiftId: string;
			closures: Array<{ paymentMethod: string; actualAmount: number }>;
			notes: string | null;
		}) =>
			closeShift({
				data: payload,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["pos-bootstrap"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
			]);
		},
	});
}

export function useCreatePosSaleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			shiftId: string;
			customerId: string | null;
			discountAmount: number;
			items: Array<{
				productId: string;
				quantity: number;
				unitPrice: number;
				taxRate: number;
				discountAmount: number;
				modifiers: Array<{
					modifierProductId: string;
					quantity: number;
					unitPrice: number;
				}>;
			}>;
			payments: Array<{
				method: string;
				amount: number;
				reference: string | null;
			}>;
			isCreditSale: boolean;
		}) =>
			createPosSale({
				data: payload,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["pos-products"] }),
				queryClient.invalidateQueries({ queryKey: ["credit-accounts-pos"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
			]);
		},
	});
}

export function useCreateCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			name: string;
			phone: string | null;
			documentType: string | null;
			documentNumber: string | null;
		}) =>
			createCustomer({
				data: payload,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
		},
	});
}
