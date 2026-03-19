import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	CalendarDays,
	Clock3,
	Filter,
	History,
	Receipt,
	Search,
	Store,
	UserRound,
	Wallet,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SaleDetailSheet } from "@/features/pos/components/SaleDetailSheet";
import {
	useCreditAccounts,
	usePosBootstrap,
	useSaleDetail,
	useSalesList,
} from "@/features/pos/hooks/usePosQueries";
import { listSales } from "@/features/pos/pos.functions";
import type { SaleListItem } from "@/features/pos/types";
import { formatCurrency, formatPaymentMethodLabel } from "@/features/pos/utils";

const DEFAULT_LIST_PARAMS = {
	limit: 10,
	cursor: 0,
};

const ALL_FILTER_VALUE = "all";
const SALES_VIEW_VALUES = ["today", "history"] as const;
const DEFAULT_SALES_VIEW = "today" as const;
const SALE_STATUS_VALUES = ["completed", "credit", "cancelled"] as const;
const SALE_PAYMENT_METHOD_VALUES = [
	"cash",
	"card",
	"transfer_nequi",
	"transfer_bancolombia",
] as const;

type SalesView = (typeof SALES_VIEW_VALUES)[number];

const salesSearchSchema = z.object({
	view: z.enum(SALES_VIEW_VALUES).optional(),
	q: z.string().optional(),
	status: z.enum(["completed", "credit", "cancelled"]).optional(),
	paymentMethod: z
		.enum(["cash", "card", "transfer_nequi", "transfer_bancolombia"])
		.optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	cursor: z.coerce.number().int().min(0).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	hour: "numeric",
	minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "long",
});

export const Route = createFileRoute("/_auth/sales")({
	validateSearch: salesSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => {
		const todayDate = getCurrentDateFilterValue();
		const resolvedDateFilters = resolveSalesDateFilters(
			deps.view,
			deps.startDate,
			deps.endDate,
			todayDate,
		);

		return listSales({
			data: {
				limit: deps.pageSize ?? DEFAULT_LIST_PARAMS.limit,
				cursor: deps.cursor ?? DEFAULT_LIST_PARAMS.cursor,
				searchQuery: deps.q ?? null,
				status: deps.status ?? null,
				paymentMethod: deps.paymentMethod ?? null,
				startDate: resolvedDateFilters.startDate,
				endDate: resolvedDateFilters.endDate,
			},
		});
	},
	component: SalesPage,
});

