import "@tanstack/react-start/server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "#/db";
import {
	organization,
	product,
	restaurantArea,
	restaurantKitchenTicket,
	restaurantOrder,
	restaurantOrderItem,
	restaurantOrderItemModifier,
	restaurantTable,
} from "#/db/schema";
import {
	getCurrentOrganizationAccess,
	requireOrganizationManagerAccess,
} from "#/features/organization/access-control.server";
import { requireModuleAccessForCurrentOrganization } from "#/features/modules/module-access.server";
import { createPosSaleForCurrentOrganization } from "#/features/pos/server/sales";
import { getPosBootstrapForCurrentOrganization } from "#/features/pos/server/shifts";
import {
	normalizeOptionalString,
	normalizeRequiredString,
	toNonNegativeInteger,
	toPositiveInteger,
	toTimestamp,
} from "#/features/pos/server/utils";
import { parseOrganizationSettingsMetadata } from "#/features/settings/settings.shared";

type RestaurantDatabase = typeof db;

type RestaurantOrderItemDetail = Awaited<
	ReturnType<typeof getOrderItemsWithModifiers>
>[number];

function calculateModifierTotal(
	baseQuantity: number,
	modifiers: Array<{ quantity: number; unitPrice: number }>,
) {
	let total = 0;
	for (const modifier of modifiers) {
		total += baseQuantity * modifier.quantity * modifier.unitPrice;
	}
	return total;
}

function buildOrderSummary(items: RestaurantOrderItemDetail[]) {
	let itemCount = 0;
	let totalAmount = 0;
	let draftItemsCount = 0;
	let readyItemsCount = 0;
	let servedItemsCount = 0;

	for (const item of items) {
		if (item.status === "cancelled") {
			continue;
		}

		itemCount += item.quantity;
		totalAmount += item.totalAmount;
		if (item.status === "draft") draftItemsCount += item.quantity;
		if (item.status === "ready") readyItemsCount += item.quantity;
		if (item.status === "served") servedItemsCount += item.quantity;
	}

	return {
		itemCount,
		totalAmount,
		draftItemsCount,
		readyItemsCount,
		servedItemsCount,
	};
}

async function getOrganizationSettings(organizationId: string) {
	const [organizationRow] = await db
		.select({
			metadata: organization.metadata,
		})
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);

	return parseOrganizationSettingsMetadata(organizationRow?.metadata);
}

async function getLayoutRows(organizationId: string) {
	const [areas, tables] = await Promise.all([
		db
			.select({
				id: restaurantArea.id,
				name: restaurantArea.name,
				sortOrder: restaurantArea.sortOrder,
			})
			.from(restaurantArea)
			.where(eq(restaurantArea.organizationId, organizationId))
			.orderBy(asc(restaurantArea.sortOrder), asc(restaurantArea.name)),
		db
			.select({
				id: restaurantTable.id,
				areaId: restaurantTable.areaId,
				name: restaurantTable.name,
				seats: restaurantTable.seats,
				sortOrder: restaurantTable.sortOrder,
				isActive: restaurantTable.isActive,
			})
			.from(restaurantTable)
			.where(eq(restaurantTable.organizationId, organizationId))
			.orderBy(asc(restaurantTable.sortOrder), asc(restaurantTable.name)),
	]);

	return { areas, tables };
}

function groupAreasWithTables(
	areas: Array<{ id: string; name: string; sortOrder: number }>,
	tables: Array<{
		id: string;
		areaId: string;
		name: string;
		seats: number;
		sortOrder: number;
		isActive: boolean;
		openOrder:
			| {
					id: string;
					orderNumber: number;
					itemCount: number;
					totalAmount: number;
					draftItemsCount: number;
					readyItemsCount: number;
					servedItemsCount: number;
				}
			| null;
	}>,
) {
	const tablesByAreaId = new Map<string, typeof tables>();
	for (const table of tables) {
		const collection = tablesByAreaId.get(table.areaId) ?? [];
		collection.push(table);
		tablesByAreaId.set(table.areaId, collection);
	}

	return areas.map((area) => ({
		...area,
		tables:
			tablesByAreaId
				.get(area.id)
				?.toSorted(
					(left, right) =>
						left.sortOrder - right.sortOrder ||
						left.name.localeCompare(right.name, "es-CO"),
				) ?? [],
	}));
}

async function assertAreaFromOrganization(
	database: RestaurantDatabase,
	organizationId: string,
	areaId: string,
) {
	const [row] = await database
		.select({
			id: restaurantArea.id,
			name: restaurantArea.name,
		})
		.from(restaurantArea)
		.where(
			and(
				eq(restaurantArea.organizationId, organizationId),
				eq(restaurantArea.id, areaId),
			),
		)
		.limit(1);

	if (!row) {
		throw new Error("La zona no existe en la organización activa.");
	}

	return row;
}

