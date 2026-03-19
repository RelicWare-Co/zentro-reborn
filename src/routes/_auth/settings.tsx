import { createFileRoute } from "@tanstack/react-router";
import {
	Building2,
	CreditCard,
	Package,
	Save,
	Settings2,
	Store,
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
	useSettings,
	useUpdateSettingsMutation,
} from "@/features/settings/hooks/use-settings";
import { getSettings } from "@/features/settings/settings.functions";
import {
	normalizeOrganizationSettings,
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

	const [draftSettings, setDraftSettings] = useState<OrganizationSettings>(() =>
		normalizeOrganizationSettings(loaderData.settings),
	);
	const [showSavedMessage, setShowSavedMessage] = useState(false);
	const defaultTerminalNameId = useId();
	const defaultStartingCashId = useId();
	const defaultInterestRateId = useId();
	const lowStockThresholdId = useId();
	const defaultTaxRateId = useId();

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
		methodId: OrganizationPaymentMethodSettings["id"],
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

	const handleSave = async () => {
		await updateSettingsMutation.mutateAsync({
			settings: draftSettings,
		});
		setShowSavedMessage(true);
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
						disabled={!hasChanges || updateSettingsMutation.isPending}
						className="border-gray-700 bg-[var(--color-carbon)] text-gray-200 hover:bg-white/5 hover:text-white"
					>
						Restablecer
					</Button>
					<Button
						onClick={handleSave}
						disabled={!hasChanges || updateSettingsMutation.isPending}
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
									Los deshabilitados no aparecerán en el checkout para nuevas
									ventas.
								</p>
							</div>

							<div className="space-y-3">
								{draftSettings.pos.paymentMethods.map((paymentMethod) => (
									<div
										key={paymentMethod.id}
										className="rounded-2xl border border-gray-800 bg-black/20 p-4"
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
											<div>
												<p className="font-medium text-white">
													{paymentMethod.label}
												</p>
												<p className="text-sm text-gray-400">
													{paymentMethod.id === "cash"
														? "Siempre disponible para cierre de caja."
														: "Puedes pedir referencia para validar el pago."}
												</p>
											</div>

											<div className="flex flex-wrap items-center gap-6">
												<div className="flex items-center gap-3">
													<Switch
														checked={paymentMethod.enabled}
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
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
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
