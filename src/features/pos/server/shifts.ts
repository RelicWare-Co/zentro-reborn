import "@tanstack/react-start/server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import {
	cashMovement,
	category,
	payment,
	product,
	shift,
	shiftClosure,
} from "#/db/schema";
import { requireAuthContext } from "./auth-context";
import {
	CASH_MOVEMENT_TYPES,
	type CloseShiftInput,
	type OpenShiftInput,
	type RegisterCashMovementInput,
} from "./types";
import {
	normalizeOptionalString,
	normalizeRequiredString,
	resolveDate,
	toNonNegativeInteger,
	toPositiveInteger,
	toTimestamp,
} from "./utils";

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

	const [activeShiftRows, categories, modifierProducts] = await Promise.all([
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
					eq(product.isModifier, true),
					isNull(product.deletedAt),
				),
			)
			.orderBy(asc(product.name)),
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
		modifierProducts,
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
