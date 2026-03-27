import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	CircleDollarSign,
	Clock3,
	Filter,
	LogOut,
	Receipt,
	Search,
	Store,
	User,
	Wallet,
	X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
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
import { listShifts } from "@/features/pos/pos.functions";
import {
	createPaymentMethodLabelMap,
	formatPaymentMethodLabel,
} from "@/features/pos/utils";
import { authClient } from "@/lib/auth-client";

const DEFAULT_LIST_PARAMS = {
	limit: 10,
	cursor: 0,
};

const ALL_FILTER_VALUE = "all";

const shiftsSearchSchema = z.object({
	q: z.string().optional(),
	status: z.enum(["open", "closed"]).optional(),
	cashierId: z.string().optional(),
	terminalName: z.string().optional(),
	paymentMethod: z.string().optional(),
	differenceStatus: z.enum(["short", "over", "balanced"]).optional(),
	hasMovements: z.enum(["yes", "no"]).optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	cursor: z.coerce.number().int().min(0).optional(),
	pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	hour: "numeric",
	minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("es-CO", {
	style: "currency",
	currency: "COP",
	maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("es-CO");

export const Route = createFileRoute("/_auth/shifts")({
	validateSearch: shiftsSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) =>
		listShifts({
			data: {
				limit: deps.pageSize ?? DEFAULT_LIST_PARAMS.limit,
				cursor: deps.cursor ?? DEFAULT_LIST_PARAMS.cursor,
				status: deps.status ?? null,
				searchQuery: deps.q ?? null,
				cashierId: deps.cashierId ?? null,
				terminalName: deps.terminalName ?? null,
				paymentMethod: deps.paymentMethod ?? null,
				differenceStatus: deps.differenceStatus ?? null,
				hasMovements: deps.hasMovements ?? null,
				startDate: deps.startDate ?? null,
				endDate: deps.endDate ?? null,
			},
		}),
	component: ShiftsPage,
});

function ShiftsPage() {
	const searchId = useId();
	const statusId = useId();
	const cashierId = useId();
	const terminalId = useId();
	const paymentMethodId = useId();
	const differenceStatusId = useId();
	const hasMovementsId = useId();
	const startDateId = useId();
	const endDateId = useId();
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const initialData = Route.useLoaderData();
	const shifts = initialData.data;
	const pageSize = search.pageSize ?? DEFAULT_LIST_PARAMS.limit;
	const cursor = search.cursor ?? DEFAULT_LIST_PARAMS.cursor;
	const [draftFilters, setDraftFilters] = useState(() => ({
		q: search.q ?? "",
		status: search.status ?? "",
		cashierId: search.cashierId ?? "",
		terminalName: search.terminalName ?? "",
		paymentMethod: search.paymentMethod ?? "",
		differenceStatus: search.differenceStatus ?? "",
		hasMovements: search.hasMovements ?? "",
		startDate: search.startDate ?? "",
		endDate: search.endDate ?? "",
	}));

	useEffect(() => {
		setDraftFilters({
			q: search.q ?? "",
			status: search.status ?? "",
			cashierId: search.cashierId ?? "",
			terminalName: search.terminalName ?? "",
			paymentMethod: search.paymentMethod ?? "",
			differenceStatus: search.differenceStatus ?? "",
			hasMovements: search.hasMovements ?? "",
			startDate: search.startDate ?? "",
			endDate: search.endDate ?? "",
		});
	}, [
		search.cashierId,
		search.differenceStatus,
		search.endDate,
		search.hasMovements,
		search.paymentMethod,
		search.q,
		search.startDate,
		search.status,
		search.terminalName,
	]);

	const activeFilterCount = [
		search.q,
		search.status,
		search.cashierId,
		search.terminalName,
		search.paymentMethod,
		search.differenceStatus,
		search.hasMovements,
		search.startDate,
		search.endDate,
	].filter(Boolean).length;

	const summary = useMemo(() => {
		return shifts.reduce(
			(accumulator, shift) => {
				accumulator.expectedCash += shift.totals.expectedCash;
				accumulator.expectedPayments += shift.totals.totalPayments;
				accumulator.closureDifference += shift.totals.totalDifference;
				accumulator.movements += shift.movements.length;
				if (shift.status === "open") {
					accumulator.openShifts += 1;
				}
				return accumulator;
			},
			{
				expectedCash: 0,
				expectedPayments: 0,
				closureDifference: 0,
				movements: 0,
				openShifts: 0,
			},
		);
	}, [shifts]);
	const paymentMethodLabels = useMemo(
		() => createPaymentMethodLabelMap(initialData.filterOptions.paymentMethods),
		[initialData.filterOptions.paymentMethods],
	);

	const applyFilters = () => {
		void navigate({
			search: {
				q: normalizeFilterValue(draftFilters.q),
				status: normalizeStatusFilterValue(draftFilters.status),
				cashierId: normalizeFilterValue(draftFilters.cashierId),
				terminalName: normalizeFilterValue(draftFilters.terminalName),
				paymentMethod: normalizeFilterValue(draftFilters.paymentMethod),
				differenceStatus: normalizeDifferenceFilterValue(
					draftFilters.differenceStatus,
				),
				hasMovements: normalizeMovementFilterValue(draftFilters.hasMovements),
				startDate: normalizeFilterValue(draftFilters.startDate),
				endDate: normalizeFilterValue(draftFilters.endDate),
				cursor: undefined,
				pageSize,
			},
			replace: true,
		});
	};

	const clearFilters = () => {
		setDraftFilters({
			q: "",
			status: "",
			cashierId: "",
			terminalName: "",
			paymentMethod: "",
			differenceStatus: "",
			hasMovements: "",
			startDate: "",
			endDate: "",
		});
		void navigate({
			search: {
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

	const totalResults = initialData.total;
	const nextCursor = initialData.nextCursor;
	const rangeStart = totalResults === 0 ? 0 : cursor + 1;
	const rangeEnd = totalResults === 0 ? 0 : cursor + shifts.length;

	return (
		<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12">
			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
						Operacion de caja
					</Badge>
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">
							Turnos y cierres de caja
						</h1>
						<p className="max-w-3xl text-sm text-gray-400 md:text-base">
							Consulta turnos, cierres, pagos y movimientos de caja en una sola
							pantalla con filtros por cajero, estado y fecha.
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

			<section className="grid gap-4 md:grid-cols-4">
				<SummaryCard
					title="Turnos cargados"
					value={formatCount(shifts.length)}
					description={
						activeFilterCount > 0
							? "Resultados del filtro actual"
							: "Turnos recientes listados"
					}
					icon={Receipt}
				/>
				<SummaryCard
					title="Turnos abiertos"
					value={formatCount(summary.openShifts)}
					description="Pendientes por cerrar"
					icon={Clock3}
				/>
				<SummaryCard
					title="Efectivo esperado"
					value={formatCurrency(summary.expectedCash)}
					description="Suma del listado visible"
					icon={Wallet}
				/>
				<SummaryCard
					title="Movimientos"
					value={formatCount(summary.movements)}
					description={`Diferencia total ${formatSignedCurrency(summary.closureDifference)}`}
					icon={CircleDollarSign}
				/>
			</section>

			<section>
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Filter className="h-4 w-4 text-[var(--color-voltage)]" />
									Filtros
								</CardTitle>
								<CardDescription className="mt-1 text-gray-400">
									Busca por cajero, terminal, notas o id del turno y acota el
									historial por estado, método involucrado, movimientos
									manuales, diferencia de cierre y fecha de apertura.
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
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
								<div className="space-y-2">
									<label className="text-sm text-gray-400" htmlFor={searchId}>
										Busqueda
									</label>
									<div className="relative">
										<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
										<Input
											id={searchId}
											value={draftFilters.q}
											onChange={(event) =>
												setDraftFilters((current) => ({
													...current,
													q: event.target.value,
												}))
											}
											placeholder="Cajero, terminal, notas o id"
											className="border-gray-700 bg-black/20 pl-9 text-white placeholder:text-gray-500"
										/>
									</div>
								</div>

								<FilterField label="Estado" htmlFor={statusId}>
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
											id={statusId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
											<SelectItem value="open">Abierto</SelectItem>
											<SelectItem value="closed">Cerrado</SelectItem>
										</SelectContent>
									</Select>
								</FilterField>

								<FilterField label="Cajero" htmlFor={cashierId}>
									<Select
										value={draftFilters.cashierId || ALL_FILTER_VALUE}
										onValueChange={(value) =>
											setDraftFilters((current) => ({
												...current,
												cashierId: value === ALL_FILTER_VALUE ? "" : value,
											}))
										}
									>
										<SelectTrigger
											id={cashierId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
											{initialData.filterOptions.cashiers.map((cashier) => (
												<SelectItem key={cashier.id} value={cashier.id}>
													{cashier.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FilterField>

								<FilterField label="Terminal" htmlFor={terminalId}>
									<Select
										value={draftFilters.terminalName || ALL_FILTER_VALUE}
										onValueChange={(value) =>
											setDraftFilters((current) => ({
												...current,
												terminalName: value === ALL_FILTER_VALUE ? "" : value,
											}))
										}
									>
										<SelectTrigger
											id={terminalId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todas" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todas</SelectItem>
											{initialData.filterOptions.terminals.map((terminal) => (
												<SelectItem key={terminal} value={terminal}>
													{terminal}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FilterField>

								<FilterField label="Metodo" htmlFor={paymentMethodId}>
									<Select
										value={draftFilters.paymentMethod || ALL_FILTER_VALUE}
										onValueChange={(value) =>
											setDraftFilters((current) => ({
												...current,
												paymentMethod: value === ALL_FILTER_VALUE ? "" : value,
											}))
										}
									>
										<SelectTrigger
											id={paymentMethodId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
											{initialData.filterOptions.paymentMethods.map(
												(paymentMethod) => (
													<SelectItem
														key={paymentMethod.id}
														value={paymentMethod.id}
													>
														{paymentMethod.label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</FilterField>
							</div>

							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
								<FilterField label="Diferencia" htmlFor={differenceStatusId}>
									<Select
										value={draftFilters.differenceStatus || ALL_FILTER_VALUE}
										onValueChange={(value) =>
											setDraftFilters((current) => ({
												...current,
												differenceStatus:
													value === ALL_FILTER_VALUE ? "" : value,
											}))
										}
									>
										<SelectTrigger
											id={differenceStatusId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todas" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todas</SelectItem>
											<SelectItem value="short">Faltante</SelectItem>
											<SelectItem value="over">Sobrante</SelectItem>
											<SelectItem value="balanced">Cuadrada</SelectItem>
										</SelectContent>
									</Select>
								</FilterField>

								<FilterField label="Movimientos" htmlFor={hasMovementsId}>
									<Select
										value={draftFilters.hasMovements || ALL_FILTER_VALUE}
										onValueChange={(value) =>
											setDraftFilters((current) => ({
												...current,
												hasMovements: value === ALL_FILTER_VALUE ? "" : value,
											}))
										}
									>
										<SelectTrigger
											id={hasMovementsId}
											className="h-8 w-full border-gray-700 bg-black/20 text-white"
										>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent className="border-gray-800 bg-[var(--color-carbon)] text-white">
											<SelectItem value={ALL_FILTER_VALUE}>Todos</SelectItem>
											<SelectItem value="yes">Con movimientos</SelectItem>
											<SelectItem value="no">Sin movimientos</SelectItem>
										</SelectContent>
									</Select>
								</FilterField>

								<FilterField label="Desde" htmlFor={startDateId}>
									<Input
										id={startDateId}
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

								<FilterField label="Hasta" htmlFor={endDateId}>
									<Input
										id={endDateId}
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
						<CardTitle>Historial de turnos</CardTitle>
						<CardDescription className="text-gray-400">
							Revisa operaciones, pagos esperados, movimientos y conciliacion
							del cierre de cada turno.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{shifts.length > 0 ? (
							shifts.map((shift) => (
								<Card
									key={shift.id}
									className="overflow-hidden border-gray-800 bg-[var(--color-carbon)]/40 shadow-none transition-colors hover:bg-[var(--color-carbon)]/80"
								>
									<div className="flex flex-col gap-4 border-b border-gray-800/50 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex items-center gap-4">
											<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-800 bg-[var(--color-void)] text-gray-400">
												<User className="h-5 w-5" />
											</div>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="truncate text-lg font-semibold text-white">
														{shift.cashierName}
													</h3>
													<Badge
														className={getShiftStatusBadgeClass(shift.status)}
													>
														{formatShiftStatus(shift.status)}
													</Badge>
													<span className="font-mono text-xs text-gray-500">
														#{shift.id.slice(0, 8)}
													</span>
												</div>
												<p className="mt-0.5 truncate text-sm text-gray-400">
													{shift.terminalName ?? "Caja principal"}
												</p>
											</div>
										</div>
										<div className="shrink-0 text-left sm:text-right">
											<p className="text-sm font-medium text-gray-300">
												{formatShiftRange(shift.openedAt, shift.closedAt)}
											</p>
											{shift.notes ? (
												<p
													className="mt-1 max-w-[280px] truncate text-xs text-gray-500 sm:ml-auto"
													title={shift.notes}
												>
													{shift.notes}
												</p>
											) : null}
										</div>
									</div>

									<div className="grid grid-cols-1 divide-y divide-gray-800/50 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
										<div className="p-5">
											<h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
												Resumen de Operaciones
											</h4>
											<div className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div>
														<p className="mb-1 text-xs text-gray-500">
															Pagadas (
															{formatCount(shift.operations.paidSalesCount)})
														</p>
														<p className="text-lg font-medium text-white">
															{formatCurrency(shift.operations.paidSalesAmount)}
														</p>
													</div>
													<div>
														<p className="mb-1 text-xs text-gray-500">
															A crédito (
															{formatCount(shift.operations.creditSalesCount)})
														</p>
														<p className="text-lg font-medium text-white">
															{formatCurrency(
																shift.operations.creditSalesAmount,
															)}
														</p>
													</div>
												</div>
												<div className="border-t border-gray-800/50 pt-3">
													<div className="flex items-center justify-between">
														<span className="text-sm text-gray-400">
															Anuladas (
															{formatCount(
																shift.operations.cancelledSalesCount,
															)}
															)
														</span>
														<span className="text-sm text-gray-300">
															{formatCurrency(
																shift.operations.cancelledSalesAmount,
															)}
														</span>
													</div>
												</div>
											</div>
										</div>

										<div className="bg-black/5 p-5">
											<h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
												Valores Esperados
											</h4>
											<div className="space-y-4">
												<div className="flex items-end justify-between">
													<div>
														<p className="mb-1 text-xs text-gray-500">
															Efectivo Total
														</p>
														<p className="text-xl font-semibold text-emerald-400">
															{formatCurrency(shift.totals.expectedCash)}
														</p>
														<p className="mt-1 text-xs text-gray-500">
															Base: {formatCurrency(shift.startingCash)}
														</p>
													</div>
													<div className="text-right">
														<p className="mb-1 text-xs text-gray-500">
															Otros Pagos ({formatCount(shift.payments.length)})
														</p>
														<p className="text-lg font-medium text-white">
															{formatCurrency(shift.totals.totalPayments)}
														</p>
													</div>
												</div>
												{shift.paymentBreakdown.length > 0 && (
													<div className="space-y-2 border-t border-gray-800/50 pt-3">
														{shift.paymentBreakdown.map((pm) => (
															<div
																key={pm.method}
																className="flex items-center justify-between text-sm"
															>
																<span className="text-gray-400">
																	{formatPaymentMethod(
																		pm.method,
																		paymentMethodLabels,
																	)}
																</span>
																<span className="font-medium text-gray-300">
																	{formatCurrency(pm.amount)}
																</span>
															</div>
														))}
													</div>
												)}
											</div>
										</div>

										<div className="bg-black/10 p-5">
											<div className="mb-4 flex items-center justify-between">
												<h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
													Cierre y Conciliación
												</h4>
												{shift.closures.length > 0 && (
													<Badge
														variant="outline"
														className={`h-6 rounded-md border-0 px-2 py-0.5 ${getDifferenceClassName(shift.totals.totalDifference)}`}
													>
														{shift.totals.totalDifference === 0
															? "Cuadrado"
															: formatSignedCurrency(
																	shift.totals.totalDifference,
																)}
													</Badge>
												)}
											</div>

											{shift.closures.length > 0 ? (
												<div className="space-y-3">
													{shift.closures.map((closure) => (
														<div
															key={closure.paymentMethod}
															className="flex items-center justify-between text-sm"
														>
															<span className="text-gray-300">
																{formatPaymentMethod(
																	closure.paymentMethod,
																	paymentMethodLabels,
																)}
															</span>
															<div className="text-right">
																<span className="block font-medium text-white">
																	{formatCurrency(closure.actualAmount)}
																</span>
																<span className="text-xs text-gray-500">
																	vs {formatCurrency(closure.expectedAmount)}
																</span>
															</div>
														</div>
													))}
												</div>
											) : (
												<p className="text-sm italic text-gray-500">
													El turno sigue abierto o aún no tiene conciliación
													registrada.
												</p>
											)}

											{shift.movements.length > 0 && (
												<div className="mt-5 border-t border-gray-800/50 pt-4">
													<p className="mb-3 text-xs font-medium text-gray-500">
														Movimientos de caja ({shift.movements.length})
													</p>
													<div className="space-y-2.5">
														{shift.movements.slice(0, 3).map((m) => (
															<div
																key={m.id}
																className="flex items-start justify-between gap-2 text-xs"
															>
																<span
																	className="line-clamp-2 break-words text-gray-400"
																	title={m.description}
																>
																	{m.description || formatMovementType(m.type)}
																</span>
																<span
																	className={`shrink-0 font-medium ${
																		m.type === "inflow"
																			? "text-emerald-400"
																			: "text-rose-400"
																	}`}
																>
																	{m.type === "inflow" ? "+" : "-"}
																	{formatCurrency(m.amount)}
																</span>
															</div>
														))}
														{shift.movements.length > 3 && (
															<p className="mt-1 text-xs italic text-gray-500">
																+ {shift.movements.length - 3} movimientos más
															</p>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</Card>
							))
						) : (
							<div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
								No hay turnos que coincidan con los filtros actuales.
							</div>
						)}

						<div className="flex flex-col gap-3 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-gray-400">
								Mostrando {rangeStart}-{rangeEnd} de {formatCount(totalResults)}{" "}
								turnos
							</p>
							<div className="flex gap-3">
								<Button
									type="button"
									variant="outline"
									disabled={cursor <= 0}
									onClick={() =>
										updatePagination(Math.max(cursor - pageSize, 0))
									}
									className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
								>
									Anterior
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={!nextCursor}
									onClick={() => nextCursor && updatePagination(nextCursor)}
									className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
								>
									Siguiente
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>
		</main>
	);
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
					<div className="min-w-0 flex-1">
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

function formatCurrency(value: number) {
	return currencyFormatter.format(value);
}

function formatSignedCurrency(value: number) {
	const prefix = value > 0 ? "+" : "";
	return `${prefix}${formatCurrency(value)}`;
}

function formatCount(value: number) {
	return countFormatter.format(value);
}

function formatPaymentMethod(
	method: string,
	paymentMethodLabels?: Record<string, string>,
) {
	return formatPaymentMethodLabel(method, paymentMethodLabels);
}

function formatMovementType(type: string) {
	const labels: Record<string, string> = {
		inflow: "Ingreso manual",
		expense: "Gasto operativo",
		payout: "Pago a proveedor",
	};

	return labels[type] ?? type;
}

function formatShiftStatus(status: string) {
	return status === "open" ? "Abierto" : "Cerrado";
}

function formatShiftRange(openedAt: number, closedAt: number | null) {
	return closedAt
		? `${dateTimeFormatter.format(openedAt)} - ${dateTimeFormatter.format(closedAt)}`
		: `${dateTimeFormatter.format(openedAt)} - En curso`;
}

function getShiftStatusBadgeClass(status: string) {
	return status === "open"
		? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10"
		: "border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-800/80";
}

function getDifferenceClassName(value: number) {
	if (value > 0) {
		return "text-sm font-medium text-emerald-300";
	}

	if (value < 0) {
		return "text-sm font-medium text-rose-300";
	}

	return "text-sm font-medium text-gray-300";
}

function normalizeFilterValue(value: string) {
	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function normalizeStatusFilterValue(value: string) {
	if (value === "open" || value === "closed") {
		return value;
	}

	return undefined;
}

function normalizeDifferenceFilterValue(value: string) {
	if (value === "short" || value === "over" || value === "balanced") {
		return value;
	}

	return undefined;
}

function normalizeMovementFilterValue(value: string) {
	if (value === "yes" || value === "no") {
		return value;
	}

	return undefined;
}
