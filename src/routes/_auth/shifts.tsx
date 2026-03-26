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
								<article
									key={shift.id}
									className="rounded-3xl border border-gray-800 bg-black/20 p-5"
								>
									<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
										<div className="space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-lg font-semibold text-white">
													{shift.cashierName}
												</p>
												<Badge
													className={getShiftStatusBadgeClass(shift.status)}
												>
													{formatShiftStatus(shift.status)}
												</Badge>
												<Badge
													variant="outline"
													className="border-gray-700 bg-gray-900/50 text-gray-300"
												>
													{shift.id.slice(0, 8)}
												</Badge>
											</div>
											<p className="text-sm text-gray-400">
												{shift.terminalName ?? "Caja principal"}
											</p>
											<p className="text-xs text-gray-500">
												{formatShiftRange(shift.openedAt, shift.closedAt)}
											</p>
											{shift.notes ? (
												<p className="max-w-2xl text-sm text-gray-400">
													Notas: {shift.notes}
												</p>
											) : null}
										</div>

										<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
											<MiniMetric
												label="Ventas pagadas"
												value={formatCount(shift.operations.paidSalesCount)}
												description={formatCurrency(
													shift.operations.paidSalesAmount,
												)}
											/>
											<MiniMetric
												label="Ventas anuladas"
												value={formatCount(
													shift.operations.cancelledSalesCount,
												)}
												description={formatCurrency(
													shift.operations.cancelledSalesAmount,
												)}
											/>
											<MiniMetric
												label="Ventas a credito"
												value={formatCount(shift.operations.creditSalesCount)}
												description={formatCurrency(
													shift.operations.creditSalesAmount,
												)}
											/>
											<MiniMetric
												label="Efectivo esperado"
												value={formatCurrency(shift.totals.expectedCash)}
												description={`Base ${formatCurrency(shift.startingCash)}`}
											/>
											<MiniMetric
												label="Pagos registrados"
												value={formatCurrency(shift.totals.totalPayments)}
												description={`${formatCount(shift.payments.length)} movimientos de pago`}
											/>
										</div>
									</div>

									<div className="mt-5 grid gap-4 xl:grid-cols-3">
										<SectionCard
											title="Esperado por metodo"
											description={`Total esperado ${formatCurrency(shift.totals.totalExpected)}`}
										>
											{shift.paymentBreakdown.length > 0 ? (
												<div className="space-y-2">
													{shift.paymentBreakdown.map((paymentMethod) => (
														<RowItem
															key={`${shift.id}-${paymentMethod.method}`}
															label={formatPaymentMethod(paymentMethod.method)}
															value={formatCurrency(paymentMethod.amount)}
														/>
													))}
												</div>
											) : (
												<EmptySection text="Sin pagos ni saldo esperado en este turno." />
											)}
										</SectionCard>

										<SectionCard
											title="Movimientos de caja"
											description={`${formatCount(shift.movements.length)} registros`}
										>
											{shift.movements.length > 0 ? (
												<div className="space-y-2">
													{shift.movements.map((movement) => (
														<div
															key={movement.id}
															className="rounded-2xl border border-gray-800 bg-[var(--color-void)]/60 p-3"
														>
															<div className="flex items-start justify-between gap-3">
																<div className="min-w-0">
																	<p className="text-sm font-medium text-white">
																		{formatMovementType(movement.type)}
																	</p>
																	<p className="text-sm text-gray-400">
																		{formatPaymentMethod(
																			movement.paymentMethod,
																		)}{" "}
																		· {movement.description}
																	</p>
																	<p className="mt-1 text-xs text-gray-500">
																		{dateTimeFormatter.format(
																			movement.createdAt,
																		)}
																	</p>
																</div>
																<p
																	className={
																		movement.type === "inflow"
																			? "text-sm font-medium text-emerald-300"
																			: "text-sm font-medium text-rose-300"
																	}
																>
																	{movement.type === "inflow" ? "+" : "-"}
																	{formatCurrency(movement.amount)}
																</p>
															</div>
														</div>
													))}
												</div>
											) : (
												<EmptySection text="No hubo movimientos manuales de caja." />
											)}
										</SectionCard>

										<SectionCard
											title="Cierre de caja"
											description={
												shift.closures.length > 0
													? `Diferencia total ${formatSignedCurrency(shift.totals.totalDifference)}`
													: "Aun no se ha registrado cierre"
											}
										>
											{shift.closures.length > 0 ? (
												<div className="space-y-2">
													{shift.closures.map((closure) => (
														<div
															key={`${shift.id}-${closure.paymentMethod}`}
															className="rounded-2xl border border-gray-800 bg-[var(--color-void)]/60 p-3"
														>
															<div className="flex items-center justify-between gap-3">
																<p className="text-sm font-medium text-white">
																	{formatPaymentMethod(closure.paymentMethod)}
																</p>
																<p
																	className={getDifferenceClassName(
																		closure.difference,
																	)}
																>
																	{formatSignedCurrency(closure.difference)}
																</p>
															</div>
															<div className="mt-2 grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
																<RowItem
																	label="Esperado"
																	value={formatCurrency(closure.expectedAmount)}
																/>
																<RowItem
																	label="Contado"
																	value={formatCurrency(closure.actualAmount)}
																/>
															</div>
														</div>
													))}
												</div>
											) : (
												<EmptySection text="El turno sigue abierto o aun no tiene conciliacion registrada." />
											)}
										</SectionCard>
									</div>
								</article>
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
		<div className="rounded-2xl border border-gray-800 bg-[var(--color-void)]/60 p-4">
			<p className="text-sm text-gray-400">{label}</p>
			<p className="mt-2 text-lg font-semibold text-white">{value}</p>
			<p className="mt-1 text-xs text-gray-500">{description}</p>
		</div>
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

function SectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-gray-800 bg-black/10 p-4">
			<div className="mb-3">
				<p className="font-medium text-white">{title}</p>
				<p className="text-sm text-gray-400">{description}</p>
			</div>
			{children}
		</div>
	);
}

function RowItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-gray-400">{label}</span>
			<span className="font-medium text-white">{value}</span>
		</div>
	);
}

function EmptySection({ text }: { text: string }) {
	return <p className="text-sm text-gray-500">{text}</p>;
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

function formatPaymentMethod(method: string) {
	const labels: Record<string, string> = {
		cash: "Efectivo",
		card: "Tarjeta",
		transfer: "Transferencia",
		transfer_nequi: "Nequi",
		transfer_bancolombia: "Bancolombia",
	};

	return (
		labels[method] ??
		method
			.split("_")
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(" ")
	);
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
