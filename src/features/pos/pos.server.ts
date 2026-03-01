import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "#/db";
import {
	cashMovement,
	category,
	creditAccount,
	creditTransaction,
	customer,
	inventoryMovement,
	member,
	payment,
	product,
	sale,
	saleItem,
	saleItemModifier,
	shift,
	shiftClosure,
} from "#/db/schema";
import { auth } from "#/lib/auth";

export const CASH_MOVEMENT_TYPES = ["expense", "payout", "inflow"] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type OpenShiftInput = {
	startingCash: number;
	terminalId?: string | null;
	terminalName?: string | null;
	notes?: string | null;
	openedAt?: number;
};

export type RegisterCashMovementInput = {
	shiftId: string;
	type: CashMovementType;
	amount: number;
	description: string;
	createdAt?: number;
};

export type CloseShiftInput = {
	shiftId: string;
	closures: Array<{
		paymentMethod: string;
		actualAmount: number;
	}>;
	notes?: string | null;
	closedAt?: number;
};

export type CreatePosSaleInput = {
	shiftId: string;
	customerId?: string | null;
	items: Array<{
		productId: string;
		quantity: number;
		unitPrice?: number;
		taxRate?: number;
		discountAmount?: number;
		modifiers?: Array<{
			modifierProductId: string;
			quantity: number;
			unitPrice?: number;
		}>;
	}>;
	discountAmount?: number;
	payments?: Array<{
		method: string;
		amount: number;
		reference?: string | null;
	}>;
	isCreditSale?: boolean;
	createdAt?: number;
};

function normalizeOptionalString(value?: string | null) {
	if (value == null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value: string, fieldName: string) {
	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new Error(`El campo "${fieldName}" es obligatorio`);
	}
	return normalized;
}

function toNonNegativeInteger(value: number, fieldName: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(
			`El campo "${fieldName}" debe ser un número válido mayor o igual a 0`,
		);
	}
	return Math.round(value);
}

function toPositiveInteger(value: number, fieldName: string) {
	const normalized = toNonNegativeInteger(value, fieldName);
	if (normalized <= 0) {
		throw new Error(
			`El campo "${fieldName}" debe ser un número válido mayor a 0`,
		);
	}
	return normalized;
}

function resolveDate(input: number | undefined, fieldName: string) {
	if (input === undefined) {
		return new Date();
	}

	return new Date(toNonNegativeInteger(input, fieldName));
}

function toTimestamp(value: Date | number | null | undefined) {
	if (value == null) {
		return null;
	}

	if (value instanceof Date) {
		return value.getTime();
	}

	return value;
}

async function requireSession(): Promise<AuthSession> {
	const session = await auth.api.getSession({
		headers: getRequest().headers,
	});

	if (!session) {
		throw new Error("No autorizado");
	}

	return session;
}

async function resolveOrganizationId(session: AuthSession) {
	const activeOrganizationId = session.session.activeOrganizationId;
	if (activeOrganizationId) {
		return activeOrganizationId;
	}

	const [membership] = await db
		.select({
			organizationId: member.organizationId,
		})
		.from(member)
		.where(eq(member.userId, session.user.id))
		.limit(1);

	if (!membership) {
		return null;
	}

	return membership.organizationId;
}

async function requireAuthContext() {
	const session = await requireSession();
	const organizationId = await resolveOrganizationId(session);
	if (!organizationId) {
		throw new Error("No hay una organización activa");
	}

	return { session, organizationId };
}

function buildExpectedAmountsByMethod(
	startingCash: number,
	payments: Array<{ method: string; amount: number }>,
	movements: Array<{ type: string; amount: number }>,
) {
	const expectedByMethod = new Map<string, number>();

	for (const registeredPayment of payments) {
		expectedByMethod.set(
			registeredPayment.method,
			(expectedByMethod.get(registeredPayment.method) ?? 0) +
				registeredPayment.amount,
		);
	}

	let expectedCash = (expectedByMethod.get("cash") ?? 0) + startingCash;
	for (const movement of movements) {
		switch (movement.type) {
			case "inflow":
				expectedCash += movement.amount;
				break;
			case "expense":
			case "payout":
				expectedCash -= movement.amount;
				break;
			default:
				throw new Error(
					`Tipo de movimiento de caja no soportado: ${movement.type}`,
				);
		}
	}

	expectedByMethod.set("cash", expectedCash);
	return expectedByMethod;
}

