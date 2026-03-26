import { createFileRoute } from "@tanstack/react-router";
import {
	Building2,
	Copy,
	Link2,
	Mail,
	ShieldCheck,
	Users,
	XCircle,
} from "lucide-react";
import { useId, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useCreateOrganizationJoinLinkMutation,
	useOrganizationManagement,
	useRevokeOrganizationJoinLinkMutation,
} from "@/features/organization/hooks/use-organization";
import { getOrganizationManagementData } from "@/features/organization/organization.functions";
import {
	formatJoinLinkStatusLabel,
	formatOrganizationRoleLabel,
	isJoinLinkActive,
	JOIN_LINK_EXPIRY_OPTIONS,
} from "@/features/organization/organization.shared";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "short",
	hour: "numeric",
	minute: "2-digit",
});

export const Route = createFileRoute("/_auth/organization")({
	loader: () => getOrganizationManagementData(),
	component: OrganizationPage,
});

function OrganizationPage() {
	const loaderData = Route.useLoaderData();
	const { data = loaderData } = useOrganizationManagement(loaderData);
	const createJoinLinkMutation = useCreateOrganizationJoinLinkMutation();
	const revokeJoinLinkMutation = useRevokeOrganizationJoinLinkMutation();
	const labelId = useId();
	const expiryId = useId();
	const [joinLinkLabel, setJoinLinkLabel] = useState("");
	const [expiresInDays, setExpiresInDays] = useState("7");
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
	const [latestJoinUrl, setLatestJoinUrl] = useState<string | null>(null);

	const createJoinUrl = (joinPath: string) =>
		new URL(joinPath, window.location.origin).toString();

	const handleCopyJoinUrl = async (joinPath: string) => {
		const joinUrl = createJoinUrl(joinPath);
		await navigator.clipboard.writeText(joinUrl);
		setFeedbackMessage("Enlace copiado. Ya puedes compartirlo con el cliente.");
	};

	const handleCreateJoinLink = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		setFeedbackMessage(null);

		try {
			const result = await createJoinLinkMutation.mutateAsync({
				label: joinLinkLabel || undefined,
				expiresInDays: Number(expiresInDays),
			});
			const joinUrl = createJoinUrl(result.joinPath);
			setLatestJoinUrl(joinUrl);
			setJoinLinkLabel("");
			await navigator.clipboard.writeText(joinUrl);
			setFeedbackMessage(
				"Enlace creado y copiado. El cliente puede usarlo de inmediato.",
			);
		} catch (error) {
			setLatestJoinUrl(null);
			setFeedbackMessage(
				error instanceof Error
					? error.message
					: "No se pudo crear el enlace de acceso.",
			);
		}
	};

	const handleRevokeJoinLink = async (joinLinkId: string) => {
		const shouldRevoke = window.confirm(
			"¿Quieres revocar este enlace? El acceso dejará de funcionar de inmediato.",
		);

		if (!shouldRevoke) {
			return;
		}

		setFeedbackMessage(null);
		try {
			await revokeJoinLinkMutation.mutateAsync({ joinLinkId });
			setFeedbackMessage("El enlace fue revocado.");
		} catch (error) {
			setFeedbackMessage(
				error instanceof Error
					? error.message
					: "No se pudo revocar el enlace.",
			);
		}
	};

	return (
		<main className="flex-1 space-y-6 bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-8 lg:p-12">
			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
						Organización
					</Badge>
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight text-balance">
							Organización y Acceso
						</h1>
						<p className="max-w-3xl text-sm text-gray-400 md:text-base">
							Controla quién entra, qué enlaces siguen activos y cómo se
							incorpora cada cliente a la organización actual.
						</p>
					</div>
				</div>
				<div className="rounded-2xl border border-gray-800 bg-[var(--color-carbon)] px-4 py-3">
					<p className="text-xs uppercase tracking-[0.18em] text-gray-500">
						Organización activa
					</p>
					<p className="mt-1 text-lg font-semibold text-white">
						{data.organization.name}
					</p>
					<p className="text-sm text-gray-400">/{data.organization.slug}</p>
				</div>
			</section>

			<div aria-live="polite" className="space-y-3">
				{feedbackMessage ? (
					<Alert className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-photon)]">
						<AlertTitle>Estado</AlertTitle>
						<AlertDescription>{feedbackMessage}</AlertDescription>
					</Alert>
				) : null}

				{(createJoinLinkMutation.error instanceof Error ||
					revokeJoinLinkMutation.error instanceof Error) &&
				!feedbackMessage ? (
					<Alert
						variant="destructive"
						className="border-red-500/20 bg-red-500/10 text-red-100"
					>
						<AlertTitle>No se pudo completar la acción</AlertTitle>
						<AlertDescription>
							{createJoinLinkMutation.error instanceof Error
								? createJoinLinkMutation.error.message
								: revokeJoinLinkMutation.error instanceof Error
									? revokeJoinLinkMutation.error.message
									: "Vuelve a intentarlo."}
						</AlertDescription>
					</Alert>
				) : null}
			</div>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Tu rol"
					value={formatOrganizationRoleLabel(data.viewer.role)}
					description="Permisos sobre esta organización"
					icon={ShieldCheck}
				/>
				<SummaryCard
					title="Miembros"
					value={`${data.stats.membersCount}`}
					description="Usuarios con acceso activo"
					icon={Users}
				/>
				<SummaryCard
					title="Invitaciones"
					value={`${data.stats.pendingInvitationsCount}`}
					description="Pendientes en Better Auth"
					icon={Mail}
				/>
				<SummaryCard
					title="Join Links"
					value={`${data.stats.activeJoinLinksCount}`}
					description="Links disponibles ahora"
					icon={Link2}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Link2 className="h-4 w-4 text-[var(--color-voltage)]" />
							Acceso por Link
						</CardTitle>
						<CardDescription className="text-gray-400">
							Crea enlaces directos para que un cliente se registre o inicie
							sesión y entre a esta organización sin flujo por correo.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{data.viewer.canManageAccess ? (
							<form
								onSubmit={handleCreateJoinLink}
								className="grid gap-4 rounded-2xl border border-gray-800 bg-black/20 p-4 md:grid-cols-[1fr_180px_auto]"
							>
								<div className="space-y-2">
									<Label htmlFor={labelId}>Referencia del cliente</Label>
									<Input
										id={labelId}
										name="joinLinkLabel"
										value={joinLinkLabel}
										onChange={(event) => setJoinLinkLabel(event.target.value)}
										placeholder="Ej. Cliente Centro…"
										autoComplete="off"
										className="border-gray-800 bg-black/30"
										disabled={createJoinLinkMutation.isPending}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={expiryId}>Vigencia</Label>
									<Select
										value={expiresInDays}
										onValueChange={setExpiresInDays}
										disabled={createJoinLinkMutation.isPending}
									>
										<SelectTrigger
											id={expiryId}
											className="border-gray-800 bg-black/30"
										>
											<SelectValue placeholder="Selecciona" />
										</SelectTrigger>
										<SelectContent>
											{JOIN_LINK_EXPIRY_OPTIONS.map((option) => (
												<SelectItem
													key={option.value}
													value={String(option.value)}
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex items-end">
									<Button
										type="submit"
										className="w-full bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
										disabled={createJoinLinkMutation.isPending}
									>
										{createJoinLinkMutation.isPending
											? "Creando…"
											: "Crear Link"}
									</Button>
								</div>
							</form>
						) : (
							<Alert className="border-amber-500/20 bg-amber-500/10 text-amber-100">
								<AlertTitle>Acceso restringido</AlertTitle>
								<AlertDescription>
									Solo owners y admins pueden crear o revocar enlaces de acceso.
								</AlertDescription>
							</Alert>
						)}

						{latestJoinUrl ? (
							<div className="space-y-2 rounded-2xl border border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 p-4">
								<p className="text-sm font-medium text-white">
									Último enlace generado
								</p>
								<div className="flex flex-col gap-3 md:flex-row">
									<Input
										readOnly
										value={latestJoinUrl}
										name="latestJoinLink"
										aria-label="Último enlace generado"
										className="border-[var(--color-voltage)]/20 bg-black/20"
									/>
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											navigator.clipboard.writeText(latestJoinUrl).then(() => {
												setFeedbackMessage("Enlace copiado nuevamente.");
											})
										}
										className="border-[var(--color-voltage)]/20 bg-black/20 text-white hover:bg-black/30"
									>
										<Copy className="h-4 w-4" />
										Copiar
									</Button>
								</div>
							</div>
						) : null}

						<div className="overflow-hidden rounded-2xl border border-gray-800">
							<Table>
								<TableHeader>
									<TableRow className="border-gray-800 hover:bg-transparent">
										<TableHead>Referencia</TableHead>
										<TableHead>Estado</TableHead>
										<TableHead>Expira</TableHead>
										<TableHead>Uso</TableHead>
										<TableHead className="text-right">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.joinLinks.length > 0 ? (
										data.joinLinks.map((joinLink) => (
											<TableRow
												key={joinLink.id}
												className="border-gray-800 hover:bg-white/[0.03]"
											>
												<TableCell className="min-w-0">
													<div className="min-w-0">
														<p className="truncate font-medium text-white">
															{joinLink.label || "Sin referencia"}
														</p>
														<p className="truncate text-xs text-gray-500">
															{joinLink.lastUsedAt
																? `Último uso ${dateTimeFormatter.format(joinLink.lastUsedAt)}`
																: "Sin uso todavía"}
														</p>
													</div>
												</TableCell>
												<TableCell>
													<JoinLinkStatusBadge status={joinLink.status} />
												</TableCell>
												<TableCell className="text-sm text-gray-300">
													{joinLink.expiresAt
														? dateTimeFormatter.format(joinLink.expiresAt)
														: "Sin límite"}
												</TableCell>
												<TableCell className="text-sm text-gray-300">
													{joinLink.useCount}/{joinLink.maxUses}
												</TableCell>
												<TableCell>
													<div className="flex justify-end gap-2">
														<Button
															type="button"
															variant="outline"
															onClick={() =>
																handleCopyJoinUrl(joinLink.joinPath)
															}
															disabled={!isJoinLinkActive(joinLink.status)}
															className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
														>
															<Copy className="h-4 w-4" />
															Copiar
														</Button>
														{data.viewer.canManageAccess ? (
															<Button
																type="button"
																variant="outline"
																onClick={() =>
																	handleRevokeJoinLink(joinLink.id)
																}
																disabled={
																	joinLink.status === "revoked" ||
																	revokeJoinLinkMutation.isPending
																}
																className="border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10 hover:text-red-100"
															>
																<XCircle className="h-4 w-4" />
																Revocar
															</Button>
														) : null}
													</div>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow className="border-gray-800 hover:bg-transparent">
											<TableCell
												colSpan={5}
												className="py-10 text-center text-sm text-gray-400"
											>
												Aún no has creado enlaces de acceso para esta
												organización.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Building2 className="h-4 w-4 text-[var(--color-voltage)]" />
							Modo de Alta
						</CardTitle>
						<CardDescription className="text-gray-400">
							Define cómo entra gente nueva y qué hacer cuando no hay
							invitaciones disponibles.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
							<p className="text-xs uppercase tracking-[0.18em] text-gray-500">
								Creación libre
							</p>
							<p className="mt-2 text-lg font-semibold text-white">
								{data.policy.allowOrganizationCreation
									? "Habilitada"
									: "Deshabilitada"}
							</p>
							<p className="mt-2 text-sm text-gray-400">
								{data.policy.contactMessage}
							</p>
						</div>

						<div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
							<p className="text-xs uppercase tracking-[0.18em] text-gray-500">
								Canal recomendado
							</p>
							<p className="mt-2 text-sm text-gray-300">
								Si el cliente no tiene invitaciones ni link activo, debe pedir
								acceso a un administrador.
							</p>
							{data.policy.contactHref ? (
								<Button
									asChild
									variant="outline"
									className="mt-4 border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
								>
									<a
										href={data.policy.contactHref}
										target="_blank"
										rel="noreferrer"
									>
										{data.policy.contactLabel}
									</a>
								</Button>
							) : (
								<p className="mt-4 text-sm font-medium text-white">
									{data.policy.contactLabel}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Miembros Activos</CardTitle>
						<CardDescription className="text-gray-400">
							Visibilidad rápida del equipo que hoy tiene acceso al espacio.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-hidden rounded-2xl border border-gray-800">
							<Table>
								<TableHeader>
									<TableRow className="border-gray-800 hover:bg-transparent">
										<TableHead>Usuario</TableHead>
										<TableHead>Rol</TableHead>
										<TableHead>Ingreso</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.members.map((memberRow) => (
										<TableRow
											key={memberRow.memberId}
											className="border-gray-800 hover:bg-white/[0.03]"
										>
											<TableCell className="min-w-0">
												<div className="min-w-0">
													<p className="truncate font-medium text-white">
														{memberRow.name}
													</p>
													<p className="truncate text-sm text-gray-400">
														{memberRow.email}
													</p>
												</div>
											</TableCell>
											<TableCell className="text-sm text-gray-300">
												{formatOrganizationRoleLabel(memberRow.role)}
											</TableCell>
											<TableCell className="text-sm text-gray-300">
												{memberRow.joinedAt
													? dateFormatter.format(memberRow.joinedAt)
													: "Sin fecha"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle>Invitaciones Pendientes</CardTitle>
						<CardDescription className="text-gray-400">
							Compatibilidad con invitaciones existentes de Better Auth.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.pendingInvitations.length > 0 ? (
							data.pendingInvitations.map((invitation) => (
								<div
									key={invitation.id}
									className="rounded-2xl border border-gray-800 bg-black/20 p-4"
								>
									<p className="font-medium text-white">{invitation.email}</p>
									<p className="mt-1 text-sm text-gray-400">
										Rol: {formatOrganizationRoleLabel(invitation.role)}
									</p>
									<p className="mt-2 text-xs text-gray-500">
										Expira{" "}
										{invitation.expiresAt
											? dateTimeFormatter.format(invitation.expiresAt)
											: "sin fecha"}
									</p>
								</div>
							))
						) : (
							<div className="rounded-2xl border border-dashed border-gray-800 bg-black/10 p-6 text-sm text-gray-400">
								No hay invitaciones pendientes. Para nuevos accesos usa join
								links desde esta misma página.
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</main>
	);
}

function SummaryCard(props: {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	const Icon = props.icon;

	return (
		<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
			<CardHeader className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<CardDescription className="text-gray-400">
						{props.title}
					</CardDescription>
					<div className="rounded-lg bg-[var(--color-voltage)]/10 p-2 text-[var(--color-voltage)]">
						<Icon className="h-4 w-4" />
					</div>
				</div>
				<CardTitle className="text-3xl">{props.value}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-gray-400">{props.description}</p>
			</CardContent>
		</Card>
	);
}

function JoinLinkStatusBadge(props: {
	status: "active" | "expired" | "used" | "revoked";
}) {
	const className =
		props.status === "active"
			? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
			: props.status === "used"
				? "border-sky-500/30 bg-sky-500/10 text-sky-200"
				: props.status === "revoked"
					? "border-red-500/30 bg-red-500/10 text-red-200"
					: "border-amber-500/30 bg-amber-500/10 text-amber-200";

	return (
		<Badge variant="outline" className={className}>
			{formatJoinLinkStatusLabel(props.status)}
		</Badge>
	);
}
