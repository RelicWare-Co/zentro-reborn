import { useCallback, useMemo, useState } from "react";
import type { CartItem, PaymentMethod } from "../types";
import { useCreatePosSaleMutation } from "./usePosQueries";

export function usePosCheckout(
	activeShiftId: string | undefined,
	cart: CartItem[],
	totalAmount: number,
	selectedCustomerId: string,
	discountInput: string,
	clearCart: () => void,
	resetDiscount: () => void,
) {
	const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
	const [payments, setPayments] = useState<PaymentMethod[]>([
		{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
	]);
	const [isCreditSale, setIsCreditSale] = useState(false);

	const createPosSaleMutation = useCreatePosSaleMutation();

	const addPaymentMethod = useCallback(() => {
		setPayments((prevPayments) => [
			...prevPayments,
			{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
		]);
	}, []);

	const removePaymentMethod = useCallback((index: number) => {
		setPayments((prevPayments) => prevPayments.filter((_, i) => i !== index));
	}, []);

	const updatePayment = useCallback(
		(index: number, field: "method" | "amount" | "reference", value: string) => {
			setPayments((prevPayments) =>
				prevPayments.map((payment, paymentIndex) => {
					if (paymentIndex !== index) {
						return payment;
					}
					return { ...payment, [field]: value };
				}),
			);
		},
		[],
	);

	const resetPayments = useCallback(() => {
		setPayments([
			{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
		]);
		setIsCreditSale(false);
	}, []);

	const handleFinalizeSale = useCallback(() => {
		if (!activeShiftId || cart.length === 0) {
			return;
		}

		const saleDiscountAmount = Math.max(
			0,
			Math.round(Number(discountInput) || 0),
		);

		const salePayments = payments
			.map((paymentMethod) => ({
				method: paymentMethod.method,
				amount: Number(paymentMethod.amount),
				reference: paymentMethod.reference.trim() || null,
			}))
			.filter((paymentMethod) => paymentMethod.amount > 0);
		const shouldRegisterAsCreditSale =
			isCreditSale &&
			totalAmount - salePayments.reduce((sum, payment) => sum + payment.amount, 0) > 0;

		createPosSaleMutation.mutate(
			{
				shiftId: activeShiftId,
				customerId: selectedCustomerId || null,
				discountAmount: saleDiscountAmount,
				items: cart.map((item) => ({
					productId: item.product.id,
					quantity: item.quantity,
					unitPrice: item.product.price,
					taxRate: item.product.taxRate,
					discountAmount: item.discountAmount,
					modifiers: item.modifiers.map((modifier) => ({
						modifierProductId: modifier.id,
						quantity: modifier.quantity,
						unitPrice: modifier.price,
					})),
				})),
				payments: salePayments,
				isCreditSale: shouldRegisterAsCreditSale,
			},
			{
				onSuccess: () => {
					setIsCheckoutModalOpen(false);
					clearCart();
					resetDiscount();
					resetPayments();
				},
			},
		);
	}, [
		activeShiftId,
		cart,
		createPosSaleMutation,
		isCreditSale,
		payments,
		totalAmount,
		discountInput,
		selectedCustomerId,
		clearCart,
		resetDiscount,
		resetPayments,
	]);

	// Computed values
	const totalPaid = useMemo(
		() => payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
		[payments],
	);

	const paymentDifference = totalAmount - totalPaid;
	const hasPaymentDifference = paymentDifference !== 0;
	const remainingCreditAmount = Math.max(paymentDifference, 0);
	const shouldCreateCreditBalance = isCreditSale && remainingCreditAmount > 0;

	const canFinalizeSale = useMemo(() => {
		if (!activeShiftId || cart.length === 0) return false;
		if (createPosSaleMutation.isPending) return false;
		if (paymentDifference < 0) return false;
		if (shouldCreateCreditBalance && !selectedCustomerId) return false;
		if (!shouldCreateCreditBalance && hasPaymentDifference) return false;
		return true;
	}, [
		activeShiftId,
		cart.length,
		createPosSaleMutation.isPending,
		paymentDifference,
		shouldCreateCreditBalance,
		selectedCustomerId,
		hasPaymentDifference,
	]);

	return {
		// State
		isCheckoutModalOpen,
		setIsCheckoutModalOpen,
		payments,
		isCreditSale,
		setIsCreditSale,

		// Handlers
		addPaymentMethod,
		removePaymentMethod,
		updatePayment,
		handleFinalizeSale,

		// Computed
		totalPaid,
		paymentDifference,
		hasPaymentDifference,
		remainingCreditAmount,
		shouldCreateCreditBalance,
		canFinalizeSale,
		isProcessing: createPosSaleMutation.isPending,
		error: createPosSaleMutation.error,
	};
}
