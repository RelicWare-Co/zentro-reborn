import { createFileRoute } from "@tanstack/react-router";
import {
	Building2,
	CreditCard,
	Package,
	Plus,
	Save,
	Settings2,
	Store,
	Trash2,
	UtensilsCrossed,
	Users,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	useCreateRestaurantAreaMutation,
	useCreateRestaurantTableMutation,
	useDeleteRestaurantAreaMutation,
	useDeleteRestaurantTableMutation,
	useUpdateRestaurantTableMutation,
} from "@/features/restaurants/hooks/use-restaurants";
import {
	useSettings,
	useUpdateSettingsMutation,
} from "@/features/settings/hooks/use-settings";
import { getSettings } from "@/features/settings/settings.functions";
import {
	normalizeOrganizationSettings,
	normalizePaymentMethodId,
	type OrganizationPaymentMethodSettings,
	type OrganizationSettings,
} from "@/features/settings/settings.shared";
import { formatMoneyInput, parseMoneyInput } from "@/lib/utils";

export const Route = createFileRoute("/_auth/settings")({
	loader: () => getSettings(),
	component: SettingsPage,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

function SettingsPage() {
	const loaderData = Route.useLoaderData();
	const { data = loaderData } = useSettings(loaderData);
	const updateSettingsMutation = useUpdateSettingsMutation();
	const createRestaurantAreaMutation = useCreateRestaurantAreaMutation();
	const createRestaurantTableMutation = useCreateRestaurantTableMutation();
	const deleteRestaurantAreaMutation = useDeleteRestaurantAreaMutation();
	const deleteRestaurantTableMutation = useDeleteRestaurantTableMutation();
	const updateRestaurantTableMutation = useUpdateRestaurantTableMutation();
	const canManageSettings = data.viewer.canManageSettings;
	const restaurantConfigMutationError =
		createRestaurantAreaMutation.error instanceof Error
			? createRestaurantAreaMutation.error.message
			: createRestaurantTableMutation.error instanceof Error
				? createRestaurantTableMutation.error.message
				: deleteRestaurantAreaMutation.error instanceof Error
					? deleteRestaurantAreaMutation.error.message
					: deleteRestaurantTableMutation.error instanceof Error
						? deleteRestaurantTableMutation.error.message
						: updateRestaurantTableMutation.error instanceof Error
							? updateRestaurantTableMutation.error.message
							: null;

	const [draftSettings, setDraftSettings] = useState<OrganizationSettings>(() =>
		normalizeOrganizationSettings(loaderData.settings),
	);
	const [showSavedMessage, setShowSavedMessage] = useState(false);
	const defaultTerminalNameId = useId();
	const defaultStartingCashId = useId();
	const defaultInterestRateId = useId();
	const lowStockThresholdId = useId();
	const defaultTaxRateId = useId();
	const newPaymentMethodId = useId();
	const [newPaymentMethodLabel, setNewPaymentMethodLabel] = useState("");
	const [paymentMethodDraftError, setPaymentMethodDraftError] = useState<
		string | null
	>(null);
	const [newAreaName, setNewAreaName] = useState("");
	const [newTableDrafts, setNewTableDrafts] = useState<
		Record<string, { name: string; seats: string }>
	>({});
	const newPaymentMethodSlug = useMemo(
		() => normalizePaymentMethodId(newPaymentMethodLabel),
		[newPaymentMethodLabel],
	);

	useEffect(() => {
		setDraftSettings(normalizeOrganizationSettings(data.settings));
	}, [data.settings]);

	const hasChanges = useMemo(
		() =>
			JSON.stringify(draftSettings) !==
			JSON.stringify(normalizeOrganizationSettings(data.settings)),
		[draftSettings, data.settings],
	);

	useEffect(() => {
		if (hasChanges) {
			setShowSavedMessage(false);
		}
	}, [hasChanges]);

	const handlePaymentMethodChange = (
		methodId: string,
		updates: Partial<OrganizationPaymentMethodSettings>,
	) => {
		setDraftSettings((currentValue) => ({
			...currentValue,
			pos: {
				...currentValue.pos,
				paymentMethods: currentValue.pos.paymentMethods.map((method) =>
					method.id === methodId
						? {
								...method,
								...updates,
								requiresReference:
									method.id === "cash"
										? false
										: (updates.requiresReference ?? method.requiresReference),
							}
						: method,
				),
			},
		}));
	};

	const handleReset = () => {
		setDraftSettings(normalizeOrganizationSettings(data.settings));
		setShowSavedMessage(false);
	};

	const handleAddPaymentMethod = () => {
		const trimmedLabel = newPaymentMethodLabel.trim();
		if (!trimmedLabel || !newPaymentMethodSlug) {
			setPaymentMethodDraftError(
				"Escribe un nombre válido para crear el método de pago.",
			);
			return;
		}

		if (
			draftSettings.pos.paymentMethods.some(
				(paymentMethod) => paymentMethod.id === newPaymentMethodSlug,
			)
		) {
			setPaymentMethodDraftError(
				`Ya existe un método con el código ${newPaymentMethodSlug}.`,
			);
			return;
		}

		setDraftSettings((currentValue) => ({
			...currentValue,
			pos: {
				...currentValue.pos,
				paymentMethods: [
					...currentValue.pos.paymentMethods,
					{
						id: newPaymentMethodSlug,
						label: trimmedLabel,
						enabled: true,
						requiresReference: true,
					},
				],
			},
		}));
		setNewPaymentMethodLabel("");
		setPaymentMethodDraftError(null);
	};

	const handleSave = async () => {
		if (!canManageSettings) {
			return;
		}

		await updateSettingsMutation.mutateAsync({
			settings: draftSettings,
		});
		setShowSavedMessage(true);
	};

	const handleCreateArea = async () => {
		const trimmedName = newAreaName.trim();
		if (!trimmedName) {
			return;
		}

		await createRestaurantAreaMutation.mutateAsync({
			name: trimmedName,
		});
		setNewAreaName("");
	};

	const handleCreateTable = async (areaId: string) => {
		const draft = newTableDrafts[areaId];
		const tableName = draft?.name?.trim() ?? "";
		if (!tableName) {
			return;
		}

		await createRestaurantTableMutation.mutateAsync({
			areaId,
			name: tableName,
			seats: Number(draft?.seats ?? 0) || 0,
		});
		setNewTableDrafts((currentValue) => ({
			...currentValue,
			[areaId]: { name: "", seats: "" },
		}));
	};

	return (
		<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12">
			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
						Configuración
					</Badge>
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">
							Ajustes del negocio
						</h1>
						<p className="max-w-2xl text-sm text-gray-400 md:text-base">
							Administra las reglas operativas que hoy ya afectan caja, POS y
							alertas de inventario.
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						variant="outline"
						onClick={handleReset}
						disabled={
							!canManageSettings ||
							!hasChanges ||
							updateSettingsMutation.isPending
						}
						className="border-gray-700 bg-[var(--color-carbon)] text-gray-200 hover:bg-white/5 hover:text-white"
					>
						Restablecer
					</Button>
					<Button
						onClick={handleSave}
						disabled={
							!canManageSettings ||
							!hasChanges ||
							updateSettingsMutation.isPending
						}
						className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
					>
						<Save className="h-4 w-4" />
						{updateSettingsMutation.isPending
							? "Guardando..."
							: "Guardar cambios"}
					</Button>
				</div>
			</section>

			{showSavedMessage ? (
				<Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
					<AlertTitle>Cambios guardados</AlertTitle>
					<AlertDescription>
						El POS y los nuevos cálculos de inventario ya usarán esta
						configuración.
					</AlertDescription>
				</Alert>
			) : null}

			{!canManageSettings ? (
				<Alert className="border-gray-700 bg-[var(--color-carbon)] text-[var(--color-photon)]">
					<AlertTitle>Solo lectura</AlertTitle>
					<AlertDescription>
						Necesitas rol admin u owner en la organización para cambiar estos
						ajustes.
					</AlertDescription>
				</Alert>
			) : null}

			{updateSettingsMutation.error instanceof Error ? (
				<Alert
					variant="destructive"
					className="border-red-500/20 bg-red-500/10 text-red-100"
				>
					<AlertTitle>No se pudo guardar</AlertTitle>
					<AlertDescription>
						{updateSettingsMutation.error.message}
					</AlertDescription>
				</Alert>
			) : null}

			{restaurantConfigMutationError ? (
				<Alert
					variant="destructive"
					className="border-red-500/20 bg-red-500/10 text-red-100"
				>
					<AlertTitle>No se pudo actualizar restaurantes</AlertTitle>
					<AlertDescription>{restaurantConfigMutationError}</AlertDescription>
				</Alert>
			) : null}

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Organización activa"
					value={data.organization.name}
					description={`Slug: ${data.organization.slug}`}
					icon={Building2}
				/>
				<SummaryCard
					title="Equipo"
					value={`${data.stats.membersCount}`}
					description={`${data.stats.invitationsCount} invitaciones pendientes`}
					icon={Users}
				/>
				<SummaryCard
					title="Catálogo"
					value={`${data.stats.productsCount}`}
					description={`${data.stats.customersCount} clientes registrados`}
					icon={Package}
				/>
				<SummaryCard
					title="Creada"
					value={dateFormatter.format(data.organization.createdAt)}
					description="Perfil de la organización"
					icon={Settings2}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Store className="h-4 w-4 text-[var(--color-voltage)]" />
							Caja y POS
						</CardTitle>
						<CardDescription className="text-gray-400">
							Valores por defecto que ya usa la apertura de turno y el checkout.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-2">
							<Label htmlFor={defaultTerminalNameId}>
								Nombre por defecto de caja
							</Label>
							<Input
								id={defaultTerminalNameId}
								value={draftSettings.pos.defaultTerminalName}
								onChange={(event) =>
									setDraftSettings((currentValue) => ({
										...currentValue,
										pos: {
											...currentValue.pos,
											defaultTerminalName: event.target.value,
										},
									}))
								}
								placeholder="Caja Principal"
								className="border-gray-700 bg-black/20"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor={defaultStartingCashId}>
								Base inicial sugerida
							</Label>
							<Input
								id={defaultStartingCashId}
								type="text"
								inputMode="numeric"
								value={formatMoneyInput(draftSettings.pos.defaultStartingCash)}
								onChange={(event) =>
									setDraftSettings((currentValue) => ({
										...currentValue,
										pos: {
											...currentValue.pos,
											defaultStartingCash: parseMoneyInput(event.target.value),
										},
									}))
								}
								className="border-gray-700 bg-black/20"
							/>
						</div>

						<Separator className="border-gray-800" />

						<div className="space-y-4">
							<div>
								<h3 className="font-medium text-white">Métodos de pago</h3>
								<p className="mt-1 text-sm text-gray-400">
									Los deshabilitados dejan de salir en nuevas operaciones, pero
									se conservan para histórico, cierres y reportes.
								</p>
							</div>

							<div className="space-y-3">
								{draftSettings.pos.paymentMethods.map((paymentMethod) => (
									<div
										key={paymentMethod.id}
										className="rounded-2xl border border-gray-800 bg-black/20 p-4"
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
											<div className="min-w-0 flex-1 space-y-3">
												<div className="grid gap-2">
													<Label htmlFor={`payment-method-${paymentMethod.id}`}>
														Nombre visible
													</Label>
													<Input
														id={`payment-method-${paymentMethod.id}`}
														value={paymentMethod.label}
														onChange={(event) =>
															handlePaymentMethodChange(paymentMethod.id, {
																label: event.target.value,
															})
														}
														className="border-gray-700 bg-black/20"
													/>
												</div>
												<p className="text-xs text-gray-500">
													Código interno:{" "}
													<span className="text-gray-400">
														{paymentMethod.id}
													</span>
												</p>
												<p className="text-sm text-gray-400">
													{paymentMethod.id === "cash"
														? "Siempre activo para apertura, cambio y cierre."
														: "Puedes exigir referencia y desactivarlo cuando ya no aplique para nuevas operaciones."}
												</p>
											</div>

											<div className="flex flex-wrap items-center gap-6">
												<div className="flex items-center gap-3">
													<Switch
														checked={paymentMethod.enabled}
														disabled={paymentMethod.id === "cash"}
														onCheckedChange={(checked) =>
															handlePaymentMethodChange(paymentMethod.id, {
																enabled: checked,
															})
														}
													/>
													<span className="text-sm text-gray-300">Activo</span>
												</div>

												<div className="flex items-center gap-3">
													<Switch
														checked={paymentMethod.requiresReference}
														disabled={paymentMethod.id === "cash"}
														onCheckedChange={(checked) =>
															handlePaymentMethodChange(paymentMethod.id, {
																requiresReference: checked,
															})
														}
													/>
													<span className="text-sm text-gray-300">
														Requiere referencia
													</span>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>

							<div className="rounded-2xl border border-dashed border-gray-700 bg-black/10 p-4">
								<div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
									<div className="space-y-2">
										<Label htmlFor={newPaymentMethodId}>
											Agregar método personalizado
										</Label>
										<Input
											id={newPaymentMethodId}
											value={newPaymentMethodLabel}
											onChange={(event) => {
												if (paymentMethodDraftError) {
													setPaymentMethodDraftError(null);
												}
												setNewPaymentMethodLabel(event.target.value);
											}}
											placeholder="Ej. Daviplata, QR, Zelle"
											className="border-gray-700 bg-black/20"
										/>
										<p className="text-xs text-gray-500">
											Código interno:{" "}
											<span className="text-gray-400">
												{newPaymentMethodSlug || "Se genera automáticamente"}
											</span>
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										onClick={handleAddPaymentMethod}
										className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
									>
										<Plus className="h-4 w-4" />
										Agregar método
									</Button>
								</div>
								{paymentMethodDraftError ? (
									<p className="mt-3 text-sm text-red-400">
										{paymentMethodDraftError}
									</p>
								) : null}
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UtensilsCrossed className="h-4 w-4 text-[var(--color-voltage)]" />
								Restaurantes
							</CardTitle>
							<CardDescription className="text-gray-400">
								Activación del módulo, salida de cocina y estructura de mesas.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{data.modules.restaurants.entitlementStatus === "blocked" ? (
								<Alert className="border-gray-700 bg-black/10 text-[var(--color-photon)]">
									<AlertTitle>Módulo bloqueado</AlertTitle>
									<AlertDescription>
										Esta organización no tiene entitlement para restaurantes.
									</AlertDescription>
								</Alert>
							) : null}

							<div className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/10 p-4">
								<div>
									<p className="font-medium text-white">Activar módulo</p>
									<p className="text-sm text-gray-400">
										Muestra rutas y habilita el flujo de mesas.
									</p>
								</div>
								<Switch
									checked={draftSettings.modules.restaurants.enabled}
									disabled={!data.modules.restaurants.canManageToggle}
									onCheckedChange={(checked) =>
										setDraftSettings((currentValue) => ({
											...currentValue,
											modules: {
												...currentValue.modules,
												restaurants: {
													...currentValue.modules.restaurants,
													enabled: checked,
												},
											},
										}))
									}
								/>
							</div>

							<div className="grid gap-3">
								<div className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/10 p-4">
									<div>
										<p className="font-medium text-white">Pantalla de cocina</p>
										<p className="text-sm text-gray-400">
											Habilita la ruta interna de cocina.
										</p>
									</div>
									<Switch
										checked={draftSettings.restaurants.kitchen.displayEnabled}
										disabled={!canManageSettings}
										onCheckedChange={(checked) =>
											setDraftSettings((currentValue) => ({
												...currentValue,
												restaurants: {
													...currentValue.restaurants,
													kitchen: {
														...currentValue.restaurants.kitchen,
														displayEnabled: checked,
													},
												},
											}))
										}
									/>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/10 p-4">
									<div>
										<p className="font-medium text-white">Imprimir comandas</p>
										<p className="text-sm text-gray-400">
											Permite imprimir ticket de cocina al enviar.
										</p>
									</div>
									<Switch
										checked={draftSettings.restaurants.kitchen.printTicketsEnabled}
										disabled={!canManageSettings}
										onCheckedChange={(checked) =>
											setDraftSettings((currentValue) => ({
												...currentValue,
												restaurants: {
													...currentValue.restaurants,
													kitchen: {
														...currentValue.restaurants.kitchen,
														printTicketsEnabled: checked,
													},
												},
											}))
										}
									/>
								</div>
								<div className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/10 p-4">
									<div>
										<p className="font-medium text-white">Auto imprimir</p>
										<p className="text-sm text-gray-400">
											Dispara impresión inmediata al enviar a cocina.
										</p>
									</div>
									<Switch
										checked={draftSettings.restaurants.kitchen.autoPrintOnSend}
										disabled={
											!canManageSettings ||
											!draftSettings.restaurants.kitchen.printTicketsEnabled
										}
										onCheckedChange={(checked) =>
											setDraftSettings((currentValue) => ({
												...currentValue,
												restaurants: {
													...currentValue.restaurants,
													kitchen: {
														...currentValue.restaurants.kitchen,
														autoPrintOnSend: checked,
													},
												},
											}))
										}
									/>
								</div>
							</div>

							<Separator className="border-gray-800" />

							<div className="space-y-4">
								<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
									<div className="grid gap-2">
										<Label htmlFor="new-area-name">Agregar zona</Label>
										<Input
											id="new-area-name"
											name="new-area-name"
											value={newAreaName}
											onChange={(event) => setNewAreaName(event.target.value)}
											placeholder="Ej. Salón, Terraza, Barra…"
											autoComplete="off"
											className="border-gray-700 bg-black/20"
											disabled={!canManageSettings}
										/>
									</div>
									<div className="flex items-end">
										<Button
											type="button"
											variant="outline"
											onClick={handleCreateArea}
											disabled={
												!canManageSettings ||
												createRestaurantAreaMutation.isPending
											}
											className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
										>
											<Plus className="h-4 w-4" />
											Agregar zona
										</Button>
									</div>
								</div>

								<div className="space-y-3">
									{data.restaurantConfiguration.map((area) => (
										<div
											key={area.id}
											className="rounded-lg border border-gray-800 bg-black/10 p-4"
										>
											<div className="flex items-center justify-between gap-3">
												<div className="font-medium text-white">{area.name}</div>
												<Button
													type="button"
													variant="outline"
													onClick={() => {
														const confirmed = window.confirm(
															"¿Eliminar esta zona? Solo funciona si ya no tiene mesas.",
														);
														if (!confirmed) {
															return;
														}
														deleteRestaurantAreaMutation.mutate({
															id: area.id,
														});
													}}
													disabled={
														!canManageSettings ||
														deleteRestaurantAreaMutation.isPending ||
														area.tables.length > 0
													}
													className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
												>
													<Trash2 className="h-4 w-4" />
													Eliminar
												</Button>
											</div>

											<div className="mt-4 space-y-2">
												{area.tables.map((table) => (
													<div
														key={table.id}
														className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2"
													>
														<div className="min-w-0">
															<div className="truncate">{table.name}</div>
															<div className="text-xs text-gray-400">
																{table.seats > 0
																	? `${table.seats} puestos`
																	: "Sin capacidad definida"}
															</div>
														</div>
														<div className="flex items-center gap-3">
															<Switch
																checked={table.isActive}
																disabled={
																	!canManageSettings ||
																	updateRestaurantTableMutation.isPending
																}
																onCheckedChange={(checked) =>
																	updateRestaurantTableMutation.mutate({
																		id: table.id,
																		isActive: checked,
																	})
																}
															/>
															<Button
																type="button"
																variant="outline"
																onClick={() => {
																	const confirmed = window.confirm(
																		"¿Eliminar esta mesa? Si ya tiene historial, la operación será rechazada.",
																	);
																	if (!confirmed) {
																		return;
																	}
																	deleteRestaurantTableMutation.mutate({
																		id: table.id,
																	});
																}}
																disabled={
																	!canManageSettings ||
																	deleteRestaurantTableMutation.isPending
																}
																className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
																aria-label={`Eliminar ${table.name}`}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</div>
												))}
											</div>

											<div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
												<Input
													name={`table-name-${area.id}`}
													value={newTableDrafts[area.id]?.name ?? ""}
													onChange={(event) =>
														setNewTableDrafts((currentValue) => ({
															...currentValue,
															[area.id]: {
																name: event.target.value,
																seats:
																	currentValue[area.id]?.seats ?? "",
															},
														}))
													}
													placeholder="Nueva mesa…"
													autoComplete="off"
													className="border-gray-700 bg-black/20"
													disabled={!canManageSettings}
												/>
												<Input
													name={`table-seats-${area.id}`}
													type="number"
													min={0}
													value={newTableDrafts[area.id]?.seats ?? ""}
													onChange={(event) =>
														setNewTableDrafts((currentValue) => ({
															...currentValue,
															[area.id]: {
																name: currentValue[area.id]?.name ?? "",
																seats: event.target.value,
															},
														}))
													}
													placeholder="Puestos"
													className="border-gray-700 bg-black/20"
													disabled={!canManageSettings}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={() => handleCreateTable(area.id)}
													disabled={
														!canManageSettings ||
														createRestaurantTableMutation.isPending
													}
													className="border-gray-700 bg-transparent text-gray-100 hover:bg-white/5"
												>
													<Plus className="h-4 w-4" />
													Mesa
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="h-4 w-4 text-[var(--color-voltage)]" />
								Crédito
							</CardTitle>
							<CardDescription className="text-gray-400">
								Parámetros base para ventas fiadas y cartera.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-black/20 p-4">
								<div>
									<p className="font-medium text-white">
										Permitir ventas a crédito
									</p>
									<p className="text-sm text-gray-400">
										Controla si el checkout puede dejar saldo pendiente.
									</p>
								</div>
								<Switch
									checked={draftSettings.credit.allowCreditSales}
									onCheckedChange={(checked) =>
										setDraftSettings((currentValue) => ({
											...currentValue,
											credit: {
												...currentValue.credit,
												allowCreditSales: checked,
											},
										}))
									}
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor={defaultInterestRateId}>
									Tasa de interés por defecto (%)
								</Label>
								<Input
									id={defaultInterestRateId}
									type="number"
									min={0}
									max={100}
									value={draftSettings.credit.defaultInterestRate}
									onChange={(event) =>
										setDraftSettings((currentValue) => ({
											...currentValue,
											credit: {
												...currentValue.credit,
												defaultInterestRate: Math.min(
													100,
													Math.max(0, Number(event.target.value) || 0),
												),
											},
										}))
									}
									className="border-gray-700 bg-black/20"
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-4 w-4 text-[var(--color-voltage)]" />
								Inventario
							</CardTitle>
							<CardDescription className="text-gray-400">
								Estos valores ya alimentan alertas y sirven como defaults
								operativos.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor={lowStockThresholdId}>
										Umbral de stock bajo
									</Label>
									<Input
										id={lowStockThresholdId}
										type="number"
										min={0}
										value={draftSettings.inventory.lowStockThreshold}
										onChange={(event) =>
											setDraftSettings((currentValue) => ({
												...currentValue,
												inventory: {
													...currentValue.inventory,
													lowStockThreshold: Math.max(
														0,
														Number(event.target.value) || 0,
													),
												},
											}))
										}
										className="border-gray-700 bg-black/20"
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor={defaultTaxRateId}>
										Impuesto por defecto (%)
									</Label>
									<Input
										id={defaultTaxRateId}
										type="number"
										min={0}
										max={100}
										value={draftSettings.inventory.defaultTaxRate}
										onChange={(event) =>
											setDraftSettings((currentValue) => ({
												...currentValue,
												inventory: {
													...currentValue.inventory,
													defaultTaxRate: Math.min(
														100,
														Math.max(0, Number(event.target.value) || 0),
													),
												},
											}))
										}
										className="border-gray-700 bg-black/20"
									/>
								</div>
							</div>

							<div className="space-y-3">
								<ToggleRow
									title="Controlar inventario en productos nuevos"
									description="Sirve como preferencia operativa por defecto."
									checked={draftSettings.inventory.trackInventoryByDefault}
									onCheckedChange={(checked) =>
										setDraftSettings((currentValue) => ({
											...currentValue,
											inventory: {
												...currentValue.inventory,
												trackInventoryByDefault: checked,
											},
										}))
									}
								/>
								<ToggleRow
									title="Permitir modificadores por defecto"
									description="Útil para catálogos con extras y adiciones frecuentes."
									checked={draftSettings.inventory.modifiersEnabledByDefault}
									onCheckedChange={(checked) =>
										setDraftSettings((currentValue) => ({
											...currentValue,
											inventory: {
												...currentValue.inventory,
												modifiersEnabledByDefault: checked,
											},
										}))
									}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
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
	icon: typeof Building2;
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
						<CardTitle className="mt-1 text-xl font-semibold tracking-tight text-white">
							{value}
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<p className="text-sm leading-6 text-gray-400">{description}</p>
			</CardContent>
		</Card>
	);
}

function ToggleRow({
	title,
	description,
	checked,
	onCheckedChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-black/20 p-4">
			<div>
				<p className="font-medium text-white">{title}</p>
				<p className="text-sm text-gray-400">{description}</p>
			</div>
			<Switch checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}
