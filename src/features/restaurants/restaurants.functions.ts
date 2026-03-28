import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	addRestaurantOrderItemForCurrentOrganization,
	closeRestaurantOrderForCurrentOrganization,
	createRestaurantAreaForCurrentOrganization,
	createRestaurantTableForCurrentOrganization,
	deleteRestaurantAreaForCurrentOrganization,
	deleteRestaurantDraftItemForCurrentOrganization,
	deleteRestaurantTableForCurrentOrganization,
	getKitchenBoardForCurrentOrganization,
	getRestaurantBootstrapForCurrentOrganization,
	getRestaurantConfigurationForCurrentOrganization,
	getRestaurantTableDetailForCurrentOrganization,
	sendRestaurantOrderToKitchenForCurrentOrganization,
	updateRestaurantAreaForCurrentOrganization,
	updateRestaurantDraftItemForCurrentOrganization,
	updateRestaurantOrderItemStatusForCurrentOrganization,
	updateRestaurantOrderMetaForCurrentOrganization,
	updateRestaurantTableForCurrentOrganization,
} from "./restaurants.server";

const nullableString = z.string().trim().optional().nullable();

const restaurantTableDetailInputSchema = z.object({
	tableId: z.string().trim().min(1),
});

const addRestaurantOrderItemInputSchema = z.object({
	tableId: z.string().trim().min(1),
	productId: z.string().trim().min(1),
	quantity: z.coerce.number().int().positive(),
	notes: nullableString,
	modifierProductIds: z.array(z.string().trim().min(1)).optional(),
});

const updateRestaurantOrderMetaInputSchema = z
	.object({
		orderId: z.string().trim().min(1),
		guestCount: z.coerce.number().int().min(0).optional(),
		notes: nullableString,
	})
	.refine(
		(input) => input.guestCount !== undefined || input.notes !== undefined,
		{
			message: "Debes enviar al menos un cambio para la cuenta.",
		},
	);

const updateRestaurantDraftItemInputSchema = z.object({
	orderItemId: z.string().trim().min(1),
	quantity: z.coerce.number().int().positive(),
	notes: nullableString,
});

const deleteRestaurantDraftItemInputSchema = z.object({
	orderItemId: z.string().trim().min(1),
});

const sendRestaurantOrderToKitchenInputSchema = z.object({
	orderId: z.string().trim().min(1),
});

const updateRestaurantOrderItemStatusInputSchema = z.object({
	orderItemId: z.string().trim().min(1),
	status: z.enum(["ready", "served"]),
});

const closeRestaurantOrderInputSchema = z.object({
	orderId: z.string().trim().min(1),
	shiftId: z.string().trim().min(1),
	customerId: nullableString,
	payments: z
		.array(
			z.object({
				method: z.string().trim().min(1),
				amount: z.coerce.number().int().positive(),
				reference: nullableString,
			}),
		)
		.min(1),
});

const createRestaurantAreaInputSchema = z.object({
	name: z.string().trim().min(1).max(60),
});

const updateRestaurantAreaInputSchema = z
	.object({
		id: z.string().trim().min(1),
		name: z.string().trim().min(1).max(60).optional(),
	})
	.refine((input) => input.name !== undefined, {
		message: "Debes enviar al menos un cambio para la zona.",
	});

const deleteRestaurantAreaInputSchema = z.object({
	id: z.string().trim().min(1),
});

const createRestaurantTableInputSchema = z.object({
	areaId: z.string().trim().min(1),
	name: z.string().trim().min(1).max(40),
	seats: z.coerce.number().int().min(0).max(50).optional(),
});

