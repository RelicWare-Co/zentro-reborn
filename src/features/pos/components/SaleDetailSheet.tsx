import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
	useCancelPosSaleMutation,
	useRegisterCreditPaymentMutation,
} from "@/features/pos/hooks/usePosQueries";
import { printThermalReceipt } from "@/features/pos/printing/printThermalReceipt";
import {
	buildPaymentReceiptDocument,
	buildSaleReceiptDocument,
} from "@/features/pos/printing/receiptDocuments";
import type { CreditAccount, SaleDetail } from "@/features/pos/types";
import {
	createPaymentMethodLabelMap,
	formatCurrency,
	formatPaymentMethodLabel,
} from "@/features/pos/utils";
import {
	formatMoneyInput,
	parseMoneyInput,
	sanitizeMoneyInput,
} from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

const DEFAULT_PAYMENT_METHOD_OPTIONS = [
	{ id: "cash", label: "Efectivo" },
	{ id: "card", label: "Tarjeta" },
	{ id: "transfer_nequi", label: "Nequi" },
	{ id: "transfer_bancolombia", label: "Bancolombia" },
];

export function SaleDetailSheet({
	isOpen,
	onOpenChange,
	sale,
	isLoading,
	activeShiftId,
	creditAccount,
	paymentMethodOptions = DEFAULT_PAYMENT_METHOD_OPTIONS,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	sale: SaleDetail | null | undefined;
	isLoading: boolean;
	activeShiftId?: string;
	creditAccount?: CreditAccount | null;
	paymentMethodOptions?: Array<{ id: string; label: string }>;
}) {
	const paymentMethodLabels = useMemo(
		() => createPaymentMethodLabelMap(paymentMethodOptions),
		[paymentMethodOptions],
	);

	const handlePrintSale = useCallback(() => {
		if (!sale) {
			return;
		}

		printThermalReceipt(
			buildSaleReceiptDocument({
				...buildSaleReceiptPayload(sale),
				paymentMethodLabels,
			}),
		);
	}, [paymentMethodLabels, sale]);

	const handlePrintPayment = useCallback(
		(payment: NonNullable<SaleDetail>["payments"][number]) => {
			if (!sale) {
				return;
			}

			printThermalReceipt(
				buildPaymentReceiptDocument({
					...buildPaymentReceiptPayload({
						sale,
						payment,
					}),
					paymentMethodLabels,
				}),
			);
		},
		[paymentMethodLabels, sale],
	);
	const cancelSaleMutation = useCancelPosSaleMutation();
	const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
	const canCancelSale =
		sale?.status !== "cancelled" &&
		Boolean(activeShiftId) &&
		sale?.shift?.id === activeShiftId &&
		!cancelSaleMutation.isPending;

	const handleCancelSale = useCallback(() => {
		if (!sale || !canCancelSale) {
			return;
		}

		setIsCancelDialogOpen(true);
	}, [canCancelSale, sale]);

	const handleConfirmCancelSale = useCallback(() => {
		if (!sale || !canCancelSale) {
			return;
		}

		setIsCancelDialogOpen(false);
		cancelSaleMutation.mutate({ saleId: sale.id });
	}, [canCancelSale, cancelSaleMutation, sale]);

	useEffect(() => {
		if (!isOpen || !canCancelSale) {
			setIsCancelDialogOpen(false);
		}
	}, [canCancelSale, isOpen]);

	return (
		<>
			<Sheet open={isOpen} onOpenChange={onOpenChange}>
				<SheetContent
					className="w-full overflow-hidden border-gray-800 bg-[var(--color-carbon)] p-0 text-[var(--color-photon)] sm:max-w-xl"
					side="right"
				>
					<SheetHeader className="border-b border-gray-800 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4">
						<SheetTitle className="text-xl text-[var(--color-photon)]">
							Detalle de venta
						</SheetTitle>
						<SheetDescription className="text-pretty text-base text-gray-400">
							Revisa cliente, pagos e items registrados para esta venta.
						</SheetDescription>
					</SheetHeader>

					<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
						{isLoading ? (
							<div className="space-y-3">
								<div className="h-24 animate-pulse rounded-2xl bg-black/20" />
								<div className="h-32 animate-pulse rounded-2xl bg-black/20" />
								<div className="h-48 animate-pulse rounded-2xl bg-black/20" />
							</div>
						) : sale ? (
							<div className="space-y-3 sm:space-y-4">
								<section className="rounded-[20px] border border-gray-800 bg-black/20 p-3.5 sm:rounded-2xl sm:p-4">
									<div className="flex flex-col gap-3 sm:gap-4">
										<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0 space-y-2">
												<div className="flex flex-wrap items-center gap-2">
													<p className="text-sm text-gray-400">Venta</p>
													<Badge
														className={getSaleStatusBadgeClass(sale.status)}
													>
														{formatSaleStatus(sale.status)}
													</Badge>
												</div>
												<p className="break-words text-lg font-semibold text-white">
													#{sale.id.slice(0, 8)}
												</p>
												<p className="text-sm text-gray-400 [font-variant-numeric:tabular-nums]">
													{dateTimeFormatter.format(sale.createdAt)}
												</p>
											</div>
											<div className="grid w-full gap-2 sm:ml-auto sm:w-56">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={handlePrintSale}
													className="w-full border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
												>
													Reimprimir Factura
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={handleCancelSale}
													disabled={!canCancelSale}
													className="w-full border-rose-500/40 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100 disabled:border-gray-800 disabled:text-gray-500"
												>
													{cancelSaleMutation.isPending
														? "Anulando…"
														: "Anular Venta"}
												</Button>
											</div>
										</div>

										<div className="grid gap-0 divide-y divide-white/6 sm:grid-cols-2 sm:gap-3 sm:divide-y-0">
											<InfoBlock
												label="Cliente"
												value={sale.customer?.name ?? "Cliente mostrador"}
												description={formatCustomerMeta(sale)}
											/>
											<InfoBlock
												label="Cajero"
												value={sale.cashier?.name ?? "Sin registro"}
												description={sale.shift?.terminalName ?? "Sin terminal"}
											/>
										</div>
									</div>

									{sale.status === "cancelled" ? (
										<p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
											Venta anulada. Sus pagos se conservan solo para
											trazabilidad y ya no impactan ventas, saldo ni cuadre de
											caja.
										</p>
									) : null}
									{cancelSaleMutation.error instanceof Error ? (
										<p className="mt-3 text-sm text-red-400">
											{cancelSaleMutation.error.message}
										</p>
									) : null}
								</section>

								<section className="rounded-[20px] border border-gray-800 bg-black/20 p-3.5 sm:rounded-2xl sm:p-4">
									<div className="flex items-center justify-between">
										<h3 className="font-medium text-white">Resumen</h3>
										<p className="text-lg font-semibold text-white [font-variant-numeric:tabular-nums]">
											{formatCurrency(sale.totalAmount)}
										</p>
									</div>

									<div className="mt-4 space-y-2 text-sm">
										<SummaryRow
											label="Subtotal"
											value={formatCurrency(sale.subtotal)}
										/>
										<SummaryRow
											label="Impuestos"
											value={formatCurrency(sale.taxAmount)}
										/>
										<SummaryRow
											label="Descuentos"
											value={formatCurrency(sale.discountAmount)}
										/>
										<SummaryRow
											label="Pagado"
											value={formatCurrency(sale.paidAmount)}
										/>
										<SummaryRow
											label="Saldo pendiente"
											value={formatCurrency(sale.balanceDue)}
											emphasis={sale.balanceDue > 0}
										/>
									</div>
								</section>

								<section className="rounded-[20px] border border-gray-800 bg-black/20 p-3.5 sm:rounded-2xl sm:p-4">
									<div className="flex items-center justify-between">
										<h3 className="font-medium text-white">Pagos</h3>
										<p className="text-sm text-gray-400">
											{sale.payments.length} registro
											{sale.payments.length === 1 ? "" : "s"}
										</p>
									</div>

									{sale.payments.length > 0 ? (
										<div className="mt-4 space-y-3">
											{sale.payments.map((payment) => (
												<div
													key={payment.id}
													className="rounded-xl bg-white/[0.03] px-3 py-3 ring-1 ring-white/6 sm:px-4"
												>
													<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
														<div className="min-w-0">
															<div className="flex flex-wrap items-center gap-2">
																<p className="break-words font-medium text-white">
																	{formatPaymentMethodLabel(
																		payment.method,
																		paymentMethodLabels,
																	)}
																</p>
																<Badge
																	className={getPaymentKindBadgeClass(
																		payment.kind,
																	)}
																>
																	{formatPaymentKind(payment.kind)}
																</Badge>
															</div>
															<p className="mt-1 break-words text-sm text-gray-400">
																{payment.reference?.trim()
																	? `Ref. ${payment.reference}`
																	: "Sin referencia"}
															</p>
															{payment.notes ? (
																<p className="mt-1 break-words text-xs text-gray-500">
																	{payment.notes}
																</p>
															) : null}
														</div>
														<div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-wrap sm:justify-end">
															<p className="shrink-0 font-medium text-white [font-variant-numeric:tabular-nums]">
																{formatCurrency(payment.amount)}
															</p>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() => handlePrintPayment(payment)}
																className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
															>
																Reimprimir
															</Button>
														</div>
													</div>
												</div>
											))}
										</div>
									) : (
										<EmptyBlock className="mt-4">
											No hay pagos registrados para esta venta.
										</EmptyBlock>
									)}
								</section>

								{sale.balanceDue > 0 ? (
									<CreditPaymentSection
										key={sale.id}
										sale={sale}
										activeShiftId={activeShiftId}
										creditAccount={creditAccount}
										paymentMethodOptions={paymentMethodOptions}
										paymentMethodLabels={paymentMethodLabels}
									/>
								) : null}

								<section className="rounded-[20px] border border-gray-800 bg-black/20 p-3.5 sm:rounded-2xl sm:p-4">
									<div className="flex items-center justify-between">
										<h3 className="font-medium text-white">Items</h3>
										<p className="text-sm text-gray-400">
											{sale.items.length} linea
											{sale.items.length === 1 ? "" : "s"}
										</p>
									</div>

									<div className="mt-4 space-y-3">
										{sale.items.map((item) => (
											<div
												key={item.id}
												className="rounded-xl bg-white/[0.03] px-3 py-3 ring-1 ring-white/6 sm:px-4"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0 flex-1">
														<p className="break-words font-medium text-white">
															{item.quantity} x {item.name}
														</p>
														<p className="mt-1 text-sm text-gray-400">
															{formatCurrency(item.unitPrice)} c/u
														</p>
													</div>
													<p className="shrink-0 font-medium text-white [font-variant-numeric:tabular-nums]">
														{formatCurrency(item.totalAmount)}
													</p>
												</div>

												<div className="mt-3 space-y-1 text-sm text-gray-400 [font-variant-numeric:tabular-nums]">
													<p>Base: {formatCurrency(item.subtotal)}</p>
													{item.taxAmount > 0 ? (
														<p>
															Impuesto ({item.taxRate}%):{" "}
															{formatCurrency(item.taxAmount)}
														</p>
													) : null}
													{item.discountAmount > 0 ? (
														<p>
															Descuento: {formatCurrency(item.discountAmount)}
														</p>
													) : null}
												</div>

												{item.modifiers.length > 0 ? (
													<div className="mt-3 rounded-lg bg-black/20 p-3">
														<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
															Modificadores
														</p>
														<div className="mt-2 space-y-2">
															{item.modifiers.map((modifier) => (
																<div
																	key={modifier.id}
																	className="flex items-center justify-between gap-3 text-sm"
																>
																	<span className="min-w-0 break-words text-gray-300">
																		{modifier.quantity} x {modifier.name}
																	</span>
																	<span className="shrink-0 text-gray-400 [font-variant-numeric:tabular-nums]">
																		{formatCurrency(modifier.subtotal)}
																	</span>
																</div>
															))}
														</div>
													</div>
												) : null}
											</div>
										))}
									</div>
								</section>
							</div>
						) : (
							<EmptyBlock>
								No se pudo cargar el detalle de la venta seleccionada.
							</EmptyBlock>
						)}
					</div>
				</SheetContent>
			</Sheet>

			<AlertDialog
				open={isCancelDialogOpen}
				onOpenChange={setIsCancelDialogOpen}
			>
				<AlertDialogContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
					<AlertDialogHeader>
						<AlertDialogTitle>Anular venta</AlertDialogTitle>
						<AlertDialogDescription className="text-gray-400">
							Esta venta quedará anulada. Sus pagos dejarán de contar para caja
							y sus valores no sumarán en ventas. Esta acción no se puede
							deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							className="border-gray-700 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
							disabled={cancelSaleMutation.isPending}
						>
							Volver
						</AlertDialogCancel>
						<AlertDialogAction
							className="border-none bg-rose-500 text-white hover:bg-rose-600"
							onClick={handleConfirmCancelSale}
							disabled={!canCancelSale}
						>
							{cancelSaleMutation.isPending
								? "Anulando…"
								: "Confirmar anulación"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function CreditPaymentSection({
	sale,
	activeShiftId,
	creditAccount,
	paymentMethodOptions,
	paymentMethodLabels,
}: {
	sale: NonNullable<SaleDetail>;
	activeShiftId?: string;
	creditAccount?: CreditAccount | null;
	paymentMethodOptions: Array<{ id: string; label: string }>;
	paymentMethodLabels: Record<string, string>;
}) {
	const amountId = useId();
	const methodId = useId();
	const referenceId = useId();
	const notesId = useId();
	const registerCreditPaymentMutation = useRegisterCreditPaymentMutation();
	const defaultPaymentMethodId =
		paymentMethodOptions.find((paymentMethod) => paymentMethod.id === "cash")
			?.id ??
		paymentMethodOptions[0]?.id ??
		"cash";
	const [amount, setAmount] = useState("");
	const [method, setMethod] = useState(defaultPaymentMethodId);
	const [reference, setReference] = useState("");
	const [notes, setNotes] = useState("");

	const maxPaymentAmount = useMemo(() => {
		const saleBalance = sale.balanceDue;
		const accountBalance = creditAccount?.balance ?? saleBalance;
		return Math.max(Math.min(saleBalance, accountBalance), 0);
	}, [creditAccount?.balance, sale.balanceDue]);

	useEffect(() => {
		setAmount(maxPaymentAmount > 0 ? String(maxPaymentAmount) : "");
		setMethod(defaultPaymentMethodId);
		setReference("");
		setNotes("");
	}, [defaultPaymentMethodId, maxPaymentAmount]);

	const parsedAmount = parseMoneyInput(amount);
	const canSubmit =
		Boolean(activeShiftId) &&
		Boolean(creditAccount) &&
		parsedAmount > 0 &&
		parsedAmount <= maxPaymentAmount &&
		!registerCreditPaymentMutation.isPending;

	const handleSubmit = () => {
		if (!activeShiftId || !creditAccount || !canSubmit) {
			return;
		}

		const normalizedReference = reference.trim() || null;
		const normalizedNotes = notes.trim() || null;

		registerCreditPaymentMutation.mutate(
			{
				shiftId: activeShiftId,
				creditAccountId: creditAccount.id,
				saleId: sale.id,
				amount: parsedAmount,
				method,
				reference: normalizedReference,
				notes: normalizedNotes,
			},
			{
				onSuccess: (result) => {
					const remainingSaleBalance = Math.max(
						sale.balanceDue - parsedAmount,
						0,
					);

					printThermalReceipt(
						buildPaymentReceiptDocument({
							paymentId: result.paymentId,
							saleId: sale.id,
							issuedAt: new Date(),
							customerName: sale.customer?.name ?? "Cliente sin registrar",
							cashierName: sale.cashier?.name ?? "Sin registro",
							terminalName: sale.shift?.terminalName ?? "Sin terminal",
							method,
							amount: parsedAmount,
							reference: normalizedReference,
							notes: normalizedNotes,
							remainingSaleBalance,
							remainingAccountBalance: result.newBalance,
							title: "Comprobante de abono",
							paymentMethodLabels,
						}),
					);
				},
			},
		);
	};

	return (
		<section className="rounded-2xl border border-gray-800 bg-black/20 p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="font-medium text-white">Registrar abono</h3>
					<p className="mt-1 text-sm text-gray-400">
						Este abono se aplicará a la cuenta de crédito del cliente y a esta
						venta.
					</p>
				</div>
				<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
					Pendiente {formatCurrency(sale.balanceDue)}
				</Badge>
			</div>

			<div className="mt-4 space-y-3 text-sm">
				<SummaryRow
					label="Saldo pendiente de esta venta"
					value={formatCurrency(sale.balanceDue)}
					emphasis
				/>
				{creditAccount ? (
					<SummaryRow
						label="Saldo total en cuenta del cliente"
						value={formatCurrency(creditAccount.balance)}
					/>
				) : null}
			</div>

			{!sale.customer ? (
				<EmptyBlock className="mt-4">
					La venta no tiene un cliente asociado, por lo que no se puede
					registrar un abono desde aquí.
				</EmptyBlock>
			) : !activeShiftId ? (
				<EmptyBlock className="mt-4">
					Necesitas un turno activo para registrar abonos.
				</EmptyBlock>
			) : !creditAccount ? (
				<EmptyBlock className="mt-4">
					No se encontró la cuenta de crédito del cliente para esta venta.
				</EmptyBlock>
			) : (
				<div className="mt-4 space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm text-gray-400" htmlFor={amountId}>
								Monto a abonar
							</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
									$
								</span>
								<Input
									id={amountId}
									type="text"
									inputMode="numeric"
									value={formatMoneyInput(amount)}
									onChange={(event) =>
										setAmount(sanitizeMoneyInput(event.target.value))
									}
									className="border-gray-700 bg-[var(--color-carbon)] pl-7 text-white"
								/>
							</div>
							<p className="text-xs text-gray-500">
								Máximo aplicable a esta venta:{" "}
								{formatCurrency(maxPaymentAmount)}
							</p>
						</div>

						<div className="space-y-2">
							<label className="text-sm text-gray-400" htmlFor={methodId}>
								Método
							</label>
							<Select value={method} onValueChange={setMethod}>
								<SelectTrigger
									id={methodId}
									className="border-gray-700 bg-[var(--color-carbon)] text-white"
								>
									<SelectValue placeholder="Selecciona un método" />
								</SelectTrigger>
								<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
									{paymentMethodOptions.map((paymentMethod) => (
										<SelectItem key={paymentMethod.id} value={paymentMethod.id}>
											{paymentMethod.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm text-gray-400" htmlFor={referenceId}>
							Referencia
						</label>
						<Input
							id={referenceId}
							value={reference}
							onChange={(event) => setReference(event.target.value)}
							placeholder="Opcional: voucher, últimos 4 dígitos o comprobante…"
							className="border-gray-700 bg-[var(--color-carbon)] text-white"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm text-gray-400" htmlFor={notesId}>
							Notas
						</label>
						<Textarea
							id={notesId}
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder="Opcional: observación del abono…"
							className="min-h-[88px] border-gray-700 bg-[var(--color-carbon)] text-white"
						/>
					</div>

					{registerCreditPaymentMutation.error instanceof Error ? (
						<p className="text-sm text-red-400">
							{registerCreditPaymentMutation.error.message}
						</p>
					) : null}

					<Button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						className="w-full bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
					>
						{registerCreditPaymentMutation.isPending
							? "Registrando abono…"
							: "Registrar abono"}
					</Button>
				</div>
			)}
		</section>
	);
}

function InfoBlock({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description?: string | null;
}) {
	return (
		<div className="py-3 first:pt-0 last:pb-0 sm:rounded-xl sm:bg-white/[0.03] sm:p-4 sm:ring-1 sm:ring-white/6">
			<p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-gray-500 sm:text-xs sm:tracking-[0.18em]">
				{label}
			</p>
			<p className="mt-1.5 break-words text-[1.15rem] font-medium leading-tight text-white sm:mt-2 sm:text-base">
				{value}
			</p>
			{description ? (
				<p className="mt-1 break-words text-sm text-gray-400">{description}</p>
			) : null}
		</div>
	);
}

function SummaryRow({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="min-w-0 text-gray-400">{label}</span>
			<span
				className={
					emphasis
						? "shrink-0 font-medium text-[var(--color-voltage)] [font-variant-numeric:tabular-nums]"
						: "shrink-0 text-white [font-variant-numeric:tabular-nums]"
				}
			>
				{value}
			</span>
		</div>
	);
}

function EmptyBlock({
	children,
	className = "",
}: {
	children: string;
	className?: string;
}) {
	return (
		<div
			className={`rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500 ${className}`}
		>
			{children}
		</div>
	);
}

function formatSaleStatus(status: string) {
	if (status === "credit") {
		return "Credito";
	}

	if (status === "completed") {
		return "Pagada";
	}

	if (status === "cancelled") {
		return "Cancelada";
	}

	return status;
}

function getSaleStatusBadgeClass(status: string) {
	if (status === "credit") {
		return "border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/10";
	}

	if (status === "completed") {
		return "border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10";
	}

	if (status === "cancelled") {
		return "border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/10";
	}

	return "border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-800/80";
}

function formatPaymentKind(kind: string) {
	if (kind === "debt_payment") {
		return "Abono";
	}

	return "Pago inicial";
}

function getPaymentKindBadgeClass(kind: string) {
	if (kind === "debt_payment") {
		return "border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/10";
	}

	return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10";
}

function formatCustomerMeta(sale: NonNullable<SaleDetail>) {
	if (!sale.customer) {
		return "Sin cliente registrado";
	}

	const parts = [
		sale.customer.phone,
		sale.customer.documentType && sale.customer.documentNumber
			? `${sale.customer.documentType}: ${sale.customer.documentNumber}`
			: null,
	].filter(Boolean);

	return parts.join(" · ") || "Cliente registrado";
}

function buildSaleReceiptPayload(sale: NonNullable<SaleDetail>) {
	return {
		documentId: sale.id,
		issuedAt: sale.createdAt,
		status: sale.status,
		customerName: sale.customer?.name ?? "Cliente mostrador",
		customerMeta: formatCustomerMeta(sale),
		cashierName: sale.cashier?.name ?? "Sin registro",
		terminalName: sale.shift?.terminalName ?? "Sin terminal",
		items: sale.items.map((item) => ({
			name: item.name,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			totalAmount: item.totalAmount,
			discountAmount: item.discountAmount,
			modifiers: item.modifiers.map((modifier) => ({
				name: modifier.name,
				quantity: modifier.quantity,
				unitPrice: modifier.unitPrice,
			})),
		})),
		payments: sale.payments,
		subtotal: sale.subtotal,
		taxAmount: sale.taxAmount,
		discountAmount: sale.discountAmount,
		totalAmount: sale.totalAmount,
		paidAmount: sale.paidAmount,
		balanceDue: sale.balanceDue,
	};
}

function buildPaymentReceiptPayload({
	sale,
	payment,
}: {
	sale: NonNullable<SaleDetail>;
	payment: NonNullable<SaleDetail>["payments"][number];
}) {
	const orderedPayments = [...sale.payments].sort(
		(paymentA, paymentB) => paymentA.createdAt - paymentB.createdAt,
	);
	const paymentIndex = orderedPayments.findIndex(
		(currentPayment) => currentPayment.id === payment.id,
	);
	const paidUntilThisPayment = orderedPayments
		.slice(0, paymentIndex + 1)
		.reduce((total, currentPayment) => total + currentPayment.amount, 0);

	return {
		paymentId: payment.id,
		saleId: sale.id,
		issuedAt: payment.createdAt,
		customerName: sale.customer?.name ?? "Cliente mostrador",
		cashierName: sale.cashier?.name ?? "Sin registro",
		terminalName: sale.shift?.terminalName ?? "Sin terminal",
		method: payment.method,
		amount: payment.amount,
		reference: payment.reference,
		notes: payment.notes,
		remainingSaleBalance: Math.max(sale.totalAmount - paidUntilThisPayment, 0),
		title:
			payment.kind === "debt_payment"
				? "Comprobante de abono"
				: "Comprobante de pago",
	};
}
