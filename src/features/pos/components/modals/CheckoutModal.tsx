import { Plus, XIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CreditAccount, PaymentMethod } from "../../types";
import { formatCurrency } from "../../utils";

interface CheckoutModalProps {
	isOpen: boolean;
	onClose: () => void;
	totalAmount: number;
	discountInput: string;
	setDiscountInput: (value: string) => void;
	payments: PaymentMethod[];
	isCreditSale: boolean;
	setIsCreditSale: (value: boolean) => void;
	selectedCustomerId: string;
	selectedCustomerCreditAccount: CreditAccount | null;
	projectedCreditBalance: number;
	remainingCreditAmount: number;
	shouldCreateCreditBalance: boolean;
	canFinalize: boolean;
	isProcessing: boolean;
	paymentDifference: number;
	hasPaymentDifference: boolean;
	error: Error | null;
	onAddPaymentMethod: () => void;
	onRemovePaymentMethod: (index: number) => void;
	onUpdatePayment: (
		index: number,
		field: "method" | "amount" | "reference",
		value: string,
	) => void;
	onConfirm: () => void;
}

export function CheckoutModal({
	isOpen,
	onClose,
	totalAmount,
	discountInput,
	setDiscountInput,
	payments,
	isCreditSale,
	setIsCreditSale,
	selectedCustomerId,
	selectedCustomerCreditAccount,
	projectedCreditBalance,
	remainingCreditAmount,
	shouldCreateCreditBalance,
	canFinalize,
	isProcessing,
	paymentDifference,
	error,
	onAddPaymentMethod,
	onRemovePaymentMethod,
	onUpdatePayment,
	onConfirm,
}: CheckoutModalProps) {
	const discountInputId = useId();
	const creditSaleId = useId();

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-[#151515] border-gray-800 text-white sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="text-xl">Cobrar Orden</DialogTitle>
				</DialogHeader>

				<div className="py-4 space-y-6">
					<div className="flex justify-between items-center bg-[#0a0a0a] p-4 rounded-lg border border-gray-800">
						<span className="text-gray-400 font-medium">Total a Pagar</span>
						<span className="text-3xl font-bold text-[var(--color-voltage)]">
							{formatCurrency(totalAmount)}
						</span>
					</div>

					<div className="space-y-4">
						<div className="bg-[#0a0a0a] p-3 rounded-lg border border-gray-800 space-y-2">
							<label
								className="text-sm font-medium text-gray-300"
								htmlFor={discountInputId}
							>
								Descuento total
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									id={discountInputId}
									type="number"
									min={0}
									value={discountInput}
									onChange={(event) => setDiscountInput(event.target.value)}
									className="pl-7 h-10 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)]"
								/>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<h4 className="text-sm font-semibold text-gray-300">
								Métodos de Pago
							</h4>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id={creditSaleId}
									checked={isCreditSale}
									onChange={(e) => setIsCreditSale(e.target.checked)}
									className="w-4 h-4 rounded border-gray-700 bg-[#0a0a0a] text-[var(--color-voltage)] focus:ring-[var(--color-voltage)]"
								/>
								<label
									htmlFor={creditSaleId}
									className="text-sm text-gray-400 cursor-pointer"
								>
									Dejar saldo a crédito
								</label>
							</div>
						</div>

						{shouldCreateCreditBalance && !selectedCustomerId && (
							<p className="text-sm text-amber-400">
								Selecciona un cliente para registrar venta a crédito.
							</p>
						)}

						{shouldCreateCreditBalance &&
							selectedCustomerId &&
							!selectedCustomerCreditAccount && (
							<p className="text-sm text-amber-300">
								Se creará la cuenta de crédito del cliente con el saldo pendiente de esta
								venta.
							</p>
							)}

						{isCreditSale && (
							<p className="text-sm text-gray-400">
								{shouldCreateCreditBalance
									? "Puedes registrar un abono inicial ahora y el restante quedará pendiente en la cuenta del cliente."
									: "Con los descuentos y pagos actuales no quedará saldo pendiente, así que la venta se registrará como pagada."}
							</p>
						)}

						{selectedCustomerCreditAccount && (
							<div className="bg-amber-900/20 border border-amber-900/40 rounded-lg p-3 space-y-1 text-sm">
								<p className="text-amber-300 font-medium">
									Saldo pendiente actual:{" "}
									{formatCurrency(selectedCustomerCreditAccount.balance)}
								</p>
								{isCreditSale && (
									<>
										<p className="text-amber-200">
											{shouldCreateCreditBalance
												? "Saldo que quedará pendiente por esta venta: "
												: "Saldo pendiente por esta venta: "}
											{formatCurrency(remainingCreditAmount)}
										</p>
										{shouldCreateCreditBalance ? (
											<p className="text-amber-200">
												Saldo proyectado total tras esta venta:{" "}
												{formatCurrency(projectedCreditBalance)}
											</p>
										) : null}
									</>
								)}
							</div>
						)}

						<div className="space-y-3">
							{payments.map((payment, index) => (
								<div
									key={payment.id}
									className="flex flex-col gap-2 p-3 bg-[#0a0a0a] rounded-lg border border-gray-800 relative group"
								>
									{payments.length > 1 && (
										<button
											type="button"
											onClick={() => onRemovePaymentMethod(index)}
											className="absolute -top-2 -right-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
											aria-label="Eliminar método de pago"
										>
											<XIcon className="w-3 h-3" />
										</button>
									)}

									<div className="flex gap-2">
										<Select
											value={payment.method}
											onValueChange={(value) =>
												onUpdatePayment(index, "method", value)
											}
										>
											<SelectTrigger className="flex-1 h-10 rounded-md border border-gray-700 bg-[#151515] px-3 text-sm text-white focus:outline-none focus:border-[var(--color-voltage)] focus:ring-0">
												<SelectValue placeholder="Método" />
											</SelectTrigger>
											<SelectContent className="bg-[#151515] border-gray-700 text-white">
												<SelectItem value="cash">Efectivo</SelectItem>
												<SelectItem value="card">Tarjeta</SelectItem>
												<SelectItem value="transfer_nequi">Nequi</SelectItem>
												<SelectItem value="transfer_bancolombia">
													Bancolombia
												</SelectItem>
											</SelectContent>
										</Select>

										<div className="relative flex-1">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
												$
											</span>
											<Input
												type="number"
												placeholder="Monto"
												value={payment.amount}
												onChange={(e) =>
													onUpdatePayment(index, "amount", e.target.value)
												}
												className="pl-7 h-10 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)]"
											/>
										</div>
									</div>

									{payment.method !== "cash" && (
										<Input
											placeholder="Referencia (Ej. últimos 4 dígitos o voucher)"
											value={payment.reference}
											onChange={(e) =>
												onUpdatePayment(index, "reference", e.target.value)
											}
											className="h-9 bg-[#151515] border-gray-700 focus-visible:ring-0 focus-visible:border-[var(--color-voltage)] text-sm"
										/>
									)}
								</div>
							))}

							<Button
								variant="outline"
								onClick={onAddPaymentMethod}
								className="w-full h-9 border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent"
							>
								<Plus className="w-4 h-4 mr-2" />
								Dividir Pago (Otro método)
							</Button>
						</div>
					</div>

					<div className="flex justify-between items-center text-sm pt-2 border-t border-gray-800">
						<span className="text-gray-400">
							{isCreditSale
								? shouldCreateCreditBalance
									? "Saldo que quedará a crédito:"
									: "Saldo que quedará a crédito:"
								: "Diferencia de pago:"}
						</span>
						<span
							className={`font-semibold ${
								isCreditSale
									? shouldCreateCreditBalance
										? "text-[var(--color-voltage)]"
										: "text-green-400"
									: paymentDifference === 0
										? "text-green-400"
										: paymentDifference > 0
											? "text-red-400"
											: "text-amber-400"
							}`}
						>
							{formatCurrency(Math.abs(paymentDifference))}
						</span>
					</div>

					{error instanceof Error && (
						<p className="text-sm text-red-400">{error.message}</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={onClose}
						className="text-gray-400 hover:text-white"
					>
						Cancelar
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!canFinalize || isProcessing}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
					>
						{isProcessing
							? "Procesando..."
							: shouldCreateCreditBalance
								? "Registrar Venta con Saldo"
								: "Finalizar Venta"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