async function assertTableFromOrganization(
	database: RestaurantDatabase,
	organizationId: string,
	tableId: string,
) {
	const [row] = await database
		.select({
			id: restaurantTable.id,
			areaId: restaurantTable.areaId,
			name: restaurantTable.name,
			seats: restaurantTable.seats,
			isActive: restaurantTable.isActive,
			areaName: restaurantArea.name,
		})
		.from(restaurantTable)
		.innerJoin(restaurantArea, eq(restaurantTable.areaId, restaurantArea.id))
		.where(
			and(
				eq(restaurantTable.organizationId, organizationId),
				eq(restaurantTable.id, tableId),
			),
		)
		.limit(1);

	if (!row) {
		throw new Error("La mesa no existe en la organización activa.");
	}

	return row;
}

async function getOpenOrderForTable(
	database: RestaurantDatabase,
	organizationId: string,
	tableId: string,
) {
	const [row] = await database
		.select({
			id: restaurantOrder.id,
			tableId: restaurantOrder.tableId,
			orderNumber: restaurantOrder.orderNumber,
			status: restaurantOrder.status,
			guestCount: restaurantOrder.guestCount,
			notes: restaurantOrder.notes,
			createdAt: restaurantOrder.createdAt,
			updatedAt: restaurantOrder.updatedAt,
		})
		.from(restaurantOrder)
		.where(
			and(
				eq(restaurantOrder.organizationId, organizationId),
				eq(restaurantOrder.tableId, tableId),
				eq(restaurantOrder.status, "open"),
			),
		)
		.orderBy(desc(restaurantOrder.createdAt))
		.limit(1);

	return row ?? null;
}

async function getOpenOrderById(
	database: RestaurantDatabase,
	organizationId: string,
	orderId: string,
) {
	const [row] = await database
		.select({
			id: restaurantOrder.id,
			tableId: restaurantOrder.tableId,
			orderNumber: restaurantOrder.orderNumber,
			status: restaurantOrder.status,
			guestCount: restaurantOrder.guestCount,
			notes: restaurantOrder.notes,
			createdAt: restaurantOrder.createdAt,
			updatedAt: restaurantOrder.updatedAt,
		})
		.from(restaurantOrder)
		.where(
			and(
				eq(restaurantOrder.organizationId, organizationId),
				eq(restaurantOrder.id, orderId),
				eq(restaurantOrder.status, "open"),
			),
		)
		.limit(1);

	if (!row) {
		throw new Error("La cuenta no existe o ya no está abierta.");
	}

	return row;
}

async function getNextOrderNumber(
	database: RestaurantDatabase,
	organizationId: string,
) {
	const [row] = await database
		.select({
			orderNumber: restaurantOrder.orderNumber,
		})
		.from(restaurantOrder)
		.where(eq(restaurantOrder.organizationId, organizationId))
		.orderBy(desc(restaurantOrder.orderNumber))
		.limit(1);

	return (row?.orderNumber ?? 0) + 1;
}

async function getNextAreaSortOrder(
	database: RestaurantDatabase,
	organizationId: string,
) {
	const [row] = await database
		.select({
			sortOrder: restaurantArea.sortOrder,
		})
		.from(restaurantArea)
		.where(eq(restaurantArea.organizationId, organizationId))
		.orderBy(desc(restaurantArea.sortOrder))
		.limit(1);

	return (row?.sortOrder ?? -1) + 1;
}

async function getNextTableSortOrder(
	database: RestaurantDatabase,
	organizationId: string,
	areaId: string,
) {
	const [row] = await database
		.select({
			sortOrder: restaurantTable.sortOrder,
		})
		.from(restaurantTable)
		.where(
			and(
				eq(restaurantTable.organizationId, organizationId),
				eq(restaurantTable.areaId, areaId),
			),
		)
		.orderBy(desc(restaurantTable.sortOrder))
		.limit(1);

	return (row?.sortOrder ?? -1) + 1;
}

async function getOrCreateOpenOrderForTable(input: {
	database: RestaurantDatabase;
	organizationId: string;
	tableId: string;
	userId: string;
}) {
	const existingOrder = await getOpenOrderForTable(
		input.database,
		input.organizationId,
		input.tableId,
	);
	if (existingOrder) {
		return existingOrder;
	}

	const now = new Date();
	const orderId = crypto.randomUUID();
	const orderNumber = await getNextOrderNumber(
		input.database,
		input.organizationId,
	);

	await input.database.insert(restaurantOrder).values({
		id: orderId,
		organizationId: input.organizationId,
		tableId: input.tableId,
		openedByUserId: input.userId,
		closedByUserId: null,
		saleId: null,
		orderNumber,
		status: "open",
		guestCount: 0,
		notes: null,
		createdAt: now,
		updatedAt: now,
		closedAt: null,
	});

	return {
		id: orderId,
		tableId: input.tableId,
		orderNumber,
		status: "open",
		guestCount: 0,
		notes: null,
		createdAt: now,
		updatedAt: now,
	};
}