const updateRestaurantTableInputSchema = z
	.object({
		id: z.string().trim().min(1),
		areaId: z.string().trim().min(1).optional(),
		name: z.string().trim().min(1).max(40).optional(),
		seats: z.coerce.number().int().min(0).max(50).optional(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(input) =>
			input.areaId !== undefined ||
			input.name !== undefined ||
			input.seats !== undefined ||
			input.isActive !== undefined,
		{
			message: "Debes enviar al menos un cambio para la mesa.",
		},
	);

const deleteRestaurantTableInputSchema = z.object({
	id: z.string().trim().min(1),
});

export const getRestaurantBootstrap = createServerFn({ method: "GET" }).handler(
	async () => {
		return getRestaurantBootstrapForCurrentOrganization();
	},
);

export const getRestaurantTableDetail = createServerFn({ method: "GET" })
	.inputValidator(restaurantTableDetailInputSchema)
	.handler(async ({ data }) => {
		return getRestaurantTableDetailForCurrentOrganization(data);
	});

export const addRestaurantOrderItem = createServerFn({ method: "POST" })
	.inputValidator(addRestaurantOrderItemInputSchema)
	.handler(async ({ data }) => {
		return addRestaurantOrderItemForCurrentOrganization(data);
	});

export const updateRestaurantOrderMeta = createServerFn({ method: "POST" })
	.inputValidator(updateRestaurantOrderMetaInputSchema)
	.handler(async ({ data }) => {
		return updateRestaurantOrderMetaForCurrentOrganization(data);
	});

export const updateRestaurantDraftItem = createServerFn({ method: "POST" })
	.inputValidator(updateRestaurantDraftItemInputSchema)
	.handler(async ({ data }) => {
		return updateRestaurantDraftItemForCurrentOrganization(data);
	});

export const deleteRestaurantDraftItem = createServerFn({ method: "POST" })
	.inputValidator(deleteRestaurantDraftItemInputSchema)
	.handler(async ({ data }) => {
		return deleteRestaurantDraftItemForCurrentOrganization(data.orderItemId);
	});

export const sendRestaurantOrderToKitchen = createServerFn({ method: "POST" })
	.inputValidator(sendRestaurantOrderToKitchenInputSchema)
	.handler(async ({ data }) => {
		return sendRestaurantOrderToKitchenForCurrentOrganization(data.orderId);
	});

export const updateRestaurantOrderItemStatus = createServerFn({
	method: "POST",
})
	.inputValidator(updateRestaurantOrderItemStatusInputSchema)
	.handler(async ({ data }) => {
		return updateRestaurantOrderItemStatusForCurrentOrganization(data);
	});

export const closeRestaurantOrder = createServerFn({ method: "POST" })
	.inputValidator(closeRestaurantOrderInputSchema)
	.handler(async ({ data }) => {
		return closeRestaurantOrderForCurrentOrganization(data);
	});

export const getRestaurantConfiguration = createServerFn({
	method: "GET",
}).handler(async () => {
	return getRestaurantConfigurationForCurrentOrganization();
});

export const createRestaurantArea = createServerFn({ method: "POST" })
	.inputValidator(createRestaurantAreaInputSchema)
	.handler(async ({ data }) => {
		return createRestaurantAreaForCurrentOrganization(data);
	});

export const updateRestaurantArea = createServerFn({ method: "POST" })
	.inputValidator(updateRestaurantAreaInputSchema)
	.handler(async ({ data }) => {
		return updateRestaurantAreaForCurrentOrganization(data);
	});

export const deleteRestaurantArea = createServerFn({ method: "POST" })
	.inputValidator(deleteRestaurantAreaInputSchema)
	.handler(async ({ data }) => {
		return deleteRestaurantAreaForCurrentOrganization(data.id);
	});

export const createRestaurantTable = createServerFn({ method: "POST" })
	.inputValidator(createRestaurantTableInputSchema)
	.handler(async ({ data }) => {
		return createRestaurantTableForCurrentOrganization(data);
	});

export const updateRestaurantTable = createServerFn({ method: "POST" })
	.inputValidator(updateRestaurantTableInputSchema)
	.handler(async ({ data }) => {
		return updateRestaurantTableForCurrentOrganization(data);
	});

export const deleteRestaurantTable = createServerFn({ method: "POST" })
	.inputValidator(deleteRestaurantTableInputSchema)
	.handler(async ({ data }) => {
		return deleteRestaurantTableForCurrentOrganization(data.id);
	});

export const getKitchenBoard = createServerFn({ method: "GET" }).handler(
	async () => {
		return getKitchenBoardForCurrentOrganization();
	},
);
