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
	startDate?: string | null;
	endDate?: string | null;
};

export type ListShiftsInput = {
	limit?: number;
	cursor?: number;
	status?: string | null;
	searchQuery?: string | null;
	cashierId?: string | null;
	startDate?: string | null;
	endDate?: string | null;
};

export type GetSaleByIdInput = {
	saleId: string;
};
