import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	addRestaurantOrderItem,
	closeRestaurantOrder,
	createRestaurantArea,
	createRestaurantTable,
	deleteRestaurantArea,
	deleteRestaurantDraftItem,
	deleteRestaurantTable,
	getKitchenBoard,
	getRestaurantBootstrap,
	getRestaurantConfiguration,
	getRestaurantTableDetail,
	sendRestaurantOrderToKitchen,
	updateRestaurantArea,
	updateRestaurantDraftItem,
	updateRestaurantOrderItemStatus,
	updateRestaurantOrderMeta,
	updateRestaurantTable,
} from "@/features/restaurants/restaurants.functions";
import { SETTINGS_QUERY_KEY } from "@/features/settings/hooks/use-settings";

export const RESTAURANT_BOOTSTRAP_QUERY_KEY = ["restaurant-bootstrap"];
export const RESTAURANT_CONFIGURATION_QUERY_KEY = ["restaurant-configuration"];
export const RESTAURANT_KITCHEN_QUERY_KEY = ["restaurant-kitchen"];

function getRestaurantTableDetailQueryKey(tableId: string | null) {
	return ["restaurant-table-detail", tableId];
}

export type RestaurantBootstrap = Awaited<
	ReturnType<typeof getRestaurantBootstrap>
>;
export type RestaurantTableDetail = Awaited<
	ReturnType<typeof getRestaurantTableDetail>
>;
export type RestaurantConfiguration = Awaited<
	ReturnType<typeof getRestaurantConfiguration>
>;
export type KitchenBoard = Awaited<ReturnType<typeof getKitchenBoard>>;

async function invalidateRestaurantQueries(queryClient: QueryClient) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: RESTAURANT_BOOTSTRAP_QUERY_KEY }),
		queryClient.invalidateQueries({
			queryKey: RESTAURANT_CONFIGURATION_QUERY_KEY,
		}),
		queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
		queryClient.invalidateQueries({ queryKey: RESTAURANT_KITCHEN_QUERY_KEY }),
		queryClient.invalidateQueries({
			queryKey: ["restaurant-table-detail"],
		}),
	]);
}

export function useRestaurantBootstrap(initialData?: RestaurantBootstrap) {
	return useQuery({
		queryKey: RESTAURANT_BOOTSTRAP_QUERY_KEY,
		queryFn: () => getRestaurantBootstrap(),
		initialData,
	});
}

export function useRestaurantTableDetail(
	tableId: string | null,
	initialData?: RestaurantTableDetail | null,
) {
	return useQuery({
		queryKey: getRestaurantTableDetailQueryKey(tableId),
		queryFn: () =>
			getRestaurantTableDetail({
				data: {
					tableId: tableId ?? "",
				},
			}),
		enabled: Boolean(tableId),
		initialData,
	});
}

export function useRestaurantConfiguration(
	initialData?: RestaurantConfiguration,
) {
	return useQuery({
		queryKey: RESTAURANT_CONFIGURATION_QUERY_KEY,
		queryFn: () => getRestaurantConfiguration(),
		initialData,
	});
}

export function useKitchenBoard(initialData?: KitchenBoard) {
	return useQuery({
		queryKey: RESTAURANT_KITCHEN_QUERY_KEY,
		queryFn: () => getKitchenBoard(),
		initialData,
	});
}

export function useAddRestaurantOrderItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof addRestaurantOrderItem>[0]["data"],
		) => addRestaurantOrderItem({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useUpdateRestaurantOrderMetaMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof updateRestaurantOrderMeta>[0]["data"],
		) => updateRestaurantOrderMeta({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useUpdateRestaurantDraftItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof updateRestaurantDraftItem>[0]["data"],
		) => updateRestaurantDraftItem({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useDeleteRestaurantDraftItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof deleteRestaurantDraftItem>[0]["data"],
		) => deleteRestaurantDraftItem({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useSendRestaurantOrderToKitchenMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof sendRestaurantOrderToKitchen>[0]["data"],
		) => sendRestaurantOrderToKitchen({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useUpdateRestaurantOrderItemStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof updateRestaurantOrderItemStatus>[0]["data"],
		) => updateRestaurantOrderItemStatus({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useCloseRestaurantOrderMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: Parameters<typeof closeRestaurantOrder>[0]["data"]) =>
			closeRestaurantOrder({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useCreateRestaurantAreaMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: Parameters<typeof createRestaurantArea>[0]["data"]) =>
			createRestaurantArea({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useUpdateRestaurantAreaMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: Parameters<typeof updateRestaurantArea>[0]["data"]) =>
			updateRestaurantArea({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useDeleteRestaurantAreaMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: Parameters<typeof deleteRestaurantArea>[0]["data"]) =>
			deleteRestaurantArea({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useCreateRestaurantTableMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof createRestaurantTable>[0]["data"],
		) => createRestaurantTable({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useUpdateRestaurantTableMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof updateRestaurantTable>[0]["data"],
		) => updateRestaurantTable({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}

export function useDeleteRestaurantTableMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			payload: Parameters<typeof deleteRestaurantTable>[0]["data"],
		) => deleteRestaurantTable({ data: payload }),
		onSuccess: async () => {
			await invalidateRestaurantQueries(queryClient);
		},
	});
}
