import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { SaleDetail } from "@/features/pos/types";
import { formatCurrency, formatPaymentMethodLabel } from "@/features/pos/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

export function SaleDetailSheet({
	isOpen,
	onOpenChange,
	sale,
	isLoading,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	sale: SaleDetail | null | undefined;
	isLoading: boolean;
}) {
	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				className="w-full border-gray-800 bg-[var(--color-carbon)] p-0 text-[var(--color-photon)] sm:max-w-xl"
				side="right"
			>
				<SheetHeader className="border-b border-gray-800">
					<SheetTitle className="text-[var(--color-photon)]">
						Detalle de venta
					</SheetTitle>
					<SheetDescription className="text-gray-400">
						Revisa cliente, pagos e items registrados para esta venta.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-4">
					{isLoading ? (
						<div className="space-y-3">
							<div className="h-24 animate-pulse rounded-2xl bg-black/20" />
							<div className="h-32 animate-pulse rounded-2xl bg-black/20" />
							<div className="h-48 animate-pulse rounded-2xl bg-black/20" />
						</div>
					) : sale ? (
						<div className="space-y-4">
							<section className="rounded-2xl border border-gray-800 bg-black/20 p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm text-gray-400">Venta</p>
										<p className="mt-1 font-medium text-white">#{sale.id.slice(0, 8)}</p>
										<p className="mt-2 text-sm text-gray-400">
											{dateTimeFormatter.format(sale.createdAt)}
										</p>
									</div>
									<Badge className={getSaleStatusBadgeClass(sale.status)}>
										{formatSaleStatus(sale.status)}
									</Badge>
								</div>

								<div className="mt-4 grid gap-3 sm:grid-cols-2">
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
							</section>

							<section className="rounded-2xl border border-gray-800 bg-black/20 p-4">
								<div className="flex items-center justify-between">
									<h3 className="font-medium text-white">Resumen</h3>
									<p className="text-lg font-semibold text-white">
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

							<section className="rounded-2xl border border-gray-800 bg-black/20 p-4">
								<div className="flex items-center justify-between">
									<h3 className="font-medium text-white">Pagos</h3>
									<p className="text-sm text-gray-400">
										{sale.payments.length} registro{sale.payments.length === 1 ? "" : "s"}
									</p>
								</div>

								{sale.payments.length > 0 ? (
									<div className="mt-4 space-y-3">
										{sale.payments.map((payment) => (
											<div
												key={payment.id}
												className="rounded-2xl border border-gray-800 bg-[var(--color-carbon)] px-4 py-3"
											>
												<div className="flex items-center justify-between gap-3">
													<div>
														<p className="font-medium text-white">
															{formatPaymentMethodLabel(payment.method)}
														</p>
														<p className="text-sm text-gray-400">
															{payment.reference?.trim()
																? `Ref. ${payment.reference}`
																: "Sin referencia"}
														</p>
													</div>
													<p className="font-medium text-white">
														{formatCurrency(payment.amount)}
													</p>
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

							<section className="rounded-2xl border border-gray-800 bg-black/20 p-4">
								<div className="flex items-center justify-between">
									<h3 className="font-medium text-white">Items</h3>
									<p className="text-sm text-gray-400">
										{sale.items.length} linea{sale.items.length === 1 ? "" : "s"}
									</p>
								</div>

								<div className="mt-4 space-y-3">
									{sale.items.map((item) => (
										<div
											key={item.id}
											className="rounded-2xl border border-gray-800 bg-[var(--color-carbon)] px-4 py-3"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="font-medium text-white">
														{item.quantity} x {item.name}
													</p>
													<p className="mt-1 text-sm text-gray-400">
														{formatCurrency(item.unitPrice)} c/u
													</p>
												</div>
												<p className="font-medium text-white">
													{formatCurrency(item.totalAmount)}
												</p>
											</div>

											<div className="mt-3 space-y-1 text-sm text-gray-400">
												<p>Base: {formatCurrency(item.subtotal)}</p>
												{item.taxAmount > 0 ? (
													<p>
														Impuesto ({item.taxRate}%): {formatCurrency(item.taxAmount)}
													</p>
												) : null}
												{item.discountAmount > 0 ? (
													<p>Descuento: {formatCurrency(item.discountAmount)}</p>
												) : null}
											</div>

											{item.modifiers.length > 0 ? (
												<div className="mt-3 rounded-xl border border-gray-800 bg-black/20 p-3">
													<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
														Modificadores
													</p>
													<div className="mt-2 space-y-2">
														{item.modifiers.map((modifier) => (
															<div
																key={modifier.id}
																className="flex items-center justify-between gap-3 text-sm"
															>
																<span className="text-gray-300">
																	{modifier.quantity} x {modifier.name}
																</span>
																<span className="text-gray-400">
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
		<div className="rounded-2xl border border-gray-800 bg-[var(--color-carbon)] p-4">
			<p className="text-sm text-gray-400">{label}</p>
			<p className="mt-2 font-medium text-white">{value}</p>
			{description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
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
			<span className="text-gray-400">{label}</span>
			<span className={emphasis ? "font-medium text-[var(--color-voltage)]" : "text-white"}>
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