export async function getPosBootstrapForCurrentOrganization() {
	const { session, organizationId } = await requireAuthContext();

	const [activeShiftRows, categories, catalog, customers] = await Promise.all([
		db
			.select({
				id: shift.id,
				terminalId: shift.terminalId,
				terminalName: shift.terminalName,
				status: shift.status,
				startingCash: shift.startingCash,
				openedAt: shift.openedAt,
				closedAt: shift.closedAt,
				notes: shift.notes,
			})
			.from(shift)
			.where(
				and(
					eq(shift.organizationId, organizationId),
					eq(shift.userId, session.user.id),
					eq(shift.status, "open"),
				),
			)
			.orderBy(desc(shift.openedAt))
			.limit(1),
		db
			.select({
				id: category.id,
				name: category.name,
				description: category.description,
			})
			.from(category)
			.where(eq(category.organizationId, organizationId))
			.orderBy(asc(category.name)),
		db
			.select({
				id: product.id,
				name: product.name,
				categoryId: product.categoryId,
				categoryName: category.name,
				sku: product.sku,
				barcode: product.barcode,
				price: product.price,
				taxRate: product.taxRate,
				trackInventory: product.trackInventory,
				stock: product.stock,
				isModifier: product.isModifier,
			})
			.from(product)
			.leftJoin(
				category,
				and(
					eq(product.categoryId, category.id),
					eq(category.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
				),
			)
			.orderBy(asc(product.name)),
		db
			.select({
				id: customer.id,
				name: customer.name,
				documentNumber: customer.documentNumber,
				phone: customer.phone,
				email: customer.email,
			})
			.from(customer)
			.where(
				and(
					eq(customer.organizationId, organizationId),
					isNull(customer.deletedAt),
				),
			)
			.orderBy(asc(customer.name)),
	]);

	const activeShift = activeShiftRows[0] ?? null;

	return {
		activeShift: activeShift
			? {
					...activeShift,
					openedAt: toTimestamp(activeShift.openedAt),
					closedAt: toTimestamp(activeShift.closedAt),
				}
			: null,
		categories,
		products: catalog.filter((catalogProduct) => !catalogProduct.isModifier),
		modifierProducts: catalog.filter(
			(catalogProduct) => catalogProduct.isModifier,
		),
		customers,
	};
}

export async function openShiftForCurrentOrganization(input: OpenShiftInput) {
	const { session, organizationId } = await requireAuthContext();

	const startingCash = toNonNegativeInteger(input.startingCash, "startingCash");
	const terminalId = normalizeOptionalString(input.terminalId);
	const terminalName = normalizeOptionalString(input.terminalName);
	const notes = normalizeOptionalString(input.notes);
	const openedAt = resolveDate(input.openedAt, "openedAt");

	const [userOpenShift] = await db
		.select({ id: shift.id })
		.from(shift)
		.where(
			and(
				eq(shift.organizationId, organizationId),
				eq(shift.userId, session.user.id),
				eq(shift.status, "open"),
			),
		)
		.limit(1);

	if (userOpenShift) {
		throw new Error("El usuario ya tiene un turno abierto");
	}

	if (terminalId) {
		const [terminalOpenShift] = await db
			.select({ id: shift.id })
			.from(shift)
			.where(
				and(
					eq(shift.organizationId, organizationId),
					eq(shift.status, "open"),
					eq(shift.terminalId, terminalId),
				),
			)
			.limit(1);

		if (terminalOpenShift) {
			throw new Error("La terminal indicada ya tiene un turno abierto");
		}
	}

	const shiftId = crypto.randomUUID();
	await db.insert(shift).values({
		id: shiftId,
		organizationId,
		userId: session.user.id,
		terminalId,
		terminalName,
		status: "open",
		startingCash,
		openedAt,
		notes,
	});

	return {
		id: shiftId,
		status: "open" as const,
		startingCash,
		openedAt: openedAt.getTime(),
	};
}

export async function registerCashMovementForCurrentOrganization(
	input: RegisterCashMovementInput,
) {
	const { session, organizationId } = await requireAuthContext();

	if (!CASH_MOVEMENT_TYPES.includes(input.type)) {
		throw new Error("Tipo de movimiento de caja inválido");
	}

	const amount = toPositiveInteger(input.amount, "amount");
	const description = normalizeRequiredString(input.description, "description");
	const createdAt = resolveDate(input.createdAt, "createdAt");

	const [targetShift] = await db
		.select({ id: shift.id, userId: shift.userId, status: shift.status })
		.from(shift)
		.where(
			and(
				eq(shift.id, input.shiftId),
				eq(shift.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!targetShift) {
		throw new Error("Turno no encontrado para la organización activa");
	}
	if (targetShift.status !== "open") {
		throw new Error("No se puede registrar movimiento en un turno cerrado");
	}
	if (targetShift.userId !== session.user.id) {
		throw new Error("Solo el cajero del turno puede registrar movimientos");
	}

	const movementId = crypto.randomUUID();
	await db.insert(cashMovement).values({
		id: movementId,
		organizationId,
		shiftId: input.shiftId,
		type: input.type,
		amount,
		description,
		createdAt,
	});

	return {
		id: movementId,
		shiftId: input.shiftId,
		type: input.type,
		amount,
		description,
		createdAt: createdAt.getTime(),
	};
}

export async function getShiftCloseSummaryForCurrentOrganization(
	shiftId: string,
) {
	const { organizationId } = await requireAuthContext();

	const [targetShift] = await db
		.select({
			id: shift.id,
			status: shift.status,
			startingCash: shift.startingCash,
			openedAt: shift.openedAt,
			closedAt: shift.closedAt,
		})
		.from(shift)
		.where(and(eq(shift.id, shiftId), eq(shift.organizationId, organizationId)))
		.limit(1);

	if (!targetShift) {
		throw new Error("Turno no encontrado para la organización activa");
	}

	const [registeredPayments, registeredMovements, registeredClosures] =
		await Promise.all([
			db
				.select({ method: payment.method, amount: payment.amount })
				.from(payment)
				.where(
					and(
						eq(payment.organizationId, organizationId),
						eq(payment.shiftId, shiftId),
					),
				),
			db
				.select({ type: cashMovement.type, amount: cashMovement.amount })
				.from(cashMovement)
				.where(
					and(
						eq(cashMovement.organizationId, organizationId),
						eq(cashMovement.shiftId, shiftId),
					),
				),
			db
				.select({
					paymentMethod: shiftClosure.paymentMethod,
					expectedAmount: shiftClosure.expectedAmount,
					actualAmount: shiftClosure.actualAmount,
					difference: shiftClosure.difference,
				})
				.from(shiftClosure)
				.where(eq(shiftClosure.shiftId, shiftId)),
		]);

	const expectedByMethod = buildExpectedAmountsByMethod(
		targetShift.startingCash,
		registeredPayments,
		registeredMovements,
	);
	const closureByMethod = new Map(
		registeredClosures.map((closure) => [closure.paymentMethod, closure]),
	);

	const summaryByMethod = [...expectedByMethod.entries()]
		.sort(([methodA], [methodB]) => {
			if (methodA === "cash") return -1;
			if (methodB === "cash") return 1;
			return methodA.localeCompare(methodB);
		})
		.map(([paymentMethod, expectedAmount]) => {
			const closure = closureByMethod.get(paymentMethod);
			return {
				paymentMethod,
				expectedAmount,
				actualAmount: closure?.actualAmount ?? null,
				difference: closure?.difference ?? null,
			};
		});

	const totalExpected = summaryByMethod.reduce(
		(total, current) => total + current.expectedAmount,
		0,
	);

	return {
		shift: {
			id: targetShift.id,
			status: targetShift.status,
			startingCash: targetShift.startingCash,
			openedAt: toTimestamp(targetShift.openedAt),
			closedAt: toTimestamp(targetShift.closedAt),
		},
		summaryByMethod,
		totalExpected,
		registeredClosures,
	};
}

export async function closeShiftForCurrentOrganization(input: CloseShiftInput) {
	const { session, organizationId } = await requireAuthContext();

	const closedAt = resolveDate(input.closedAt, "closedAt");
	const notes = normalizeOptionalString(input.notes);
	const actualByMethod = new Map<string, number>();

	for (const closure of input.closures) {
		const paymentMethod = normalizeRequiredString(
			closure.paymentMethod,
			"paymentMethod",
		).toLowerCase();
		if (actualByMethod.has(paymentMethod)) {
			throw new Error(`Método de pago duplicado en cierre: ${paymentMethod}`);
		}

		actualByMethod.set(
			paymentMethod,
			toNonNegativeInteger(
				closure.actualAmount,
				`actualAmount (${paymentMethod})`,
			),
		);
	}

	return db.transaction(async (tx) => {
		const [targetShift] = await tx
			.select({
				id: shift.id,
				status: shift.status,
				userId: shift.userId,
				startingCash: shift.startingCash,
				notes: shift.notes,
			})
			.from(shift)
			.where(
				and(
					eq(shift.id, input.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!targetShift) {
			throw new Error("Turno no encontrado para la organización activa");
		}
		if (targetShift.status !== "open") {
			throw new Error("El turno ya está cerrado");
		}
		if (targetShift.userId !== session.user.id) {
			throw new Error("Solo el cajero del turno puede cerrar caja");
		}

		const [existingClosure] = await tx
			.select({ id: shiftClosure.id })
			.from(shiftClosure)
			.where(eq(shiftClosure.shiftId, input.shiftId))
			.limit(1);

		if (existingClosure) {
			throw new Error("El turno ya cuenta con un cierre registrado");
		}

		const [registeredPayments, registeredMovements] = await Promise.all([
			tx
				.select({ method: payment.method, amount: payment.amount })
				.from(payment)
				.where(
					and(
						eq(payment.organizationId, organizationId),
						eq(payment.shiftId, input.shiftId),
					),
				),
			tx
				.select({ type: cashMovement.type, amount: cashMovement.amount })
				.from(cashMovement)
				.where(
					and(
						eq(cashMovement.organizationId, organizationId),
						eq(cashMovement.shiftId, input.shiftId),
					),
				),
		]);

		const expectedByMethod = buildExpectedAmountsByMethod(
			targetShift.startingCash,
			registeredPayments,
			registeredMovements,
		);

		const allMethods = new Set<string>([
			...expectedByMethod.keys(),
			...actualByMethod.keys(),
		]);
		if (allMethods.size === 0) {
			allMethods.add("cash");
		}

		const closureRows = [...allMethods].map((paymentMethod) => {
			const expectedAmount = expectedByMethod.get(paymentMethod) ?? 0;
			const actualAmount = actualByMethod.get(paymentMethod) ?? 0;
			return {
				id: crypto.randomUUID(),
				shiftId: input.shiftId,
				paymentMethod,
				expectedAmount,
				actualAmount,
				difference: actualAmount - expectedAmount,
			};
		});

		await tx.insert(shiftClosure).values(closureRows);
		await tx
			.update(shift)
			.set({
				status: "closed",
				closedAt,
				notes: notes ?? targetShift.notes,
			})
			.where(eq(shift.id, input.shiftId));

		return {
			shiftId: input.shiftId,
			closedAt: closedAt.getTime(),
			closures: closureRows,
		};
	});
}

export async function createPosSaleForCurrentOrganization(
	input: CreatePosSaleInput,
) {
	const { session, organizationId } = await requireAuthContext();

	if (!Array.isArray(input.items) || input.items.length === 0) {
		throw new Error("La venta debe incluir al menos un ítem");
	}

	const createdAt = resolveDate(input.createdAt, "createdAt");
	const customerId = normalizeOptionalString(input.customerId);
	const saleLevelDiscount = toNonNegativeInteger(
		input.discountAmount ?? 0,
		"discountAmount",
	);
	const isCreditSale = input.isCreditSale ?? false;

	return db.transaction(async (tx) => {
		const [targetShift] = await tx
			.select({ id: shift.id, status: shift.status, userId: shift.userId })
			.from(shift)
			.where(
				and(
					eq(shift.id, input.shiftId),
					eq(shift.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!targetShift) {
			throw new Error("Turno no encontrado para la organización activa");
		}
		if (targetShift.status !== "open") {
			throw new Error("No se puede registrar una venta en un turno cerrado");
		}
		if (targetShift.userId !== session.user.id) {
			throw new Error("Solo el cajero del turno puede registrar ventas");
		}

		if (customerId) {
			const [existingCustomer] = await tx
				.select({ id: customer.id })
				.from(customer)
				.where(
					and(
						eq(customer.id, customerId),
						eq(customer.organizationId, organizationId),
						isNull(customer.deletedAt),
					),
				)
				.limit(1);

			if (!existingCustomer) {
				throw new Error("El cliente seleccionado no existe o está inactivo");
			}
		}

		const referencedProductIds = new Set<string>();
		for (const item of input.items) {
			referencedProductIds.add(item.productId);
			for (const modifier of item.modifiers ?? []) {
				referencedProductIds.add(modifier.modifierProductId);
			}
		}

		const referencedIds = [...referencedProductIds];
		if (referencedIds.length === 0) {
			throw new Error("No hay productos válidos para procesar");
		}

		const productRows = await tx
			.select({
				id: product.id,
				name: product.name,
				price: product.price,
				taxRate: product.taxRate,
				isModifier: product.isModifier,
				trackInventory: product.trackInventory,
				stock: product.stock,
			})
			.from(product)
			.where(
				and(
					eq(product.organizationId, organizationId),
					isNull(product.deletedAt),
					inArray(product.id, referencedIds),
				),
			);

		const productById = new Map(productRows.map((row) => [row.id, row]));
		for (const productId of referencedIds) {
			if (!productById.has(productId)) {
				throw new Error(
					`Producto no encontrado o inactivo en la organización actual: ${productId}`,
				);
			}
		}

		type PreparedModifier = {
			id: string;
			saleItemId: string;
			modifierProductId: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
			totalQuantitySold: number;
		};

		type PreparedItem = {
			id: string;
			productId: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
			taxRate: number;
			taxAmount: number;
			discountAmount: number;
			totalAmount: number;
			modifiers: PreparedModifier[];
		};

		const stockDeltas = new Map<string, number>();
		const addStockDelta = (productId: string, delta: number) => {
			stockDeltas.set(productId, (stockDeltas.get(productId) ?? 0) + delta);
		};

		const preparedItems: PreparedItem[] = [];
		let subtotal = 0;
		let taxAmount = 0;
		let itemDiscountAmount = 0;

		for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
			const item = input.items[itemIndex];
			const baseProduct = productById.get(item.productId);

			if (!baseProduct) {
				throw new Error(`Producto inválido en ítem ${itemIndex + 1}`);
			}
			if (baseProduct.isModifier) {
				throw new Error(
					`El producto ${baseProduct.name} solo puede venderse como modificador`,
				);
			}

			const quantity = toPositiveInteger(
				item.quantity,
				`items[${itemIndex}].quantity`,
			);
			const unitPrice = toNonNegativeInteger(
				item.unitPrice ?? baseProduct.price,
				`items[${itemIndex}].unitPrice`,
			);
			const lineTaxRate = toNonNegativeInteger(
				item.taxRate ?? baseProduct.taxRate,
				`items[${itemIndex}].taxRate`,
			);
			const lineDiscountAmount = toNonNegativeInteger(
				item.discountAmount ?? 0,
				`items[${itemIndex}].discountAmount`,
			);

			const lineSubtotal = quantity * unitPrice;
			const lineTaxAmount = Math.round((lineSubtotal * lineTaxRate) / 100);
			let modifiersSubtotal = 0;

			const saleItemId = crypto.randomUUID();
			const preparedModifiers: PreparedModifier[] = [];
			for (
				let modifierIndex = 0;
				modifierIndex < (item.modifiers ?? []).length;
				modifierIndex += 1
			) {
				const modifier = item.modifiers?.[modifierIndex];
				if (!modifier) {
					continue;
				}

				const modifierProduct = productById.get(modifier.modifierProductId);
				if (!modifierProduct) {
					throw new Error(
						`Modificador inválido en items[${itemIndex}].modifiers[${modifierIndex}]`,
					);
				}
				if (!modifierProduct.isModifier) {
					throw new Error(
						`El producto ${modifierProduct.name} no está configurado como modificador`,
					);
				}

				const modifierQuantity = toPositiveInteger(
					modifier.quantity,
					`items[${itemIndex}].modifiers[${modifierIndex}].quantity`,
				);
				const modifierUnitPrice = toNonNegativeInteger(
					modifier.unitPrice ?? modifierProduct.price,
					`items[${itemIndex}].modifiers[${modifierIndex}].unitPrice`,
				);
				const soldModifierQuantity = quantity * modifierQuantity;
				const modifierSubtotal = soldModifierQuantity * modifierUnitPrice;
				modifiersSubtotal += modifierSubtotal;
				addStockDelta(modifierProduct.id, -soldModifierQuantity);

				preparedModifiers.push({
					id: crypto.randomUUID(),
					saleItemId,
					modifierProductId: modifierProduct.id,
					quantity: modifierQuantity,
					unitPrice: modifierUnitPrice,
					subtotal: modifierSubtotal,
					totalQuantitySold: soldModifierQuantity,
				});
			}

			const lineTotalAmount =
				lineSubtotal + modifiersSubtotal + lineTaxAmount - lineDiscountAmount;
			if (lineTotalAmount < 0) {
				throw new Error(
					`El total del ítem ${itemIndex + 1} no puede ser negativo`,
				);
			}

			preparedItems.push({
				id: saleItemId,
				productId: baseProduct.id,
				quantity,
				unitPrice,
				subtotal: lineSubtotal,
				taxRate: lineTaxRate,
				taxAmount: lineTaxAmount,
				discountAmount: lineDiscountAmount,
				totalAmount: lineTotalAmount,
				modifiers: preparedModifiers,
			});

			addStockDelta(baseProduct.id, -quantity);
			subtotal += lineSubtotal + modifiersSubtotal;
			taxAmount += lineTaxAmount;
			itemDiscountAmount += lineDiscountAmount;
		}

		const discountAmount = itemDiscountAmount + saleLevelDiscount;
		const totalAmount = subtotal + taxAmount - discountAmount;
		if (totalAmount < 0) {
			throw new Error("El total de la venta no puede ser negativo");
		}

		const normalizedPayments = (input.payments ?? []).map(
			(registeredPayment, index) => ({
				method: normalizeRequiredString(
					registeredPayment.method,
					`payments[${index}].method`,
				).toLowerCase(),
				amount: toPositiveInteger(
					registeredPayment.amount,
					`payments[${index}].amount`,
				),
				reference: normalizeOptionalString(registeredPayment.reference),
			}),
		);
		const paidAmount = normalizedPayments.reduce(
			(total, registeredPayment) => total + registeredPayment.amount,
			0,
		);

		if (isCreditSale) {
			if (!customerId) {
				throw new Error(
					"Una venta a crédito requiere seleccionar un cliente registrado",
				);
			}
			if (paidAmount > totalAmount) {
				throw new Error(
					"Los pagos no pueden superar el total en una venta a crédito",
				);
			}
			if (totalAmount - paidAmount <= 0) {
				throw new Error(
					"La venta marcada como crédito debe dejar un saldo pendiente por cobrar",
				);
			}
		} else {
			if (totalAmount === 0) {
				if (normalizedPayments.length > 0) {
					throw new Error(
						"No debes registrar pagos cuando el total de la venta es 0",
					);
				}
			} else {
				if (normalizedPayments.length === 0) {
					throw new Error(
						"Debes registrar al menos un pago para finalizar la venta",
					);
				}
				if (paidAmount !== totalAmount) {
					throw new Error(
						"La suma de los pagos debe ser igual al total de la venta",
					);
				}
			}
		}

		const saleId = crypto.randomUUID();
		const saleStatus = isCreditSale ? "credit" : "completed";

		await tx.insert(sale).values({
			id: saleId,
			organizationId,
			shiftId: input.shiftId,
			customerId,
			userId: session.user.id,
			subtotal,
			taxAmount,
			discountAmount,
			totalAmount,
			status: saleStatus,
			createdAt,
		});

		await tx.insert(saleItem).values(
			preparedItems.map((line) => ({
				id: line.id,
				saleId,
				organizationId,
				productId: line.productId,
				quantity: line.quantity,
				unitPrice: line.unitPrice,
				subtotal: line.subtotal,
				taxRate: line.taxRate,
				taxAmount: line.taxAmount,
				discountAmount: line.discountAmount,
				totalAmount: line.totalAmount,
			})),
		);

		const modifierRows = preparedItems.flatMap((line) => line.modifiers);
		if (modifierRows.length > 0) {
			await tx.insert(saleItemModifier).values(
				modifierRows.map((modifierRow) => ({
					id: modifierRow.id,
					saleItemId: modifierRow.saleItemId,
					organizationId,
					modifierProductId: modifierRow.modifierProductId,
					quantity: modifierRow.quantity,
					unitPrice: modifierRow.unitPrice,
					subtotal: modifierRow.subtotal,
				})),
			);
		}

		if (normalizedPayments.length > 0) {
			await tx.insert(payment).values(
				normalizedPayments.map((registeredPayment) => ({
					id: crypto.randomUUID(),
					organizationId,
					saleId,
					shiftId: input.shiftId,
					method: registeredPayment.method,
					reference: registeredPayment.reference,
					amount: registeredPayment.amount,
					createdAt,
				})),
			);
		}

		const inventoryRows: Array<typeof inventoryMovement.$inferInsert> = [];
		for (const [productId, deltaQuantity] of stockDeltas.entries()) {
			if (deltaQuantity === 0) {
				continue;
			}

			const productRow = productById.get(productId);
			if (!productRow) {
				throw new Error(`Producto no encontrado para inventario: ${productId}`);
			}
			if (!productRow.trackInventory) {
				continue;
			}

			const resultingStock = productRow.stock + deltaQuantity;
			if (resultingStock < 0) {
				throw new Error(
					`Stock insuficiente para ${productRow.name}. Disponible: ${productRow.stock}`,
				);
			}

			await tx
				.update(product)
				.set({ stock: resultingStock })
				.where(
					and(
						eq(product.id, productId),
						eq(product.organizationId, organizationId),
						isNull(product.deletedAt),
					),
				);

			inventoryRows.push({
				id: crypto.randomUUID(),
				organizationId,
				productId,
				userId: session.user.id,
				type: "sale",
				quantity: deltaQuantity,
				notes: `Venta ${saleId}`,
				createdAt,
			});
		}

		if (inventoryRows.length > 0) {
			await tx.insert(inventoryMovement).values(inventoryRows);
		}

		const balanceDue = totalAmount - paidAmount;
		if (isCreditSale && customerId) {
			const [existingCreditAccount] = await tx
				.select({ id: creditAccount.id, balance: creditAccount.balance })
				.from(creditAccount)
				.where(
					and(
						eq(creditAccount.organizationId, organizationId),
						eq(creditAccount.customerId, customerId),
					),
				)
				.limit(1);

			let creditAccountId = existingCreditAccount?.id;
			if (!existingCreditAccount) {
				creditAccountId = crypto.randomUUID();
				await tx.insert(creditAccount).values({
					id: creditAccountId,
					organizationId,
					customerId,
					balance: balanceDue,
					interestRate: 0,
					createdAt,
					updatedAt: createdAt,
				});
			} else {
				await tx
					.update(creditAccount)
					.set({ balance: existingCreditAccount.balance + balanceDue })
					.where(eq(creditAccount.id, existingCreditAccount.id));
			}

			await tx.insert(creditTransaction).values({
				id: crypto.randomUUID(),
				organizationId,
				creditAccountId,
				saleId,
				type: "charge",
				amount: balanceDue,
				notes: `Cargo por venta ${saleId}`,
				createdAt,
			});
		}

		return {
			saleId,
			status: saleStatus,
			subtotal,
			taxAmount,
			discountAmount,
			totalAmount,
			paidAmount,
			balanceDue,
		};
	});
}
