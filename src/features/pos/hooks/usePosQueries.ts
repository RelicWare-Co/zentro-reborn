import {
	keepPreviousData,
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	registerCreditPayment,
	searchCreditAccounts,
} from "@/features/credit/credit.functions";
import { createCustomer } from "@/features/customers/customers.functions";
import {
	cancelSale,
	closeShift,
	createPosSale,
	getPosBootstrap,
	getSaleById,
	getShiftCloseSummary,
	listSales,
	openShift,
	registerCashMovement,
	searchPosCustomers,
	searchPosProducts,
	toggleProductFavorite,
} from "../pos.functions";
import type { PosBootstrap, SaleDetail, SaleListResult } from "../types";

export function usePosBootstrap(initialData?: PosBootstrap) {
	return useQuery({
		queryKey: ["pos-bootstrap"],
		queryFn: () => getPosBootstrap(),
		initialData,
	});
}

export function usePosProducts(activeCategoryId: string, searchQuery: string) {
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

type SalesListParams = {
	limit?: number;
	cursor?: number;
	status?: string | null;
	searchQuery?: string | null;
	paymentMethod?: string | null;
	cashierId?: string | null;
	terminalName?: string | null;
	balanceStatus?: "with_balance" | "settled" | null;
	amountMin?: number | null;
	amountMax?: number | null;
	startDate?: string | null;
	endDate?: string | null;
};

const SALES_LIST_STALE_TIME_MS = 30_000;
const SALES_LIST_GC_TIME_MS = 5 * 60_000;

function getSalesListQueryKey(params: SalesListParams = {}) {
	return [
		"sales-list",
		params.limit ?? 10,
		params.cursor ?? 0,
		params.status ?? "all",
		params.searchQuery ?? "",
		params.paymentMethod ?? "all",
		params.cashierId ?? "all",
		params.terminalName ?? "all",
		params.balanceStatus ?? "all",
		params.amountMin ?? "none",
		params.amountMax ?? "none",
		params.startDate ?? "",
		params.endDate ?? "",
	] as const;
}

function getSalesListServerInput(params: SalesListParams = {}) {
	return {
		limit: params.limit,
		cursor: params.cursor,
		status: params.status ?? null,
		searchQuery: params.searchQuery ?? null,
		paymentMethod: params.paymentMethod ?? null,
		cashierId: params.cashierId ?? null,
		terminalName: params.terminalName ?? null,
		balanceStatus: params.balanceStatus ?? null,
		amountMin: params.amountMin ?? null,
		amountMax: params.amountMax ?? null,
		startDate: params.startDate ?? null,
		endDate: params.endDate ?? null,
	};
}

function getSalesListQueryOptions(
	params: SalesListParams = {},
	initialData?: SaleListResult,
) {
	return {
		queryKey: getSalesListQueryKey(params),
		queryFn: () =>
			listSales({
				data: getSalesListServerInput(params),
			}),
		staleTime: SALES_LIST_STALE_TIME_MS,
		gcTime: SALES_LIST_GC_TIME_MS,
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
		...(initialData
			? {
					initialData,
					initialDataUpdatedAt: Date.now(),
				}
			: {}),
	};
}

export function useSalesList(
	params: SalesListParams = {},
	initialData?: SaleListResult,
) {
	return useQuery(getSalesListQueryOptions(params, initialData));
}

export function prefetchSalesList(
	queryClient: QueryClient,
	params: SalesListParams = {},
) {
	return queryClient.prefetchQuery(getSalesListQueryOptions(params));
}

export function useSaleDetail(
	saleId: string | null,
	initialData?: SaleDetail | null,
) {
	return useQuery({
		queryKey: ["sales-detail", saleId],
		queryFn: () =>
			getSaleById({
				data: {
					saleId: saleId ?? "",
				},
			}),
		enabled: Boolean(saleId),
		initialData,
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
		mutationFn: (payload: { startingCash: number; notes: string | null }) =>
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
			paymentMethod: string;
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
				queryClient.invalidateQueries({ queryKey: ["sales-list"] }),
				queryClient.invalidateQueries({ queryKey: ["sales-detail"] }),
			]);
		},
	});
}

export function useRegisterCreditPaymentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			shiftId: string;
			creditAccountId: string;
			saleId?: string | null;
			amount: number;
			method: string;
			reference: string | null;
			notes: string | null;
		}) =>
			registerCreditPayment({
				data: payload,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["credit-accounts-pos"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
				queryClient.invalidateQueries({ queryKey: ["sales-list"] }),
				queryClient.invalidateQueries({ queryKey: ["sales-detail"] }),
			]);
		},
	});
}

export function useCancelPosSaleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: { saleId: string }) =>
			cancelSale({
				data: payload,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["credit-accounts-pos"] }),
				queryClient.invalidateQueries({ queryKey: ["pos-products"] }),
				queryClient.invalidateQueries({
					queryKey: ["pos-shift-close-summary"],
				}),
				queryClient.invalidateQueries({ queryKey: ["sales-list"] }),
				queryClient.invalidateQueries({ queryKey: ["sales-detail"] }),
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

export function useToggleProductFavoriteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (productId: string) =>
			toggleProductFavorite({
				data: { productId },
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["pos-products"] });
		},
	});
}
