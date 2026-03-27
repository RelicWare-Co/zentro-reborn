import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	CreditCard,
	LogOut,
	Package,
	Receipt,
	Store,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardOverview } from "@/features/dashboard/dashboard.functions";
import { formatPaymentMethodLabel } from "@/features/pos/utils";
import { authClient } from "@/lib/auth-client";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("es-CO");

const compactNumberFormatter = new Intl.NumberFormat("es-CO", {
	notation: "compact",
	maximumFractionDigits: 1,
});

const dayFormatter = new Intl.DateTimeFormat("es-CO", {
	weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	hour: "numeric",
	minute: "2-digit",
});

export const Route = createFileRoute("/_auth/dashboard")({
	loader: () => getDashboardOverview(),
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const data = Route.useLoaderData();
	const todayRevenueChange = getPercentChange(
		data.stats.todayRevenue,
		data.stats.yesterdayRevenue,
	);
	const monthRevenueChange = getPercentChange(
		data.stats.monthRevenue,
		data.stats.previousMonthRevenue,
	);
	const maxTrendRevenue = Math.max(
		1,
		...data.salesTrend.map((point) => point.revenue),
	);
	const weeklyRevenue = data.salesTrend.reduce(
		(total, point) => total + point.revenue,
		0,
	);
	const weeklySales = data.salesTrend.reduce(
		(total, point) => total + point.salesCount,
		0,
	);
	const hasTrendData = weeklyRevenue > 0 || weeklySales > 0;
	const bestDay =
		[...data.salesTrend].sort(
			(left, right) => right.revenue - left.revenue,
		)[0] ?? null;
	const paymentTotal = data.paymentMix.reduce(
		(total, payment) => total + payment.amount,
		0,
	);
	const primaryPaymentMethod =
		[...data.paymentMix].sort((left, right) => right.amount - left.amount)[0] ??
		null;

	return (
		<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12 font-sans">
			<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
				<div className="flex items-baseline gap-3">
					<h1 className="text-3xl font-bold tracking-tight text-white">
						Panel de control
					</h1>
					<span className="text-sm text-gray-400">Resumen operativo</span>
				</div>

				<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
					<Button
						type="button"
						variant="outline"
						onClick={async () => {
							await authClient.signOut();
							void navigate({ to: "/login" });
						}}
						className="h-10 w-full shrink-0 rounded-lg border-gray-800 bg-[var(--color-carbon)] px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white sm:w-auto"
					>
						<LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
						Cerrar sesión
					</Button>
					<Button
						asChild
						variant="outline"
						className="h-10 w-full shrink-0 rounded-lg border-gray-800 bg-[var(--color-carbon)] px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white sm:w-auto"
					>
						<Link to="/products">
							<Package className="mr-2 h-4 w-4" aria-hidden="true" />
							Ver inventario
						</Link>
					</Button>
					<Button
						asChild
						className="h-10 w-full shrink-0 rounded-lg bg-[var(--color-voltage)] px-4 py-2 font-semibold text-black hover:bg-[#c9e605] sm:w-auto"
					>
						<Link to="/pos">
							<Store className="mr-2 h-4 w-4" aria-hidden="true" />
							Ir al POS
						</Link>
					</Button>
				</div>
			</div>

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				<CompactStatCard
					title="Ventas hoy"
					value={formatCurrency(data.stats.todayRevenue)}
					description={`${formatCount(data.stats.todaySalesCount)} ventas registradas`}
					highlight={formatDelta(todayRevenueChange, "vs ayer")}
					icon={Receipt}
				/>
				<CompactStatCard
					title="Ticket promedio"
					value={formatCurrency(data.stats.todayAvgTicket)}
					description={
						data.stats.todayCustomersServed > 0
							? `${formatCount(data.stats.todayCustomersServed)} clientes identificados`
							: "Sin clientes identificados"
					}
					highlight="Basado en ventas del día"
					icon={Wallet}
				/>
				<CompactStatCard
					title="Ventas del mes"
					value={formatCurrency(data.stats.monthRevenue)}
					description={`${formatCount(data.stats.monthSalesCount)} ventas acumuladas`}
					highlight={formatDelta(monthRevenueChange, "vs mes anterior")}
					icon={TrendingUp}
				/>
				<CompactStatCard
					title="Cartera pendiente"
					value={formatCurrency(data.stats.pendingCreditBalance)}
					description={`${formatCount(data.stats.creditAccountsCount)} cuentas por cobrar`}
					highlight={
						data.stats.creditAccountsCount > 0
							? "Requiere seguimiento"
							: "Sin saldo pendiente"
					}
					icon={CreditCard}
				/>
				<CompactStatCard
					title="Inventario en riesgo"
					value={formatCount(data.stats.lowStockCount)}
					description={`${formatCount(data.stats.activeProductsCount)} productos activos`}
					highlight={`Stock <= ${data.lowStockThreshold}`}
					icon={AlertTriangle}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
				<div className="flex flex-col gap-6 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-5">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-base font-semibold text-white">
								Ventas de los ultimos 7 dias
							</h2>
							<p className="text-sm text-gray-400">
								Comportamiento reciente de ingresos y volumen de ventas.
							</p>
						</div>
						<Badge
							variant="outline"
							className="border-gray-700 bg-black/20 text-gray-300 self-start sm:self-auto"
						>
							{formatCurrency(weeklyRevenue)}
						</Badge>
					</div>

					<div className="grid gap-3 md:grid-cols-3">
						<MiniMetric
							label="Ingresos"
							value={formatCurrency(weeklyRevenue)}
							description="Ultimos 7 dias"
						/>
						<MiniMetric
							label="Ventas"
							value={formatCount(weeklySales)}
							description="Tickets registrados"
						/>
						<MiniMetric
							label="Mejor dia"
							value={
								bestDay && bestDay.revenue > 0
									? formatShortDay(bestDay.dateKey)
									: "Sin ventas"
							}
							description={
								bestDay && bestDay.revenue > 0
									? formatCurrency(bestDay.revenue)
									: "Aun no hay historial"
							}
						/>
					</div>

					{hasTrendData ? (
						<div className="grid h-48 grid-cols-7 gap-2 sm:gap-3">
							{data.salesTrend.map((point) => {
								const barHeight = Math.max(
									point.revenue > 0 ? 12 : 4,
									(point.revenue / maxTrendRevenue) * 100,
								);

								return (
									<div
										key={point.dateKey}
										className="flex h-full min-w-0 flex-col justify-end"
									>
										<div className="mb-2 text-center text-[10px] sm:text-[11px] text-gray-500">
											{formatCompactCurrency(point.revenue)}
										</div>
										<div className="flex h-28 items-end border-b border-gray-800/80 px-1">
											<div
												className={
													point.revenue > 0
														? "w-full rounded-t-lg bg-gradient-to-t from-[var(--color-voltage)] to-[#f1ff87] shadow-[0_0_20px_rgba(201,230,5,0.12)] transition-all"
														: "w-full rounded-full bg-gray-800 transition-all"
												}
												style={{ height: `${barHeight}%` }}
											/>
										</div>
										<div className="mt-3 text-center">
											<div className="text-xs font-medium text-gray-300">
												{formatShortDay(point.dateKey)}
											</div>
											<div className="mt-1 hidden text-[10px] text-gray-500 sm:block">
												{formatCount(point.salesCount)} ventas
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<EmptyState>
							No hay ventas en los ultimos 7 dias para mostrar el grafico.
						</EmptyState>
					)}
				</div>

				<div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-5">
					<div>
						<h2 className="text-base font-semibold text-white">
							Operacion actual
						</h2>
						<p className="text-sm text-gray-400">
							Estado del turno y distribucion de cobros de hoy.
						</p>
					</div>

					<div className="rounded-xl border border-gray-800 bg-black/20 p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-sm font-medium text-white">Turno</p>
								<p className="mt-1 text-sm text-gray-400">
									{data.activeShift
										? `Abierto en ${data.activeShift.terminalName ?? "caja principal"}`
										: "No hay un turno abierto para este usuario"}
								</p>
							</div>
							<Badge
								className={
									data.activeShift
										? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 border-0"
										: "border-gray-700 bg-gray-800/80 text-gray-300 border-0"
								}
							>
								{data.activeShift ? "Activo" : "Pendiente"}
							</Badge>
						</div>

						{data.activeShift ? (
							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								<MiniMetric
									label="Abierto desde"
									value={dateTimeFormatter.format(data.activeShift.openedAt)}
									description="Hora local"
								/>
								<MiniMetric
									label="Base inicial"
									value={formatCurrency(data.activeShift.startingCash)}
									description="Efectivo de apertura"
								/>
							</div>
						) : (
							<Button
								asChild
								variant="outline"
								className="mt-4 w-full rounded-lg border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white h-9"
							>
								<Link to="/pos">
									Abrir caja en POS
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
						)}
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-white">Cobros hoy</p>
							<p className="text-sm text-gray-400">
								{formatCurrency(paymentTotal)}
							</p>
						</div>

						{data.paymentMix.length > 0 ? (
							<div className="space-y-3">
								{data.paymentMix.map((paymentMethod) => {
									const width =
										paymentTotal > 0
											? (paymentMethod.amount / paymentTotal) * 100
											: 0;

									return (
										<div key={paymentMethod.method} className="space-y-1.5">
											<div className="flex items-center justify-between text-sm">
												<span className="text-gray-300">
													{formatPaymentMethod(
														paymentMethod.method,
														data.paymentMethodLabels,
													)}
												</span>
												<span className="text-gray-400">
													{formatCurrency(paymentMethod.amount)}
												</span>
											</div>
											<div className="h-2 rounded-full bg-black/20 overflow-hidden">
												<div
													className="h-2 rounded-full bg-[var(--color-voltage)] transition-all"
													style={{ width: `${Math.max(width, 4)}%` }}
												/>
											</div>
										</div>
									);
								})}
								<p className="text-[11px] text-gray-500">
									Medio principal:{" "}
									{primaryPaymentMethod
										? formatPaymentMethod(
												primaryPaymentMethod.method,
												data.paymentMethodLabels,
											)
										: "Sin registros"}
								</p>
							</div>
						) : (
							<div className="rounded-xl border border-dashed border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
								Aun no hay cobros registrados hoy.
							</div>
						)}
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<MiniMetric
							label="Clientes activos"
							value={formatCount(data.stats.activeCustomersCount)}
							description="Base disponible"
						/>
						<MiniMetric
							label="Productos activos"
							value={formatCount(data.stats.activeProductsCount)}
							description="Catalogo habilitado"
						/>
					</div>

					<Button
						asChild
						variant="outline"
						className="w-full rounded-lg border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white h-10"
					>
						<Link to="/shifts">
							Ver turnos y cierres
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-2">
				<div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-5">
					<div>
						<h2 className="text-base font-semibold text-white">
							Productos más vendidos
						</h2>
						<p className="text-sm text-gray-400">
							Top de los ultimos 30 dias para vigilar rotacion y stock.
						</p>
					</div>
					<div>
						{data.topProducts.length > 0 ? (
							<div className="space-y-3">
								{data.topProducts.map((productItem, index) => (
									<div
										key={productItem.productId}
										className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/10 hover:bg-white/5 transition-colors px-4 py-3"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2 mb-0.5">
												<p className="text-xs font-semibold text-[var(--color-voltage)]">
													#{index + 1}
												</p>
												<p className="truncate font-medium text-white">
													{productItem.name}
												</p>
											</div>
											<p className="text-xs text-gray-400">
												{formatCount(productItem.quantitySold)} uds. vendidas
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-medium text-white">
												{formatCurrency(productItem.revenue)}
											</p>
											<p className="text-xs text-gray-500">
												Stock: {formatCount(productItem.stock)}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<EmptyState>
								Aun no hay ventas suficientes para construir el ranking.
							</EmptyState>
						)}
					</div>
				</div>

				<div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-5">
					<div>
						<h2 className="text-base font-semibold text-white">
							Alertas operativas
						</h2>
						<p className="text-sm text-gray-400">
							Señales clave para actuar antes de que afecten la operacion.
						</p>
					</div>
					<div className="space-y-4">
						<div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-amber-200">
										Inventario bajo
									</p>
									<p className="mt-1 text-xs text-amber-200/70">
										{formatCount(data.stats.lowStockCount)} productos con stock
										en riesgo.
									</p>
								</div>
								<AlertTriangle className="h-5 w-5 text-amber-400" />
							</div>
						</div>

						<div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-sky-200">
										Cartera pendiente
									</p>
									<p className="mt-1 text-xs text-sky-200/70">
										{formatCurrency(data.stats.pendingCreditBalance)} por cobrar
										en {formatCount(data.stats.creditAccountsCount)} cuentas.
									</p>
								</div>
								<CreditCard className="h-5 w-5 text-sky-400" />
							</div>
						</div>

						{data.lowStockProducts.length > 0 ? (
							<div className="space-y-3 pt-2">
								{data.lowStockProducts.map((productItem) => (
									<div
										key={productItem.id}
										className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/10 hover:bg-white/5 transition-colors px-4 py-3"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-white">
												{productItem.name}
											</p>
											<p className="text-xs text-gray-500">
												{productItem.categoryName ?? "Sin categoria"}
											</p>
										</div>
										<Badge className="border-0 bg-amber-500/10 text-amber-300">
											Stock {formatCount(productItem.stock)}
										</Badge>
									</div>
								))}
							</div>
						) : (
							<EmptyState>No hay productos con stock comprometido.</EmptyState>
						)}
					</div>
				</div>
			</section>

			<section>
				<div className="flex flex-col gap-5 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-5">
					<div>
						<h2 className="text-base font-semibold text-white">
							Ventas recientes
						</h2>
						<p className="text-sm text-gray-400">
							Actividad mas reciente para validar montos, tiempos y tipo de
							venta.
						</p>
					</div>
					<div>
						{data.recentSales.length > 0 ? (
							<div className="space-y-3">
								{data.recentSales.map((recentSale) => (
									<div
										key={recentSale.id}
										className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-black/10 hover:bg-white/5 transition-colors px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<p className="truncate text-sm font-medium text-white">
													{recentSale.customerName ?? "Cliente mostrador"}
												</p>
												<Badge
													className={`${getSaleStatusBadgeClass(recentSale.status)} border-0 px-2 py-0.5 text-[10px]`}
												>
													{formatSaleStatus(recentSale.status)}
												</Badge>
											</div>
											<p className="mt-1 text-[11px] text-gray-500">
												{dateTimeFormatter.format(recentSale.createdAt)}
											</p>
										</div>
										<p className="text-sm font-semibold text-[var(--color-voltage)]">
											{formatCurrency(recentSale.totalAmount)}
										</p>
									</div>
								))}
							</div>
						) : (
							<EmptyState>No se han registrado ventas todavia.</EmptyState>
						)}
					</div>
				</div>
			</section>
		</main>
	);
}

function CompactStatCard({
	title,
	value,
	description,
	highlight,
	icon: Icon,
}: {
	title: string;
	value: string;
	description?: string;
	highlight?: string;
	icon: typeof Receipt;
}) {
	return (
		<div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-800 bg-[var(--color-carbon)] p-4">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]">
					<Icon className="h-5 w-5" aria-hidden="true" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[11px] font-medium uppercase tracking-wider text-gray-500">
						{title}
					</p>
					<p className="truncate text-lg font-semibold tabular-nums text-white mt-0.5">
						{value}
					</p>
				</div>
			</div>
			{(description || highlight) && (
				<div className="text-[11px]">
					{description && (
						<p className="text-gray-400 truncate">{description}</p>
					)}
					{highlight && (
						<p className="text-gray-500 truncate mt-0.5">{highlight}</p>
					)}
				</div>
			)}
		</div>
	);
}

function MiniMetric({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
			<p className="text-sm text-gray-400">{label}</p>
			<p className="mt-2 text-lg font-semibold text-white">{value}</p>
			<p className="mt-1 text-xs text-gray-500">{description}</p>
		</div>
	);
}

function EmptyState({ children }: { children: string }) {
	return (
		<div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
			{children}
		</div>
	);
}

function getPercentChange(current: number, previous: number) {
	if (previous === 0) {
		return current === 0 ? 0 : null;
	}

	return ((current - previous) / previous) * 100;
}

function formatDelta(value: number | null, suffix: string) {
	if (value === null) {
		return `Sin base ${suffix}`;
	}

	const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
	return `${value > 0 ? "+" : ""}${rounded}% ${suffix}`;
}

function formatCurrency(value: number) {
	return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
	return `$${compactNumberFormatter.format(value)}`;
}

function formatCount(value: number) {
	return countFormatter.format(value);
}

function formatShortDay(dateKey: string) {
	return dayFormatter
		.format(new Date(`${dateKey}T12:00:00`))
		.replace(".", "")
		.toUpperCase();
}

function formatPaymentMethod(
	method: string,
	paymentMethodLabels?: Record<string, string>,
) {
	return formatPaymentMethodLabel(method, paymentMethodLabels);
}

function formatSaleStatus(status: string) {
	if (status === "credit") {
		return "Credito";
	}

	if (status === "completed") {
		return "Pagada";
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
