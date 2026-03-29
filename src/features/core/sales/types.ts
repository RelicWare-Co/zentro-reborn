export type CreateCoreSaleInput = {
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