async function getProductSnapshot(
	database: RestaurantDatabase,
	organizationId: string,
	productIds: string[],
) {
	if (productIds.length === 0) {
		return new Map<
			string,
			{
				id: string;
				name: string;
				price: number;
				taxRate: number;
				isModifier: boolean;
			}
		>();
	}

	const rows = await database
		.select({
			id: product.id,
			name: product.name,
			price: product.price,
			taxRate: product.taxRate,
			isModifier: product.isModifier,
		})
		.from(product)
		.where(
			and(
				eq(product.organizationId, organizationId),
				isNull(product.deletedAt),
				inArray(product.id, productIds),
			),
		);

	return new Map(rows.map((row) => [row.id, row]));
}

async function getOrderItemsWithModifiers(
	database: RestaurantDatabase,
	organizationId: string,
	orderId: string,
) {
	const itemRows = await database
		.select({
			id: restaurantOrderItem.id,
			orderId: restaurantOrderItem.orderId,
			productId: restaurantOrderItem.productId,
			kitchenTicketId: restaurantOrderItem.kitchenTicketId,
			quantity: restaurantOrderItem.quantity,
			unitPrice: restaurantOrderItem.unitPrice,
			taxRate: restaurantOrderItem.taxRate,
			discountAmount: restaurantOrderItem.discountAmount,
			notes: restaurantOrderItem.notes,
			status: restaurantOrderItem.status,
			createdAt: restaurantOrderItem.createdAt,
			updatedAt: restaurantOrderItem.updatedAt,
			sentAt: restaurantOrderItem.sentAt,
			readyAt: restaurantOrderItem.readyAt,
			servedAt: restaurantOrderItem.servedAt,
			cancelledAt: restaurantOrderItem.cancelledAt,
			productName: product.name,
		})
		.from(restaurantOrderItem)
		.innerJoin(product, eq(restaurantOrderItem.productId, product.id))
		.where(
			and(
				eq(restaurantOrderItem.organizationId, organizationId),
				eq(restaurantOrderItem.orderId, orderId),
			),
		)
		.orderBy(asc(restaurantOrderItem.createdAt), asc(restaurantOrderItem.id));

	const itemIds = itemRows.map((item) => item.id);
	const modifierRows =
		itemIds.length > 0
			? await database
					.select({
						id: restaurantOrderItemModifier.id,
						orderItemId: restaurantOrderItemModifier.orderItemId,
						modifierProductId: restaurantOrderItemModifier.modifierProductId,
						quantity: restaurantOrderItemModifier.quantity,
						unitPrice: restaurantOrderItemModifier.unitPrice,
						name: product.name,
					})
					.from(restaurantOrderItemModifier)
					.innerJoin(
						product,
						eq(restaurantOrderItemModifier.modifierProductId, product.id),
					)
					.where(
						and(
							eq(restaurantOrderItemModifier.organizationId, organizationId),
							inArray(restaurantOrderItemModifier.orderItemId, itemIds),
						),
					)
					.orderBy(
						asc(restaurantOrderItemModifier.orderItemId),
						asc(restaurantOrderItemModifier.id),
					)
			: [];
	const modifiersByItemId = new Map<
		string,
		Array<{
			id: string;
			modifierProductId: string;
			quantity: number;
			unitPrice: number;
			name: string;
		}>
	>();

	for (const modifierRow of modifierRows) {
		const collection = modifiersByItemId.get(modifierRow.orderItemId) ?? [];
		collection.push({
			id: modifierRow.id,
			modifierProductId: modifierRow.modifierProductId,
			quantity: modifierRow.quantity,
			unitPrice: modifierRow.unitPrice,
			name: modifierRow.name,
		});
		modifiersByItemId.set(modifierRow.orderItemId, collection);
	}

	return itemRows.map((itemRow) => {
		const modifiers = modifiersByItemId.get(itemRow.id) ?? [];
		const modifiersTotal = calculateModifierTotal(itemRow.quantity, modifiers);
		const baseSubtotal = itemRow.quantity * itemRow.unitPrice;
		return {
			id: itemRow.id,
			orderId: itemRow.orderId,
			productId: itemRow.productId,
			productName: itemRow.productName,
			kitchenTicketId: itemRow.kitchenTicketId,
			quantity: itemRow.quantity,
			unitPrice: itemRow.unitPrice,
			taxRate: itemRow.taxRate,
			discountAmount: itemRow.discountAmount,
			notes: itemRow.notes,
			status: itemRow.status,
			modifiers,
			baseSubtotal,
			modifiersTotal,
			totalAmount: baseSubtotal + modifiersTotal - itemRow.discountAmount,
			createdAt: toTimestamp(itemRow.createdAt),
			updatedAt: toTimestamp(itemRow.updatedAt),
			sentAt: toTimestamp(itemRow.sentAt),
			readyAt: toTimestamp(itemRow.readyAt),
			servedAt: toTimestamp(itemRow.servedAt),
			cancelledAt: toTimestamp(itemRow.cancelledAt),
		};
	});
}