function SalesPage() {
	const salesSearchId = useId();
	const salesStatusId = useId();
	const salesPaymentMethodId = useId();
	const salesStartDateId = useId();
	const salesEndDateId = useId();
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const initialSales = Route.useLoaderData();
	const [isViewPending, startViewTransition] = useTransition();
	const { data: posBootstrap } = usePosBootstrap();
	const { data: creditAccountsSearchResult } = useCreditAccounts();
	const activeView = normalizeSalesView(search.view);
	const isTodayView = activeView === "today";
	const todayDate = getCurrentDateFilterValue();
	const resolvedDateFilters = resolveSalesDateFilters(
		activeView,
		search.startDate,
		search.endDate,
		todayDate,
	);
	const salesQuery = useSalesList(
		{
			limit: search.pageSize ?? DEFAULT_LIST_PARAMS.limit,
			cursor: search.cursor ?? DEFAULT_LIST_PARAMS.cursor,
			searchQuery: search.q ?? null,
			status: search.status ?? null,
			paymentMethod: search.paymentMethod ?? null,
			startDate: resolvedDateFilters.startDate,
			endDate: resolvedDateFilters.endDate,
		},
		initialSales,
	);
	const sales = salesQuery.data?.data ?? [];
	const creditAccounts = creditAccountsSearchResult?.data ?? [];
	const pageSize = search.pageSize ?? DEFAULT_LIST_PARAMS.limit;
	const cursor = search.cursor ?? DEFAULT_LIST_PARAMS.cursor;
	const [selectedSaleId, setSelectedSaleId] = useState<string | null>(
		() => sales[0]?.id ?? null,
	);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [draftFilters, setDraftFilters] = useState(() => ({
		q: search.q ?? "",
		status: search.status ?? "",
		paymentMethod: search.paymentMethod ?? "",
		startDate: search.startDate ?? "",
		endDate: search.endDate ?? "",
	}));

	useEffect(() => {
		if (sales.length === 0) {
			setSelectedSaleId(null);
			setIsDetailOpen(false);
			return;
		}

		if (!selectedSaleId || !sales.some((sale) => sale.id === selectedSaleId)) {
			setSelectedSaleId(sales[0]?.id ?? null);
		}
	}, [sales, selectedSaleId]);

	useEffect(() => {
		setDraftFilters({
			q: search.q ?? "",
			status: search.status ?? "",
			paymentMethod: search.paymentMethod ?? "",
			startDate: search.startDate ?? "",
			endDate: search.endDate ?? "",
		});
	}, [
		search.endDate,
		search.paymentMethod,
		search.q,
		search.startDate,
		search.status,
	]);

	const selectedSaleSummary = useMemo(
		() => sales.find((sale) => sale.id === selectedSaleId) ?? null,
		[sales, selectedSaleId],
	);
	const creditAccountByCustomerId = useMemo(
		() =>
			new Map(
				creditAccounts.map((creditAccount) => [
					creditAccount.customerId,
					creditAccount,
				]),
			),
		[creditAccounts],
	);

	const saleDetailQuery = useSaleDetail(isDetailOpen ? selectedSaleId : null);
	const selectedSaleCreditAccount = saleDetailQuery.data?.customer?.id
		? (creditAccountByCustomerId.get(saleDetailQuery.data.customer.id) ?? null)
		: null;
	const totalRevenue = sales.reduce(
		(total, sale) => total + sale.totalAmount,
		0,
	);
	const totalPending = sales.reduce(
		(total, sale) => total + sale.balanceDue,
		0,
	);
	const totalResults = salesQuery.data?.total ?? sales.length;
	const nextCursor = salesQuery.data?.nextCursor ?? null;
	const rangeStart = totalResults === 0 ? 0 : cursor + 1;
	const rangeEnd = totalResults === 0 ? 0 : cursor + sales.length;
	const activeFilterCount = [
		search.q,
		search.status,
		search.paymentMethod,
		...(isTodayView ? [] : [search.startDate, search.endDate]),
	].filter(Boolean).length;
	const todayLabel = dayFormatter.format(new Date(`${todayDate}T00:00:00`));
	const viewSummary = isTodayView
		? {
				kicker: `Solo ${todayLabel}`,
				title: "Ventas de hoy",
				description:
					"El día actual queda separado del histórico para que caja y administración lean la operación sin ruido de ventas pasadas.",
				resultsTitle: "Ventas del dia",
				resultsDescription:
					activeFilterCount > 0
						? "Resultados del filtro aplicado sobre hoy"
						: "Registros creados durante el dia actual",
				revenueTitle: "Ingreso del dia",
				revenueDescription: "Total de ventas registradas hoy",
				pendingTitle: "Saldo pendiente hoy",
				pendingDescription: "Pendientes abiertos dentro del dia actual",
				filterTitle: "Filtros rapidos de hoy",
				filterDescription:
					"Busca por cliente, cajero o id, y filtra por estado o medio de pago. La fecha queda fijada al dia actual.",
				listTitle: "Ventas de hoy",
				listDescription:
					"Abre cualquier venta de hoy para revisar items, cliente y pagos sin mezclar operaciones pasadas.",
				emptyTitle: "No hay ventas registradas hoy.",
			}
		: {
				kicker: "Consulta completa",
				title: "Historial de ventas",
				description:
					"Usa el historial cuando necesites revisar cierres, seguimientos o ventas anteriores con filtros por fecha.",
				resultsTitle: "Ventas cargadas",
				resultsDescription:
					activeFilterCount > 0
						? "Resultados del filtro actual"
						: "Ultimos registros disponibles en pantalla",
				revenueTitle: "Monto acumulado",
				revenueDescription: "Suma de las ventas listadas",
				pendingTitle: "Saldo pendiente",
				pendingDescription: "Principalmente ventas a credito",
				filterTitle: "Filtros del historial",
				filterDescription:
					"Busca por cliente, cajero o id, y combina estado, fechas y medio de pago.",
				listTitle: "Historial de ventas",
				listDescription:
					"Selecciona una venta para revisar items, cliente y pagos.",
				emptyTitle: "No se han registrado ventas todavia.",
			};

	const applyFilters = () => {
		void navigate({
			search: {
				view: activeView !== DEFAULT_SALES_VIEW ? activeView : undefined,
				q: normalizeFilterValue(draftFilters.q),
				status: normalizeEnumFilterValue(
					draftFilters.status,
					SALE_STATUS_VALUES,
				),
				paymentMethod: normalizeEnumFilterValue(
					draftFilters.paymentMethod,
					SALE_PAYMENT_METHOD_VALUES,
				),
				startDate: isTodayView
					? search.startDate
					: normalizeFilterValue(draftFilters.startDate),
				endDate: isTodayView
					? search.endDate
					: normalizeFilterValue(draftFilters.endDate),
				cursor: undefined,
				pageSize: pageSize !== DEFAULT_LIST_PARAMS.limit ? pageSize : undefined,
			},
			replace: true,
		});
	};

	const clearFilters = () => {
		setDraftFilters({
			q: "",
			status: "",
			paymentMethod: "",
			startDate: "",
			endDate: "",
		});
		void navigate({
			search: {
				view: activeView !== DEFAULT_SALES_VIEW ? activeView : undefined,
				q: undefined,
				status: undefined,
				paymentMethod: undefined,
				startDate: isTodayView ? search.startDate : undefined,
				endDate: isTodayView ? search.endDate : undefined,
				pageSize: pageSize !== DEFAULT_LIST_PARAMS.limit ? pageSize : undefined,
			},
			replace: true,
		});
	};

	const updatePagination = (nextCursor: number, nextPageSize = pageSize) => {
		void navigate({
			search: {
				...search,
				cursor: nextCursor > 0 ? nextCursor : undefined,
				pageSize:
					nextPageSize !== DEFAULT_LIST_PARAMS.limit ? nextPageSize : undefined,
			},
			replace: true,
		});
	};

	const handleViewChange = (value: string) => {
		const nextView = normalizeSalesView(value);
		if (nextView === activeView) {
			return;
		}

		setDraftFilters({
			q: search.q ?? "",
			status: search.status ?? "",
			paymentMethod: search.paymentMethod ?? "",
			startDate: search.startDate ?? "",
			endDate: search.endDate ?? "",
		});

		startViewTransition(() => {
			void navigate({
				search: {
					...search,
					view: nextView !== DEFAULT_SALES_VIEW ? nextView : undefined,
					cursor: undefined,
				},
				replace: true,
			});
		});
	};

	return (
		<>
			<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12">
				<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-3">
						<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
							Historial operativo
						</Badge>
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
							<p className="max-w-2xl text-sm text-gray-400 md:text-base">
								Consulta la operación del día y el histórico completo en vistas
								separadas, con acceso rápido al detalle de cada venta.
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
							<Link to="/dashboard">
								Ver dashboard
								<ArrowRight className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</section>

				<section>
					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardContent className="space-y-5 pt-6">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
								<div className="space-y-2">
									<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
										{viewSummary.kicker}
									</Badge>
									<div className="space-y-1">
										<h2 className="text-2xl font-semibold tracking-tight text-white">
											{viewSummary.title}
										</h2>
										<p className="max-w-3xl text-sm text-gray-400">
											{viewSummary.description}
										</p>
									</div>
								</div>

								{isViewPending || salesQuery.isFetching ? (
									<Badge className="border-gray-700 bg-black/20 text-gray-300 hover:bg-black/20">
										Actualizando vista
									</Badge>
								) : null}
							</div>

							<div
								role="tablist"
								aria-label="Vista de ventas"
								className="grid gap-3 md:grid-cols-2"
							>
								<SalesViewToggle
									value="today"
									isActive={activeView === "today"}
									title="Ventas de hoy"
									description="Enfoca la operación actual sin mezclar movimientos de otros días."
									icon={CalendarDays}
									onSelect={handleViewChange}
								/>
								<SalesViewToggle
									value="history"
									isActive={activeView === "history"}
									title="Historial de ventas"
									description="Revisa ventas pasadas con filtros por fecha, estado y medio de pago."
									icon={History}
									onSelect={handleViewChange}
								/>
							</div>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					<SummaryCard
						title={viewSummary.resultsTitle}
						value={`${sales.length}`}
						description={viewSummary.resultsDescription}
						icon={Receipt}
					/>
					<SummaryCard
						title={viewSummary.revenueTitle}
						value={formatCurrency(totalRevenue)}
						description={viewSummary.revenueDescription}
						icon={Wallet}
					/>
					<SummaryCard
						title={viewSummary.pendingTitle}
						value={formatCurrency(totalPending)}
						description={viewSummary.pendingDescription}
						icon={Clock3}
					/>
				</section>

				<section>
					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardHeader>
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Filter className="h-4 w-4 text-[var(--color-voltage)]" />
										{viewSummary.filterTitle}
									</CardTitle>
									<CardDescription className="mt-1 text-gray-400">
										{viewSummary.filterDescription}
									</CardDescription>
								</div>
								{activeFilterCount > 0 ? (
									<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
										{activeFilterCount} filtro
										{activeFilterCount === 1 ? "" : "s"} activo
										{activeFilterCount === 1 ? "" : "s"}
									</Badge>
								) : null}
							</div>
						</CardHeader>
						<CardContent>
							<form
								className="space-y-4"
								onSubmit={(event) => {
									event.preventDefault();
									applyFilters();
								}}
							>
								<div
									className={`grid gap-4 ${
										isTodayView
											? "xl:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]"
											: "xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]"
									}`}
								>
									<div className="space-y-2">
										<label
											className="text-sm text-gray-400"
											htmlFor={salesSearchId}
										>
											Busqueda
										</label>
										<div className="relative">
											<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
											<Input
												id={salesSearchId}
												value={draftFilters.q}
												onChange={(event) =>
													setDraftFilters((current) => ({
														...current,
														q: event.target.value,
													}))
												}
												placeholder="Cliente, cajero o id"
												className="border-gray-700 bg-black/20 pl-9 text-white placeholder:text-gray-500"
											/>
										</div>
									</div>

									<FilterField label="Estado" htmlFor={salesStatusId}>
										<Select
											value={draftFilters.status || ALL_FILTER_VALUE}
											onValueChange={(value) =>
												setDraftFilters((current) => ({
													...current,
													status: value === ALL_FILTER_VALUE ? "" : value,
												}))
											}
										>
											<SelectTrigger
												id={salesStatusId}
												className="h-8 w-full border-gray-700 bg-black/20 text-white"
											>
												<SelectValue placeholder="Todos" />
											</SelectTrigger>
											<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
												<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
												<SelectItem value="completed">Pagada</SelectItem>
												<SelectItem value="credit">Credito</SelectItem>
												<SelectItem value="cancelled">Cancelada</SelectItem>
											</SelectContent>
										</Select>
									</FilterField>

									<FilterField
										label="Medio de pago"
										htmlFor={salesPaymentMethodId}
									>
										<Select
											value={draftFilters.paymentMethod || ALL_FILTER_VALUE}
											onValueChange={(value) =>
												setDraftFilters((current) => ({
													...current,
													paymentMethod:
														value === ALL_FILTER_VALUE ? "" : value,
												}))
											}
										>
											<SelectTrigger
												id={salesPaymentMethodId}
												className="h-8 w-full border-gray-700 bg-black/20 text-white"
											>
												<SelectValue placeholder="Todos" />
											</SelectTrigger>
											<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
												<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
												<SelectItem value="cash">Efectivo</SelectItem>
												<SelectItem value="card">Tarjeta</SelectItem>
												<SelectItem value="transfer_nequi">Nequi</SelectItem>
												<SelectItem value="transfer_bancolombia">
													Bancolombia
												</SelectItem>
											</SelectContent>
										</Select>
									</FilterField>

									{isTodayView ? (
										<div className="rounded-2xl border border-dashed border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/5 px-4 py-3 text-sm text-gray-300">
											<p className="font-medium text-white">
												Fecha fija en hoy
											</p>
											<p className="mt-1 text-gray-400">
												Esta vista solo muestra ventas del {todayLabel}. Usa el
												historial para cambiar el rango.
											</p>
										</div>
									) : (
										<>
											<FilterField label="Desde" htmlFor={salesStartDateId}>
												<Input
													id={salesStartDateId}
													type="date"
													value={draftFilters.startDate}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															startDate: event.target.value,
														}))
													}
													className="border-gray-700 bg-black/20 text-white"
												/>
											</FilterField>

											<FilterField label="Hasta" htmlFor={salesEndDateId}>
												<Input
													id={salesEndDateId}
													type="date"
													value={draftFilters.endDate}
													onChange={(event) =>
														setDraftFilters((current) => ({
															...current,
															endDate: event.target.value,
														}))
													}
													className="border-gray-700 bg-black/20 text-white"
												/>
											</FilterField>
										</>
									)}
								</div>

								<div className="flex flex-col gap-3 sm:flex-row">
									<Button
										type="submit"
										className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
									>
										<Filter className="h-4 w-4" />
										Aplicar filtros
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={clearFilters}
										className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
									>
										<X className="h-4 w-4" />
										Limpiar
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</section>

				<section>
					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardHeader>
							<CardTitle>{viewSummary.listTitle}</CardTitle>
							<CardDescription className="text-gray-400">
								{viewSummary.listDescription}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{sales.length > 0 ? (
								<div className="space-y-3">
									{sales.map((sale) => (
										<button
											key={sale.id}
											type="button"
											onClick={() => {
												setSelectedSaleId(sale.id);
												setIsDetailOpen(true);
											}}
											className={`flex w-full flex-col gap-4 rounded-2xl border px-4 py-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
												selectedSaleSummary?.id === sale.id
													? "border-[var(--color-voltage)]/30 bg-[var(--color-voltage)]/5"
													: "border-gray-800 bg-black/20 hover:border-gray-700 hover:bg-black/30"
											}`}
										>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<p className="truncate font-medium text-white">
														{sale.customerName ?? "Cliente mostrador"}
													</p>
													<Badge
														className={getSaleStatusBadgeClass(sale.status)}
													>
														{formatSaleStatus(sale.status)}
													</Badge>
												</div>
												<div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
													<span className="inline-flex items-center gap-1.5">
														<UserRound className="h-3.5 w-3.5" />
														{sale.cashierName ?? "Sin cajero"}
													</span>
													<span className="inline-flex items-center gap-1.5">
														<Clock3 className="h-3.5 w-3.5" />
														{dateTimeFormatter.format(sale.createdAt)}
													</span>
													<span>{sale.itemCount} items</span>
													<span>{formatPaymentSummary(sale)}</span>
												</div>
											</div>

											<div className="flex items-center gap-4">
												<div className="text-right">
													<p className="text-lg font-semibold text-white">
														{formatCurrency(sale.totalAmount)}
													</p>
													<p className="text-sm text-gray-400">
														{sale.balanceDue > 0
															? `Pendiente ${formatCurrency(sale.balanceDue)}`
															: "Sin saldo pendiente"}
													</p>
												</div>
												<div className="rounded-full border border-gray-800 p-2 text-gray-400">
													<ArrowRight className="h-4 w-4" />
												</div>
											</div>
										</button>
									))}
									<div className="flex flex-col items-center justify-between gap-4 border-t border-gray-800 bg-black/10 p-4 text-sm text-gray-400 sm:flex-row sm:gap-0">
										<div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
											<div className="flex items-center gap-2">
												<span>Show</span>
												<Select
													value={`${pageSize}`}
													onValueChange={(value) => {
														updatePagination(0, Number(value));
													}}
												>
													<SelectTrigger className="h-8 w-[74px] rounded-md border-gray-700 bg-[var(--color-carbon)] text-white">
														<SelectValue placeholder={pageSize} />
													</SelectTrigger>
													<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
														{[10, 20, 30, 40, 50].map((size) => (
															<SelectItem key={size} value={`${size}`}>
																{size}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<span>rows</span>
											</div>
											<div className="hidden sm:block">
												{rangeStart}-{rangeEnd} of {totalResults} results
											</div>
										</div>

										<div className="flex w-full items-center justify-end gap-2 sm:w-auto">
											<Button
												variant="outline"
												size="sm"
												className="h-8 rounded-md border-gray-700 bg-[var(--color-carbon)] px-3 text-gray-300 hover:bg-white/5 hover:text-white"
												onClick={() =>
													updatePagination(Math.max(cursor - pageSize, 0))
												}
												disabled={cursor === 0}
											>
												Previous
											</Button>
											<Button
												variant="default"
												size="sm"
												className="h-8 rounded-md border-none bg-[var(--color-voltage)] px-4 font-medium text-black hover:bg-[#c9e605]"
												onClick={() => {
													if (nextCursor !== null) {
														updatePagination(nextCursor);
													}
												}}
												disabled={nextCursor === null}
											>
												Next
											</Button>
										</div>
									</div>
								</div>
							) : (
								<div className="rounded-2xl border border-dashed border-gray-800 px-4 py-10 text-center">
									<p className="text-sm text-gray-400">
										{viewSummary.emptyTitle}
									</p>
									<Button
										asChild
										variant="outline"
										className="mt-4 border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
									>
										<Link to="/pos">Registrar una venta</Link>
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</section>
			</main>

			<SaleDetailSheet
				isOpen={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				sale={saleDetailQuery.data}
				isLoading={saleDetailQuery.isFetching}
				activeShiftId={posBootstrap?.activeShift?.id}
				creditAccount={selectedSaleCreditAccount}
			/>
		</>
	);
}

function normalizeSalesView(value: string | undefined): SalesView {
	return SALES_VIEW_VALUES.includes(value as SalesView)
		? (value as SalesView)
		: DEFAULT_SALES_VIEW;
}

function resolveSalesDateFilters(
	view: string | undefined,
	startDate: string | undefined,
	endDate: string | undefined,
	todayDate: string,
) {
	if (normalizeSalesView(view) === "today") {
		return {
			startDate: todayDate,
			endDate: todayDate,
		};
	}

	return {
		startDate: startDate ?? null,
		endDate: endDate ?? null,
	};
}

function getCurrentDateFilterValue() {
	const now = new Date();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

function SummaryCard({
	title,
	value,
	description,
	icon: Icon,
}: {
	title: string;
	value: string;
	description: string;
	icon: typeof Receipt;
}) {
	return (
		<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
			<CardHeader className="space-y-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]">
						<Icon className="h-4 w-4" />
					</div>
					<div>
						<CardDescription className="text-gray-400">{title}</CardDescription>
						<CardTitle className="mt-1 text-2xl font-semibold tracking-tight text-white">
							{value}
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<p className="text-sm text-gray-400">{description}</p>
			</CardContent>
		</Card>
	);
}

function SalesViewToggle({
	value,
	isActive,
	title,
	description,
	icon: Icon,
	onSelect,
}: {
	value: SalesView;
	isActive: boolean;
	title: string;
	description: string;
	icon: typeof CalendarDays;
	onSelect: (value: string) => void;
}) {
	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			onClick={() => onSelect(value)}
			className={`group flex min-h-[112px] w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
				isActive
					? "border-[var(--color-voltage)]/30 bg-[var(--color-voltage)]/10 text-white"
					: "border-gray-800 bg-black/20 text-gray-300 hover:border-gray-700 hover:bg-black/30 hover:text-white"
			}`}
		>
			<div
				className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
					isActive
						? "border-[var(--color-voltage)]/30 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)]"
						: "border-gray-700 bg-black/30 text-gray-400 group-hover:border-gray-600 group-hover:text-gray-200"
				}`}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="space-y-1">
				<p className="font-semibold">{title}</p>
				<p
					className={
						isActive ? "text-sm text-gray-200" : "text-sm text-gray-400"
					}
				>
					{description}
				</p>
			</div>
		</button>
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

function formatPaymentSummary(sale: SaleListItem) {
	if (sale.paymentMethods.length === 0) {
		return sale.status === "credit" ? "Venta a credito" : "Sin pagos";
	}

	return sale.paymentMethods.map(formatPaymentMethodLabel).join(" + ");
}

function normalizeFilterValue(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEnumFilterValue<T extends readonly string[]>(
	value: string,
	options: T,
): T[number] | undefined {
	const normalizedValue = normalizeFilterValue(value);
	if (!normalizedValue) {
		return undefined;
	}

	return options.includes(normalizedValue as T[number])
		? (normalizedValue as T[number])
		: undefined;
}

function FilterField({
	label,
	htmlFor,
	children,
}: {
	label: string;
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			<label className="text-sm text-gray-400" htmlFor={htmlFor}>
				{label}
			</label>
			{children}
		</div>
	);
}
