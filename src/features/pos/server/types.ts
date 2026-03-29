import type { CreateCoreSaleInput } from "#/features/core/sales/types";

export const CASH_MOVEMENT_TYPES = ["expense", "payout", "inflow"] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

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
	paymentMethod: string;
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

export type CreatePosSaleInput = CreateCoreSaleInput;

export type CancelSaleInput = {
	saleId: string;
	cancelledAt?: number;
};

export type ListSalesInput = {
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

export type ListShiftsInput = {
	limit?: number;
	cursor?: number;
	status?: string | null;
	searchQuery?: string | null;
	cashierId?: string | null;
	terminalName?: string | null;
	paymentMethod?: string | null;
	differenceStatus?: "short" | "over" | "balanced" | null;
	hasMovements?: "yes" | "no" | null;
	startDate?: string | null;
	endDate?: string | null;
};

export type GetSaleByIdInput = {
	saleId: string;
};
