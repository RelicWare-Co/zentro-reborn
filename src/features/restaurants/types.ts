import type {
	getKitchenBoard,
	getRestaurantBootstrap,
	getRestaurantConfiguration,
	getRestaurantTableDetail,
} from "./restaurants.functions";

export type RestaurantBootstrap = Awaited<
	ReturnType<typeof getRestaurantBootstrap>
>;
export type RestaurantArea = RestaurantBootstrap["areas"][number];
export type RestaurantTableSummary = RestaurantArea["tables"][number];
export type RestaurantTableDetail = Awaited<
	ReturnType<typeof getRestaurantTableDetail>
>;
export type RestaurantConfiguration = Awaited<
	ReturnType<typeof getRestaurantConfiguration>
>;
export type KitchenBoard = Awaited<ReturnType<typeof getKitchenBoard>>;
