import { createFileRoute } from "@tanstack/react-router";
import {
	Copy,
	Link2,
	Mail,
	Settings,
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

type Section = "access" | "members" | "settings";

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
	const [activeSection, setActiveSection] = useState<Section>("access");

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
		<div className="flex-1 bg-[var(--color-void)] min-h-screen">
			<div className="mx-auto max-w-7xl min-h-screen flex flex-col">
				{/* Header */}
				<header className="border-b border-gray-800 px-6 py-6 md:px-8 lg:px-12 shrink-0">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight text-white">
								{data.organization.name}
							</h1>
							<div className="flex items-center gap-2 text-sm text-gray-400">
								<span>/{data.organization.slug}</span>
								<span className="text-gray-600">•</span>
								<span className="inline-flex items-center gap-1">
									<ShieldCheck className="h-3.5 w-3.5 text-[var(--color-voltage)]" />
									{formatOrganizationRoleLabel(data.viewer.role)}
								</span>
							</div>
						</div>
						<div className="flex gap-4">
							<div className="text-right">
								<p className="text-xs uppercase tracking-wider text-gray-500">
									Miembros
								</p>
								<p className="text-lg font-semibold text-white">
									{data.stats.membersCount}
								</p>
							</div>
							<div className="w-px bg-gray-800" />
							<div className="text-right">
								<p className="text-xs uppercase tracking-wider text-gray-500">
									Links
								</p>
								<p className="text-lg font-semibold text-white">
									{data.stats.activeJoinLinksCount}
								</p>
							</div>
						</div>
					</div>
				</header>

				{/* Layout con Sidebar */}
				<div className="flex flex-1 flex-col lg:flex-row">
					{/* Sidebar Navigation */}
					<aside className="border-b border-gray-800 lg:w-64 lg:border-b-0 lg:border-r lg:flex-shrink-0">
						<nav className="flex lg:flex-col">
							<NavItem
								icon={Link2}
								label="Acceso y Links"
								isActive={activeSection === "access"}
								onClick={() => setActiveSection("access")}
							/>
							<NavItem
								icon={Users}
								label="Miembros"
								isActive={activeSection === "members"}
								onClick={() => setActiveSection("members")}
								badge={
									data.pendingInvitations.length > 0
										? data.pendingInvitations.length
										: undefined
								}
							/>
							<NavItem
								icon={Settings}
								label="Configuración"
								isActive={activeSection === "settings"}
								onClick={() => setActiveSection("settings")}
							/>
						</nav>
					</aside>

					{/* Main Content */}
					<main className="flex-1 p-6 md:p-8 lg:p-12 text-[var(--color-photon)]">
						<div className="space-y-6 max-w-4xl">
							{/* Feedback Messages */}
							<div aria-live="polite" className="space-y-2">
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

							{/* Section: Access */}
							{activeSection === "access" && (
								<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
									<div className="grid gap-6 lg:grid-cols-3">
										{/* Create Link Form */}
										<Card className="col-span-2 border-gray-800 bg-[var(--color-carbon)] shadow-none">
											<CardHeader className="pb-4">
												<CardTitle className="text-lg">
													Crear Nuevo Link de Acceso
												</CardTitle>
												<CardDescription className="text-gray-400">
													Genera enlaces directos para nuevos miembros
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												{data.viewer.canManageAccess ? (
													<form
														onSubmit={handleCreateJoinLink}
														className="space-y-4"
													>
														<div className="grid gap-4 sm:grid-cols-2">
															<div className="space-y-2">
																<Label htmlFor={labelId}>Referencia</Label>
																<Input
																	id={labelId}
																	name="joinLinkLabel"
																	value={joinLinkLabel}
																	onChange={(event) =>
																		setJoinLinkLabel(event.target.value)
																	}
																	placeholder="Ej. Cliente Centro..."
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
														</div>
														<Button
															type="submit"
															className="w-full bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c] sm:w-auto"
															disabled={createJoinLinkMutation.isPending}
														>
															{createJoinLinkMutation.isPending
																? "Creando..."
																: "Crear Link de Acceso"}
														</Button>
													</form>
												) : (
													<Alert className="border-amber-500/20 bg-amber-500/10 text-amber-100">
														<AlertTitle>Acceso restringido</AlertTitle>
														<AlertDescription>
															Solo owners y admins pueden crear o revocar
															enlaces de acceso.
														</AlertDescription>
													</Alert>
												)}

												{latestJoinUrl ? (
													<div className="space-y-2 rounded-xl border border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 p-4">
														<p className="text-sm font-medium text-white">
															Último enlace generado
														</p>
														<div className="flex gap-2">
															<Input
																readOnly
																value={latestJoinUrl}
																className="flex-1 border-[var(--color-voltage)]/20 bg-black/20 text-sm"
															/>
															<Button
																type="button"
																variant="outline"
																onClick={() =>
																	navigator.clipboard
																		.writeText(latestJoinUrl)
																		.then(() => {
																			setFeedbackMessage(
																				"Enlace copiado nuevamente.",
																			);
																		})
																}
																className="border-[var(--color-voltage)]/20 bg-black/20 text-white"
															>
																<Copy className="h-4 w-4" />
															</Button>
														</div>
													</div>
												) : null}
											</CardContent>
										</Card>

										{/* Quick Stats */}
										<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
											<CardHeader className="pb-4">
												<CardTitle className="text-lg">Modo de Alta</CardTitle>
												<CardDescription className="text-gray-400">
													Configuración de invitaciones
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="space-y-2">
													<p className="text-xs uppercase tracking-wider text-gray-500">
														Creación Libre
													</p>
													<Badge
														variant="outline"
														className={
															data.policy.allowOrganizationCreation
																? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
																: "border-gray-700 bg-gray-800 text-gray-400"
														}
													>
														{data.policy.allowOrganizationCreation
															? "Habilitada"
															: "Deshabilitada"}
													</Badge>
												</div>
												<p className="text-sm text-gray-400">
													{data.policy.contactMessage}
												</p>
												{data.policy.contactHref ? (
													<Button
														asChild
														variant="outline"
														className="w-full border-gray-700 bg-transparent text-gray-200 hover:bg-white/5"
													>
														<a
															href={data.policy.contactHref}
															target="_blank"
															rel="noreferrer"
														>
															{data.policy.contactLabel}
														</a>
													</Button>
												) : null}
											</CardContent>
										</Card>
									</div>

									{/* Links List */}
									<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
										<CardHeader className="pb-4">
											<div className="flex items-center justify-between">
												<CardTitle className="text-lg">
													Links de Acceso Activos
												</CardTitle>
												<Badge variant="outline" className="text-gray-400">
													{data.joinLinks.length} total
												</Badge>
											</div>
										</CardHeader>
										<CardContent>
											{data.joinLinks.length > 0 ? (
												<div className="space-y-3">
													{data.joinLinks.map((joinLink) => (
														<div
															key={joinLink.id}
															className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
														>
															<div className="flex-1 min-w-0 space-y-1">
																<div className="flex items-center gap-2">
																	<p className="font-medium text-white truncate">
																		{joinLink.label || "Sin referencia"}
																	</p>
																	<JoinLinkStatusBadge
																		status={joinLink.status}
																	/>
																</div>
																<p className="text-xs text-gray-500">
																	{joinLink.lastUsedAt
																		? `Último uso ${dateTimeFormatter.format(
																				joinLink.lastUsedAt,
																			)}`
																		: "Sin uso todavía"}
																	<span className="mx-2 text-gray-700">•</span>
																	Expira:{" "}
																	{joinLink.expiresAt
																		? dateTimeFormatter.format(
																				joinLink.expiresAt,
																			)
																		: "Sin límite"}
																	<span className="mx-2 text-gray-700">•</span>
																	Uso: {joinLink.useCount}/{joinLink.maxUses}
																</p>
															</div>
															<div className="flex gap-2">
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		handleCopyJoinUrl(joinLink.joinPath)
																	}
																	disabled={!isJoinLinkActive(joinLink.status)}
																	className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5"
																>
																	<Copy className="mr-1.5 h-3.5 w-3.5" />
																	Copiar
																</Button>
																{data.viewer.canManageAccess ? (
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleRevokeJoinLink(joinLink.id)
																		}
																		disabled={
																			joinLink.status === "revoked" ||
																			revokeJoinLinkMutation.isPending
																		}
																		className="border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10"
																	>
																		<XCircle className="mr-1.5 h-3.5 w-3.5" />
																		Revocar
																	</Button>
																) : null}
															</div>
														</div>
													))}
												</div>
											) : (
												<div className="rounded-xl border border-dashed border-gray-800 bg-black/10 p-8 text-center">
													<p className="text-sm text-gray-500">
														No hay links de acceso creados todavía
													</p>
													<p className="text-xs text-gray-600 mt-1">
														Usa el formulario de arriba para crear uno nuevo
													</p>
												</div>
											)}
										</CardContent>
									</Card>
								</div>
							)}

							{/* Section: Members */}
							{activeSection === "members" && (
								<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
									<div className="grid gap-6 lg:grid-cols-3">
										{/* Members List */}
										<Card className="col-span-2 border-gray-800 bg-[var(--color-carbon)] shadow-none">
											<CardHeader className="pb-4">
												<div className="flex items-center justify-between">
													<CardTitle className="text-lg">
														Miembros Activos
													</CardTitle>
													<Badge variant="outline" className="text-gray-400">
														{data.members.length} total
													</Badge>
												</div>
											</CardHeader>
											<CardContent>
												{data.members.length > 0 ? (
													<div className="space-y-2">
														{data.members.map((memberRow) => (
															<div
																key={memberRow.memberId}
																className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 p-4"
															>
																<div className="flex items-center gap-3 min-w-0">
																	<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800">
																		<span className="text-sm font-medium text-gray-400">
																			{memberRow.name.charAt(0).toUpperCase()}
																		</span>
																	</div>
																	<div className="min-w-0">
																		<p className="font-medium text-white truncate">
																			{memberRow.name}
																		</p>
																		<p className="text-sm text-gray-500 truncate">
																			{memberRow.email}
																		</p>
																	</div>
																</div>
																<div className="text-right">
																	<Badge
																		variant="outline"
																		className="text-gray-300"
																	>
																		{formatOrganizationRoleLabel(
																			memberRow.role,
																		)}
																	</Badge>
																	<p className="mt-1 text-xs text-gray-500">
																		{memberRow.joinedAt
																			? `Ingresó ${dateFormatter.format(
																					memberRow.joinedAt,
																				)}`
																			: "Sin fecha"}
																	</p>
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="rounded-xl border border-dashed border-gray-800 bg-black/10 p-8 text-center">
														<p className="text-sm text-gray-500">
															No hay miembros en la organización
														</p>
													</div>
												)}
											</CardContent>
										</Card>

										{/* Pending Invitations */}
										<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
											<CardHeader className="pb-4">
												<div className="flex items-center justify-between">
													<CardTitle className="text-lg">
														<Mail className="inline-block mr-2 h-4 w-4" />
														Invitaciones
													</CardTitle>
													{data.pendingInvitations.length > 0 ? (
														<Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">
															{data.pendingInvitations.length} pendientes
														</Badge>
													) : (
														<Badge variant="outline" className="text-gray-500">
															0 pendientes
														</Badge>
													)}
												</div>
												<CardDescription className="text-gray-400">
													Invitaciones pendientes de Better Auth
												</CardDescription>
											</CardHeader>
											<CardContent>
												{data.pendingInvitations.length > 0 ? (
													<div className="space-y-3">
														{data.pendingInvitations.map((invitation) => (
															<div
																key={invitation.id}
																className="rounded-xl border border-gray-800 bg-black/20 p-3"
															>
																<p className="font-medium text-white text-sm truncate">
																	{invitation.email}
																</p>
																<p className="text-xs text-gray-500">
																	{formatOrganizationRoleLabel(invitation.role)}
																</p>
																<p className="mt-1 text-xs text-gray-600">
																	Expira:{" "}
																	{invitation.expiresAt
																		? dateTimeFormatter.format(
																				invitation.expiresAt,
																			)
																		: "sin fecha"}
																</p>
															</div>
														))}
													</div>
												) : (
													<div className="rounded-xl border border-dashed border-gray-800 bg-black/10 p-6 text-center">
														<p className="text-sm text-gray-500">
															No hay invitaciones pendientes
														</p>
														<p className="text-xs text-gray-600 mt-1">
															Usa links de acceso para nuevos miembros
														</p>
													</div>
												)}
											</CardContent>
										</Card>
									</div>
								</div>
							)}

							{/* Section: Settings */}
							{activeSection === "settings" && (
								<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
									<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none max-w-2xl">
										<CardHeader>
											<CardTitle>Configuración de la Organización</CardTitle>
											<CardDescription className="text-gray-400">
												Ajustes generales y políticas de acceso
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="grid gap-6 sm:grid-cols-2">
												<div className="space-y-3">
													<p className="text-xs uppercase tracking-wider text-gray-500">
														Creación de Organizaciones
													</p>
													<div className="flex items-center gap-3">
														<Badge
															variant="outline"
															className={
																data.policy.allowOrganizationCreation
																	? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
																	: "border-gray-700 bg-gray-800 text-gray-400"
															}
														>
															{data.policy.allowOrganizationCreation
																? "Habilitada"
																: "Deshabilitada"}
														</Badge>
													</div>
													<p className="text-sm text-gray-400">
														{data.policy.contactMessage}
													</p>
												</div>

												<div className="space-y-3">
													<p className="text-xs uppercase tracking-wider text-gray-500">
														Contacto para Acceso
													</p>
													{data.policy.contactHref ? (
														<Button
															asChild
															variant="outline"
															className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5"
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
														<p className="text-sm font-medium text-white">
															{data.policy.contactLabel}
														</p>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							)}
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}

function NavItem({
	icon: Icon,
	label,
	isActive,
	onClick,
	badge,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	isActive: boolean;
	onClick: () => void;
	badge?: number;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center justify-between w-full px-4 py-3 text-left transition-colors lg:w-full
				${
					isActive
						? "bg-[var(--color-voltage)]/10 border-l-2 lg:border-l-2 border-[var(--color-voltage)] text-white"
						: "text-gray-400 hover:text-white hover:bg-white/5"
				}`}
		>
			<div className="flex items-center gap-3">
				<Icon className="h-4 w-4" />
				<span className="text-sm font-medium">{label}</span>
			</div>
			{badge !== undefined && badge > 0 && (
				<span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-voltage)] text-xs font-medium text-black">
					{badge}
				</span>
			)}
		</button>
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