async function getKitchenTicketsForOrder(
	database: RestaurantDatabase,
	organizationId: string,
	orderId: string,
) {
	const rows = await database
		.select({
			id: restaurantKitchenTicket.id,
			sequenceNumber: restaurantKitchenTicket.sequenceNumber,
			status: restaurantKitchenTicket.status,
			createdAt: restaurantKitchenTicket.createdAt,
			printedAt: restaurantKitchenTicket.printedAt,
		})
		.from(restaurantKitchenTicket)
		.where(
			and(
				eq(restaurantKitchenTicket.organizationId, organizationId),
				eq(restaurantKitchenTicket.orderId, orderId),
			),
		)
		.orderBy(desc(restaurantKitchenTicket.sequenceNumber));

	return rows.map((row) => ({
		...row,
		createdAt: toTimestamp(row.createdAt),
		printedAt: toTimestamp(row.printedAt),
	}));
}

async function refreshKitchenTicketStatus(
	database: RestaurantDatabase,
	organizationId: string,
	ticketId: string,
) {
	const ticketItems = await database
		.select({
			status: restaurantOrderItem.status,
		})
		.from(restaurantOrderItem)
		.where(
			and(
				eq(restaurantOrderItem.organizationId, organizationId),
				eq(restaurantOrderItem.kitchenTicketId, ticketId),
			),
		);

	if (ticketItems.length === 0) {
		return;
	}

	const activeStatuses = ticketItems
		.map((item) => item.status)
		.filter((status) => status !== "cancelled");
	const nextStatus = activeStatuses.every((status) => status === "served")
		? "served"
		: activeStatuses.every(
				(status) => status === "ready" || status === "served",
			)
			? "ready"
			: "sent";

	await database
		.update(restaurantKitchenTicket)
		.set({
			status: nextStatus,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(restaurantKitchenTicket.organizationId, organizationId),
				eq(restaurantKitchenTicket.id, ticketId),
			),
		);
}

export async function getRestaurantConfigurationForCurrentOrganization() {
	const access = await getCurrentOrganizationAccess();
	return listRestaurantLayoutForOrganization(access.organizationId);
}

export async function listRestaurantLayoutForOrganization(organizationId: string) {
	const { areas, tables } = await getLayoutRows(organizationId);
	return groupAreasWithTables(
		areas,
		tables.map((table) => ({
			...table,
			openOrder: null,
		})),
	);
}

export async function getRestaurantBootstrapForCurrentOrganization() {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const [posBootstrap, settings, layoutRows, openOrderRows] = await Promise.all([
		getPosBootstrapForCurrentOrganization(),
		getOrganizationSettings(access.organizationId),
		getLayoutRows(access.organizationId),
		db
			.select({
				id: restaurantOrder.id,
				tableId: restaurantOrder.tableId,
				orderNumber: restaurantOrder.orderNumber,
			})
			.from(restaurantOrder)
			.where(
				and(
					eq(restaurantOrder.organizationId, access.organizationId),
					eq(restaurantOrder.status, "open"),
				),
			),
	]);
	const itemGroups = await Promise.all(
		openOrderRows.map((orderRow) =>
			getOrderItemsWithModifiers(db, access.organizationId, orderRow.id).then(
				(items) => [orderRow.id, items] as const,
			),
		),
	);
	const summaryByOrderId = new Map<
		string,
		ReturnType<typeof buildOrderSummary>
	>();

	for (const [orderId, items] of itemGroups) {
		summaryByOrderId.set(orderId, buildOrderSummary(items));
	}

	const openOrderByTableId = new Map<
		string,
		{
			id: string;
			orderNumber: number;
			itemCount: number;
			totalAmount: number;
			draftItemsCount: number;
			readyItemsCount: number;
			servedItemsCount: number;
		}
	>();

	for (const orderRow of openOrderRows) {
		const summary = summaryByOrderId.get(orderRow.id);
		if (!summary) {
			continue;
		}

		openOrderByTableId.set(orderRow.tableId, {
			id: orderRow.id,
			orderNumber: orderRow.orderNumber,
			...summary,
		});
	}

	return {
		activeShift: posBootstrap.activeShift,
		categories: posBootstrap.categories,
		settings: {
			paymentMethods: posBootstrap.settings.paymentMethods,
			defaultTerminalName: posBootstrap.settings.defaultTerminalName,
			restaurant: settings.restaurants,
		},
		areas: groupAreasWithTables(
			layoutRows.areas,
			layoutRows.tables.map((table) => ({
				...table,
				openOrder: openOrderByTableId.get(table.id) ?? null,
			})),
		),
	};
}

