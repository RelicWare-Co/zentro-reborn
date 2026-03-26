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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
		<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12">
			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
						Resumen operativo
					</Badge>
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">
							Panel de control
						</h1>
						<p className="max-w-2xl text-sm text-gray-400 md:text-base">
							Ventas, clientes, crédito e inventario en una sola vista para
							tomar decisiones rápidas durante el día.
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						asChild
						className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
					>
						<Link to="/pos">
							<Store className="h-4 w-4" />
							Ir al POS
						</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						className="border-gray-700 bg-[var(--color-carbon)] text-gray-200 hover:bg-white/5 hover:text-white"
					>
						<Link to="/products">
							<Package className="h-4 w-4" />
							Ver inventario
						</Link>
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={async () => {
							await authClient.signOut();
							void navigate({ to: "/login" });
						}}
						className="border-gray-700 bg-[var(--color-carbon)] text-gray-200 hover:bg-white/5 hover:text-white"
					>
						<LogOut className="h-4 w-4" />
						Cerrar sesión
					</Button>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<StatCard
					title="Ventas hoy"
					value={formatCurrency(data.stats.todayRevenue)}
					description={`${formatCount(data.stats.todaySalesCount)} ventas registradas`}
					highlight={formatDelta(todayRevenueChange, "vs ayer")}
					icon={Receipt}
				/>
				<StatCard
					title="Ticket promedio"
					value={formatCurrency(data.stats.todayAvgTicket)}
					description={
						data.stats.todayCustomersServed > 0
							? `${formatCount(data.stats.todayCustomersServed)} clientes identificados atendidos`
							: "Sin clientes identificados en ventas de hoy"
					}
					highlight="Basado en ventas del día"
					icon={Wallet}
				/>
				<StatCard
					title="Ventas del mes"
					value={formatCurrency(data.stats.monthRevenue)}
					description={`${formatCount(data.stats.monthSalesCount)} ventas acumuladas`}
					highlight={formatDelta(monthRevenueChange, "vs mes anterior")}
					icon={TrendingUp}
				/>
				<StatCard
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
				<StatCard
					title="Inventario en riesgo"
					value={formatCount(data.stats.lowStockCount)}
					description={`${formatCount(data.stats.activeProductsCount)} productos activos`}
					highlight={`Stock <= ${data.lowStockThreshold}`}
					icon={AlertTriangle}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader className="space-y-2">
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardTitle>Ventas de los ultimos 7 dias</CardTitle>
								<CardDescription className="text-gray-400">
									Comportamiento reciente de ingresos y volumen de ventas.
								</CardDescription>
							</div>
							<Badge
								variant="outline"
								className="border-gray-700 bg-black/20 text-gray-300"
							>
								{formatCurrency(weeklyRevenue)}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
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
							<div className="grid h-52 grid-cols-7 gap-3">
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
											<div className="mb-2 text-center text-[11px] text-gray-500">
												{formatCompactCurrency(point.revenue)}
											</div>
											<div className="flex h-32 items-end border-b border-gray-800/80 px-1">
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
												<div className="mt-1 text-[11px] text-gray-500">
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
					</CardContent>
				</Card>

				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Operacion actual</CardTitle>
						<CardDescription className="text-gray-400">
							Estado del turno y distribucion de cobros de hoy.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
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
											? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
											: "border-gray-700 bg-gray-800/80 text-gray-300"
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
									className="mt-4 w-full border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
								>
									<Link to="/pos">
										Abrir caja en POS
										<ArrowRight className="h-4 w-4" />
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
												<div className="h-2 rounded-full bg-black/20">
													<div
														className="h-2 rounded-full bg-[var(--color-voltage)]"
														style={{ width: `${Math.max(width, 4)}%` }}
													/>
												</div>
											</div>
										);
									})}
									<p className="text-xs text-gray-500">
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
								<div className="rounded-2xl border border-dashed border-gray-800 px-4 py-6 text-sm text-gray-500">
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
							className="w-full border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
						>
							<Link to="/shifts">
								Ver turnos y cierres
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 xl:grid-cols-2">
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Productos más vendidos</CardTitle>
						<CardDescription className="text-gray-400">
							Top de los ultimos 30 dias para vigilar rotacion y stock.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{data.topProducts.length > 0 ? (
							<div className="space-y-3">
								{data.topProducts.map((productItem, index) => (
									<div
										key={productItem.productId}
										className="flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-black/20 px-4 py-3"
									>
										<div className="min-w-0">
											<p className="text-xs font-medium text-[var(--color-voltage)]">
												#{index + 1}
											</p>
											<p className="truncate font-medium text-white">
												{productItem.name}
											</p>
											<p className="text-sm text-gray-400">
												{formatCount(productItem.quantitySold)} uds. vendidas
											</p>
										</div>
										<div className="text-right">
											<p className="font-medium text-white">
												{formatCurrency(productItem.revenue)}
											</p>
											<p className="text-sm text-gray-400">
												Stock actual: {formatCount(productItem.stock)}
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
					</CardContent>
				</Card>

				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Alertas operativas</CardTitle>
						<CardDescription className="text-gray-400">
							Señales clave para actuar antes de que afecten la operacion.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-amber-100">
										Inventario bajo
									</p>
									<p className="mt-1 text-sm text-amber-200/80">
										{formatCount(data.stats.lowStockCount)} productos con stock
										en riesgo.
									</p>
								</div>
								<AlertTriangle className="h-5 w-5 text-amber-300" />
							</div>
						</div>

						<div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-sky-100">
										Cartera pendiente
									</p>
									<p className="mt-1 text-sm text-sky-200/80">
										{formatCurrency(data.stats.pendingCreditBalance)} por cobrar
										en {formatCount(data.stats.creditAccountsCount)} cuentas.
									</p>
								</div>
								<CreditCard className="h-5 w-5 text-sky-300" />
							</div>
						</div>

						{data.lowStockProducts.length > 0 ? (
							<div className="space-y-3">
								{data.lowStockProducts.map((productItem) => (
									<div
										key={productItem.id}
										className="flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-black/20 px-4 py-3"
									>
										<div className="min-w-0">
											<p className="truncate font-medium text-white">
												{productItem.name}
											</p>
											<p className="text-sm text-gray-400">
												{productItem.categoryName ?? "Sin categoria"}
											</p>
										</div>
										<Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/10">
											Stock {formatCount(productItem.stock)}
										</Badge>
									</div>
								))}
							</div>
						) : (
							<EmptyState>No hay productos con stock comprometido.</EmptyState>
						)}
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Ventas recientes</CardTitle>
						<CardDescription className="text-gray-400">
							Actividad mas reciente para validar montos, tiempos y tipo de
							venta.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{data.recentSales.length > 0 ? (
							<div className="space-y-3">
								{data.recentSales.map((recentSale) => (
									<div
										key={recentSale.id}
										className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<p className="truncate font-medium text-white">
													{recentSale.customerName ?? "Cliente mostrador"}
												</p>
												<Badge
													className={getSaleStatusBadgeClass(recentSale.status)}
												>
													{formatSaleStatus(recentSale.status)}
												</Badge>
											</div>
											<p className="mt-1 text-sm text-gray-400">
												{dateTimeFormatter.format(recentSale.createdAt)}
											</p>
										</div>
										<p className="text-lg font-semibold text-white">
											{formatCurrency(recentSale.totalAmount)}
										</p>
									</div>
								))}
							</div>
						) : (
							<EmptyState>No se han registrado ventas todavia.</EmptyState>
						)}
					</CardContent>
				</Card>
			</section>
		</main>
	);
}

function StatCard({
	title,
	value,
	description,
	highlight,
	icon: Icon,
}: {
	title: string;
	value: string;
	description: string;
	highlight: string;
	icon: typeof Receipt;
}) {
	return (
		<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
			<CardHeader className="space-y-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]">
						<Icon className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<CardDescription className="text-gray-400">{title}</CardDescription>
						<CardTitle className="mt-1 text-2xl font-semibold tracking-tight text-white">
							{value}
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<p className="break-words text-sm leading-6 text-gray-400">
					{description}
				</p>
				<p className="mt-2 break-words text-xs leading-5 text-gray-500">
					{highlight}
				</p>
			</CardContent>
		</Card>
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