export async function getRestaurantTableDetailForCurrentOrganization(input: {
	tableId: string;
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const table = await assertTableFromOrganization(
		db,
		access.organizationId,
		input.tableId,
	);
	const openOrder = await getOpenOrderForTable(
		db,
		access.organizationId,
		input.tableId,
	);

	if (!openOrder) {
		return {
			table: {
				...table,
			},
			openOrder: null,
		};
	}

	const [items, tickets] = await Promise.all([
		getOrderItemsWithModifiers(db, access.organizationId, openOrder.id),
		getKitchenTicketsForOrder(db, access.organizationId, openOrder.id),
	]);

	return {
		table: {
			...table,
		},
		openOrder: {
			id: openOrder.id,
			orderNumber: openOrder.orderNumber,
			guestCount: openOrder.guestCount,
			notes: openOrder.notes,
			createdAt: toTimestamp(openOrder.createdAt),
			updatedAt: toTimestamp(openOrder.updatedAt),
			items,
			tickets,
			totals: buildOrderSummary(items),
		},
	};
}

export async function addRestaurantOrderItemForCurrentOrganization(input: {
	tableId: string;
	productId: string;
	quantity: number;
	notes?: string | null;
	modifierProductIds?: string[];
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const tableId = normalizeRequiredString(input.tableId, "tableId");
	const productId = normalizeRequiredString(input.productId, "productId");
	const quantity = toPositiveInteger(input.quantity, "quantity");
	const notes = normalizeOptionalString(input.notes);
	const modifierProductIds = [...new Set(input.modifierProductIds ?? [])].filter(
		Boolean,
	);

	return db.transaction(async (tx) => {
		const database = tx as typeof db;
		const table = await assertTableFromOrganization(
			database,
			access.organizationId,
			tableId,
		);
		if (!table.isActive) {
			throw new Error("No puedes registrar órdenes en una mesa inactiva.");
		}

		const productSnapshot = await getProductSnapshot(
			database,
			access.organizationId,
			[productId, ...modifierProductIds],
		);
		const baseProduct = productSnapshot.get(productId);
		if (!baseProduct || baseProduct.isModifier) {
			throw new Error("El producto seleccionado no es válido para el menú.");
		}

		for (const modifierProductId of modifierProductIds) {
			const modifierProduct = productSnapshot.get(modifierProductId);
			if (!modifierProduct || !modifierProduct.isModifier) {
				throw new Error("Uno de los modificadores no es válido.");
			}
		}

		const order = await getOrCreateOpenOrderForTable({
			database,
			organizationId: access.organizationId,
			tableId,
			userId: access.userId,
		});
		const now = new Date();
		const itemId = crypto.randomUUID();

		await database.insert(restaurantOrderItem).values({
			id: itemId,
			organizationId: access.organizationId,
			orderId: order.id,
			kitchenTicketId: null,
			productId,
			quantity,
			unitPrice: baseProduct.price,
			taxRate: baseProduct.taxRate,
			discountAmount: 0,
			notes,
			status: "draft",
			createdAt: now,
			updatedAt: now,
			sentAt: null,
			readyAt: null,
			servedAt: null,
			cancelledAt: null,
		});

		if (modifierProductIds.length > 0) {
			await database.insert(restaurantOrderItemModifier).values(
				modifierProductIds.map((modifierProductId) => ({
					id: crypto.randomUUID(),
					organizationId: access.organizationId,
					orderItemId: itemId,
					modifierProductId,
					quantity: 1,
					unitPrice: productSnapshot.get(modifierProductId)?.price ?? 0,
					createdAt: now,
				})),
			);
		}

		await database
			.update(restaurantOrder)
			.set({
				updatedAt: now,
			})
			.where(eq(restaurantOrder.id, order.id));

		return {
			orderId: order.id,
			itemId,
			tableId,
		};
	});
}

export async function updateRestaurantOrderMetaForCurrentOrganization(input: {
	orderId: string;
	guestCount?: number;
	notes?: string | null;
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const order = await getOpenOrderById(db, access.organizationId, input.orderId);

	const updates: Partial<typeof restaurantOrder.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (input.guestCount !== undefined) {
		updates.guestCount = toNonNegativeInteger(input.guestCount, "guestCount");
	}
	if (input.notes !== undefined) {
		updates.notes = normalizeOptionalString(input.notes);
	}

	await db
		.update(restaurantOrder)
		.set(updates)
		.where(eq(restaurantOrder.id, order.id));

	return { success: true };
}

export async function updateRestaurantDraftItemForCurrentOrganization(input: {
	orderItemId: string;
	quantity: number;
	notes?: string | null;
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const quantity = toPositiveInteger(input.quantity, "quantity");
	const notes = input.notes === undefined ? undefined : normalizeOptionalString(input.notes);

	const [itemRow] = await db
		.select({
			id: restaurantOrderItem.id,
			status: restaurantOrderItem.status,
			orderId: restaurantOrderItem.orderId,
		})
		.from(restaurantOrderItem)
		.where(
			and(
				eq(restaurantOrderItem.organizationId, access.organizationId),
				eq(restaurantOrderItem.id, input.orderItemId),
			),
		)
		.limit(1);

	if (!itemRow) {
		throw new Error("El ítem no existe en la organización activa.");
	}
	if (itemRow.status !== "draft") {
		throw new Error("Solo puedes editar ítems que aún no fueron enviados.");
	}

	await db
		.update(restaurantOrderItem)
		.set({
			quantity,
			...(notes !== undefined ? { notes } : {}),
			updatedAt: new Date(),
		})
		.where(eq(restaurantOrderItem.id, itemRow.id));

	return { success: true, orderId: itemRow.orderId };
}

export async function deleteRestaurantDraftItemForCurrentOrganization(orderItemId: string) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const [itemRow] = await db
		.select({
			id: restaurantOrderItem.id,
			orderId: restaurantOrderItem.orderId,
			status: restaurantOrderItem.status,
		})
		.from(restaurantOrderItem)
		.where(
			and(
				eq(restaurantOrderItem.organizationId, access.organizationId),
				eq(restaurantOrderItem.id, orderItemId),
			),
		)
		.limit(1);

	if (!itemRow) {
		throw new Error("El ítem no existe en la organización activa.");
	}
	if (itemRow.status !== "draft") {
		throw new Error("Solo puedes eliminar ítems que aún no fueron enviados.");
	}

	return db.transaction(async (tx) => {
		const database = tx as typeof db;
		await database
			.delete(restaurantOrderItem)
			.where(eq(restaurantOrderItem.id, itemRow.id));

		const [remainingRow] = await database
			.select({
				id: restaurantOrderItem.id,
			})
			.from(restaurantOrderItem)
			.where(eq(restaurantOrderItem.orderId, itemRow.orderId))
			.limit(1);

		if (!remainingRow) {
			await database
				.delete(restaurantOrder)
				.where(eq(restaurantOrder.id, itemRow.orderId));
		} else {
			await database
				.update(restaurantOrder)
				.set({
					updatedAt: new Date(),
				})
				.where(eq(restaurantOrder.id, itemRow.orderId));
		}

		return { success: true, orderId: itemRow.orderId };
	});
}

export async function sendRestaurantOrderToKitchenForCurrentOrganization(orderId: string) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const settings = await getOrganizationSettings(access.organizationId);

	return db.transaction(async (tx) => {
		const database = tx as typeof db;
		const order = await getOpenOrderById(database, access.organizationId, orderId);
		const table = await assertTableFromOrganization(
			database,
			access.organizationId,
			order.tableId,
		);
		const items = await getOrderItemsWithModifiers(
			database,
			access.organizationId,
			order.id,
		);
		const draftItems = items.filter((item) => item.status === "draft");
		if (draftItems.length === 0) {
			throw new Error("No hay ítems pendientes por enviar a cocina.");
		}

		const [lastTicket] = await database
			.select({
				sequenceNumber: restaurantKitchenTicket.sequenceNumber,
			})
			.from(restaurantKitchenTicket)
			.where(
				and(
					eq(restaurantKitchenTicket.organizationId, access.organizationId),
					eq(restaurantKitchenTicket.orderId, order.id),
				),
			)
			.orderBy(desc(restaurantKitchenTicket.sequenceNumber))
			.limit(1);
		const now = new Date();
		const ticketId = crypto.randomUUID();
		const sequenceNumber = (lastTicket?.sequenceNumber ?? 0) + 1;

		await database.insert(restaurantKitchenTicket).values({
			id: ticketId,
			organizationId: access.organizationId,
			orderId: order.id,
			createdByUserId: access.userId,
			sequenceNumber,
			status: "sent",
			createdAt: now,
			updatedAt: now,
			printedAt: null,
		});

		await database
			.update(restaurantOrderItem)
			.set({
				kitchenTicketId: ticketId,
				status: "sent",
				sentAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(restaurantOrderItem.organizationId, access.organizationId),
					eq(restaurantOrderItem.orderId, order.id),
					eq(restaurantOrderItem.status, "draft"),
				),
			);

		await database
			.update(restaurantOrder)
			.set({
				updatedAt: now,
			})
			.where(eq(restaurantOrder.id, order.id));

		return {
			ticket: {
				id: ticketId,
				orderId: order.id,
				orderNumber: order.orderNumber,
				sequenceNumber,
				createdAt: now.getTime(),
				table: {
					id: table.id,
					name: table.name,
					areaName: table.areaName,
				},
				items: draftItems,
			},
			printing: {
				enabled: settings.restaurants.kitchen.printTicketsEnabled,
				autoPrintOnSend: settings.restaurants.kitchen.autoPrintOnSend,
			},
		};
	});
}

export async function updateRestaurantOrderItemStatusForCurrentOrganization(input: {
	orderItemId: string;
	status: "ready" | "served";
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const [itemRow] = await db
		.select({
			id: restaurantOrderItem.id,
			status: restaurantOrderItem.status,
			kitchenTicketId: restaurantOrderItem.kitchenTicketId,
		})
		.from(restaurantOrderItem)
		.where(
			and(
				eq(restaurantOrderItem.organizationId, access.organizationId),
				eq(restaurantOrderItem.id, input.orderItemId),
			),
		)
		.limit(1);

	if (!itemRow) {
		throw new Error("El ítem no existe en la organización activa.");
	}
	if (itemRow.status === "draft" || itemRow.status === "cancelled") {
		throw new Error("El ítem aún no puede cambiar a ese estado.");
	}

	const now = new Date();
	await db
		.update(restaurantOrderItem)
		.set({
			status: input.status,
			readyAt: input.status === "ready" ? now : undefined,
			servedAt: input.status === "served" ? now : undefined,
			updatedAt: now,
		})
		.where(eq(restaurantOrderItem.id, itemRow.id));

	if (itemRow.kitchenTicketId) {
		await refreshKitchenTicketStatus(
			db,
			access.organizationId,
			itemRow.kitchenTicketId,
		);
	}

	return { success: true };
}

export async function getKitchenBoardForCurrentOrganization() {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const settings = await getOrganizationSettings(access.organizationId);
	if (!settings.restaurants.kitchen.displayEnabled) {
		throw new Error("La vista de cocina no está habilitada.");
	}

	const ticketRows = await db
		.select({
			id: restaurantKitchenTicket.id,
			orderId: restaurantKitchenTicket.orderId,
			sequenceNumber: restaurantKitchenTicket.sequenceNumber,
			status: restaurantKitchenTicket.status,
			createdAt: restaurantKitchenTicket.createdAt,
			orderNumber: restaurantOrder.orderNumber,
			tableId: restaurantTable.id,
			tableName: restaurantTable.name,
			areaName: restaurantArea.name,
		})
		.from(restaurantKitchenTicket)
		.innerJoin(restaurantOrder, eq(restaurantKitchenTicket.orderId, restaurantOrder.id))
		.innerJoin(restaurantTable, eq(restaurantOrder.tableId, restaurantTable.id))
		.innerJoin(restaurantArea, eq(restaurantTable.areaId, restaurantArea.id))
		.where(
			and(
				eq(restaurantKitchenTicket.organizationId, access.organizationId),
				eq(restaurantOrder.organizationId, access.organizationId),
				eq(restaurantOrder.status, "open"),
			),
		)
		.orderBy(desc(restaurantKitchenTicket.createdAt));
	const ticketIds = ticketRows.map((ticket) => ticket.id);
	const itemRows =
		ticketIds.length > 0
			? await db
					.select({
						id: restaurantOrderItem.id,
						kitchenTicketId: restaurantOrderItem.kitchenTicketId,
						productName: product.name,
						quantity: restaurantOrderItem.quantity,
						status: restaurantOrderItem.status,
						notes: restaurantOrderItem.notes,
					})
					.from(restaurantOrderItem)
					.innerJoin(product, eq(restaurantOrderItem.productId, product.id))
					.where(
						and(
							eq(restaurantOrderItem.organizationId, access.organizationId),
							inArray(restaurantOrderItem.kitchenTicketId, ticketIds),
							inArray(restaurantOrderItem.status, ["sent", "ready"]),
						),
					)
					.orderBy(
						desc(restaurantOrderItem.createdAt),
						desc(restaurantOrderItem.id),
					)
			: [];
	const itemsByTicketId = new Map<string, typeof itemRows>();
	for (const item of itemRows) {
		if (!item.kitchenTicketId) {
			continue;
		}
		const collection = itemsByTicketId.get(item.kitchenTicketId) ?? [];
		collection.push(item);
		itemsByTicketId.set(item.kitchenTicketId, collection);
	}

	return {
		tickets: ticketRows
			.map((ticketRow) => ({
				id: ticketRow.id,
				orderId: ticketRow.orderId,
				orderNumber: ticketRow.orderNumber,
				sequenceNumber: ticketRow.sequenceNumber,
				status: ticketRow.status,
				createdAt: toTimestamp(ticketRow.createdAt),
				table: {
					id: ticketRow.tableId,
					name: ticketRow.tableName,
					areaName: ticketRow.areaName,
				},
				items: itemsByTicketId.get(ticketRow.id) ?? [],
			}))
			.filter((ticket) => ticket.items.length > 0),
	};
}

export async function closeRestaurantOrderForCurrentOrganization(input: {
	orderId: string;
	shiftId: string;
	customerId?: string | null;
	payments: Array<{
		method: string;
		amount: number;
		reference?: string | null;
	}>;
}) {
	await requireModuleAccessForCurrentOrganization("restaurants");
	const access = await getCurrentOrganizationAccess();
	const order = await getOpenOrderById(db, access.organizationId, input.orderId);
	const items = await getOrderItemsWithModifiers(db, access.organizationId, order.id);
	const activeItems = items.filter((item) => item.status !== "cancelled");

	if (activeItems.length === 0) {
		throw new Error("No puedes cerrar una mesa sin ítems activos.");
	}

	const saleResult = await createPosSaleForCurrentOrganization({
		shiftId: normalizeRequiredString(input.shiftId, "shiftId"),
		customerId: normalizeOptionalString(input.customerId),
		items: activeItems.map((item) => ({
			productId: item.productId,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			taxRate: item.taxRate,
			discountAmount: item.discountAmount,
			modifiers: item.modifiers.map((modifier) => ({
				modifierProductId: modifier.modifierProductId,
				quantity: modifier.quantity,
				unitPrice: modifier.unitPrice,
			})),
		})),
		payments: input.payments,
	});
	const now = new Date();
	const ticketIds = [
		...new Set(
			activeItems
				.map((item) => item.kitchenTicketId)
				.filter((value): value is string => Boolean(value)),
		),
	];

	await Promise.all([
		db
			.update(restaurantOrder)
			.set({
				status: "closed",
				closedByUserId: access.userId,
				closedAt: now,
				saleId: saleResult.saleId,
				updatedAt: now,
			})
			.where(eq(restaurantOrder.id, order.id)),
		db
			.update(restaurantOrderItem)
			.set({
				status: "served",
				servedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(restaurantOrderItem.organizationId, access.organizationId),
					eq(restaurantOrderItem.orderId, order.id),
					isNull(restaurantOrderItem.cancelledAt),
				),
			),
		...(ticketIds.length > 0
			? [
					db
						.update(restaurantKitchenTicket)
						.set({
							status: "served",
							updatedAt: now,
						})
						.where(
							and(
								eq(
									restaurantKitchenTicket.organizationId,
									access.organizationId,
								),
								inArray(restaurantKitchenTicket.id, ticketIds),
							),
						),
			  ]
			: []),
	]);

	return saleResult;
}

export async function createRestaurantAreaForCurrentOrganization(input: {
	name: string;
}) {
	const access = await requireOrganizationManagerAccess();
	const name = normalizeRequiredString(input.name, "name");
	const now = new Date();

	await db.insert(restaurantArea).values({
		id: crypto.randomUUID(),
		organizationId: access.organizationId,
		name,
		sortOrder: await getNextAreaSortOrder(db, access.organizationId),
		createdAt: now,
		updatedAt: now,
	});

	return getRestaurantConfigurationForCurrentOrganization();
}

export async function updateRestaurantAreaForCurrentOrganization(input: {
	id: string;
	name?: string;
}) {
	const access = await requireOrganizationManagerAccess();
	const updates: Partial<typeof restaurantArea.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (input.name !== undefined) {
		updates.name = normalizeRequiredString(input.name, "name");
	}

	await assertAreaFromOrganization(db, access.organizationId, input.id);
	await db
		.update(restaurantArea)
		.set(updates)
		.where(eq(restaurantArea.id, input.id));

	return getRestaurantConfigurationForCurrentOrganization();
}

export async function deleteRestaurantAreaForCurrentOrganization(id: string) {
	const access = await requireOrganizationManagerAccess();
	const [tableRow] = await db
		.select({ id: restaurantTable.id })
		.from(restaurantTable)
		.where(
			and(
				eq(restaurantTable.organizationId, access.organizationId),
				eq(restaurantTable.areaId, id),
			),
		)
		.limit(1);

	if (tableRow) {
		throw new Error("No puedes eliminar una zona que aún tiene mesas.");
	}

	await db
		.delete(restaurantArea)
		.where(
			and(
				eq(restaurantArea.organizationId, access.organizationId),
				eq(restaurantArea.id, id),
			),
		);

	return getRestaurantConfigurationForCurrentOrganization();
}

export async function createRestaurantTableForCurrentOrganization(input: {
	areaId: string;
	name: string;
	seats?: number;
}) {
	const access = await requireOrganizationManagerAccess();
	const area = await assertAreaFromOrganization(db, access.organizationId, input.areaId);
	const name = normalizeRequiredString(input.name, "name");
	const seats = toNonNegativeInteger(input.seats ?? 0, "seats");
	const now = new Date();

	await db.insert(restaurantTable).values({
		id: crypto.randomUUID(),
		organizationId: access.organizationId,
		areaId: area.id,
		name,
		seats,
		sortOrder: await getNextTableSortOrder(db, access.organizationId, area.id),
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	return getRestaurantConfigurationForCurrentOrganization();
}

export async function updateRestaurantTableForCurrentOrganization(input: {
	id: string;
	areaId?: string;
	name?: string;
	seats?: number;
	isActive?: boolean;
}) {
	const access = await requireOrganizationManagerAccess();
	await assertTableFromOrganization(db, access.organizationId, input.id);
	const updates: Partial<typeof restaurantTable.$inferInsert> = {
		updatedAt: new Date(),
	};

	if (input.areaId !== undefined) {
		const area = await assertAreaFromOrganization(
			db,
			access.organizationId,
			input.areaId,
		);
		updates.areaId = area.id;
	}
	if (input.name !== undefined) {
		updates.name = normalizeRequiredString(input.name, "name");
	}
	if (input.seats !== undefined) {
		updates.seats = toNonNegativeInteger(input.seats, "seats");
	}
	if (input.isActive !== undefined) {
		updates.isActive = input.isActive;
	}

	await db
		.update(restaurantTable)
		.set(updates)
		.where(eq(restaurantTable.id, input.id));

	return getRestaurantConfigurationForCurrentOrganization();
}

export async function deleteRestaurantTableForCurrentOrganization(id: string) {
	const access = await requireOrganizationManagerAccess();
	const [orderRow] = await db
		.select({ id: restaurantOrder.id })
		.from(restaurantOrder)
		.where(
			and(
				eq(restaurantOrder.organizationId, access.organizationId),
				eq(restaurantOrder.tableId, id),
			),
		)
		.limit(1);

	if (orderRow) {
		throw new Error("No puedes eliminar una mesa que ya tiene historial.");
	}

	await db
		.delete(restaurantTable)
		.where(
			and(
				eq(restaurantTable.organizationId, access.organizationId),
				eq(restaurantTable.id, id),
			),
		);

	return getRestaurantConfigurationForCurrentOrganization();
}
