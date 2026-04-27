import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	Building2,
	Copy,
	Link2,
	Loader2,
	Mail,
	MoreHorizontal,
	Pencil,
	ShieldCheck,
	Trash2,
	UserMinus,
	UserPlus,
	Users,
	XCircle,
} from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useCancelInvitationMutation,
	useCreateOrganizationJoinLinkMutation,
	useDeleteOrganizationMutation,
	useInviteMemberMutation,
	useLeaveOrganizationMutation,
	useOrganizationManagement,
	useRemoveMemberMutation,
	useRevokeOrganizationJoinLinkMutation,
	useUpdateMemberRoleMutation,
	useUpdateOrganizationMutation,
} from "@/features/organization/hooks/use-organization";
import { getOrganizationManagementData } from "@/features/organization/organization.functions";
import {
	formatJoinLinkStatusLabel,
	formatOrganizationRoleLabel,
	isJoinLinkActive,
	JOIN_LINK_EXPIRY_OPTIONS,
} from "@/features/organization/organization.shared";
import { authClient } from "@/lib/auth-client";

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
	authClient.useActiveOrganization();

	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
	const [feedbackType, setFeedbackType] = useState<"success" | "error">(
		"success",
	);

	const setFeedback = (
		message: string | null,
		type: "success" | "error" = "success",
	) => {
		setFeedbackMessage(message);
		setFeedbackType(type);
	};

	return (
		<div className="flex-1 bg-[var(--color-void)] min-h-0 overflow-y-auto">
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

				{/* Main Content with Tabs */}
				<main className="flex-1 p-6 md:p-8 lg:p-12 text-[var(--color-photon)]">
					<div className="space-y-6 max-w-5xl">
						{/* Feedback Messages */}
						{feedbackMessage ? (
							<Alert
								variant={feedbackType === "error" ? "destructive" : "default"}
								className={
									feedbackType === "error"
										? "border-red-500/20 bg-red-500/10 text-red-100"
										: "border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-photon)]"
								}
							>
								<AlertTitle>
									{feedbackType === "error" ? "Error" : "Estado"}
								</AlertTitle>
								<AlertDescription>{feedbackMessage}</AlertDescription>
							</Alert>
						) : null}

						<Tabs defaultValue="general" className="space-y-6">
							<TabsList className="bg-[var(--color-carbon)] border border-gray-800">
								<TabsTrigger
									value="general"
									className="data-[state=active]:bg-[var(--color-voltage)]/10 data-[state=active]:text-[var(--color-voltage)]"
								>
									<Building2 className="h-4 w-4 mr-2" />
									General
								</TabsTrigger>
								<TabsTrigger
									value="members"
									className="data-[state=active]:bg-[var(--color-voltage)]/10 data-[state=active]:text-[var(--color-voltage)]"
								>
									<Users className="h-4 w-4 mr-2" />
									Miembros
									{data.pendingInvitations.length > 0 && (
										<span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-voltage)] text-xs font-medium text-black">
											{data.pendingInvitations.length}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger
									value="invitations"
									className="data-[state=active]:bg-[var(--color-voltage)]/10 data-[state=active]:text-[var(--color-voltage)]"
								>
									<Mail className="h-4 w-4 mr-2" />
									Invitaciones
								</TabsTrigger>
								<TabsTrigger
									value="access"
									className="data-[state=active]:bg-[var(--color-voltage)]/10 data-[state=active]:text-[var(--color-voltage)]"
								>
									<Link2 className="h-4 w-4 mr-2" />
									Acceso
								</TabsTrigger>
							</TabsList>

							<TabsContent
								value="general"
								className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
							>
								<GeneralTab data={data} setFeedback={setFeedback} />
							</TabsContent>

							<TabsContent
								value="members"
								className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
							>
								<MembersTab data={data} setFeedback={setFeedback} />
							</TabsContent>

							<TabsContent
								value="invitations"
								className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
							>
								<InvitationsTab data={data} setFeedback={setFeedback} />
							</TabsContent>

							<TabsContent
								value="access"
								className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
							>
								<AccessTab data={data} setFeedback={setFeedback} />
							</TabsContent>
						</Tabs>
					</div>
				</main>
			</div>
		</div>
	);
}

/* ---------- General Tab ---------- */

function GeneralTab({
	data,
	setFeedback,
}: {
	data: OrganizationManagementData;
	setFeedback: (msg: string | null, type?: "success" | "error") => void;
}) {
	const router = useRouter();
	const updateOrgMutation = useUpdateOrganizationMutation();
	const deleteOrgMutation = useDeleteOrganizationMutation();
	const leaveOrgMutation = useLeaveOrganizationMutation();
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState(data.organization.name);
	const [editSlug, setEditSlug] = useState(data.organization.slug);
	const [editLogo, setEditLogo] = useState(data.organization.logo || "");

	const isOwner = data.viewer.role?.toLowerCase().includes("owner");
	const isManager = data.viewer.canManageAccess;

	const handleUpdate = async () => {
		setFeedback(null);
		try {
			await updateOrgMutation.mutateAsync({
				organizationId: data.organization.id,
				data: {
					name: editName,
					slug: editSlug,
					logo: editLogo || undefined,
				},
			});
			setFeedback("Organización actualizada correctamente.");
			setIsEditing(false);
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo actualizar.",
				"error",
			);
		}
	};

	const handleDelete = async () => {
		setFeedback(null);
		try {
			await deleteOrgMutation.mutateAsync({
				organizationId: data.organization.id,
			});
			await authClient.organization.setActive({ organizationId: null });
			await router.invalidate();
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo eliminar.",
				"error",
			);
		}
	};

	const handleLeave = async () => {
		setFeedback(null);
		try {
			await leaveOrgMutation.mutateAsync({
				organizationId: data.organization.id,
			});
			await authClient.organization.setActive({ organizationId: null });
			await router.invalidate();
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo salir.",
				"error",
			);
		}
	};

	return (
		<div className="space-y-6">
			<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
				<CardHeader>
					<CardTitle className="text-lg">Información General</CardTitle>
					<CardDescription className="text-gray-400">
						Detalles y configuración básica de la organización
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{isEditing ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Nombre</Label>
								<Input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									className="border-gray-800 bg-black/30"
								/>
							</div>
							<div className="space-y-2">
								<Label>Slug</Label>
								<Input
									value={editSlug}
									onChange={(e) =>
										setEditSlug(
											e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
										)
									}
									className="border-gray-800 bg-black/30"
								/>
							</div>
							<div className="space-y-2">
								<Label>Logo URL</Label>
								<Input
									value={editLogo}
									onChange={(e) => setEditLogo(e.target.value)}
									placeholder="https://..."
									className="border-gray-800 bg-black/30"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setIsEditing(false);
										setEditName(data.organization.name);
										setEditSlug(data.organization.slug);
										setEditLogo(data.organization.logo || "");
									}}
									className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5"
								>
									Cancelar
								</Button>
								<Button
									onClick={handleUpdate}
									disabled={updateOrgMutation.isPending}
									className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
								>
									{updateOrgMutation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Guardar"
									)}
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-wider text-gray-500">
										Nombre
									</p>
									<p className="text-sm font-medium text-white">
										{data.organization.name}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-wider text-gray-500">
										Slug
									</p>
									<p className="text-sm font-medium text-white">
										/{data.organization.slug}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-wider text-gray-500">
										ID
									</p>
									<p className="text-sm font-mono text-gray-400">
										{data.organization.id}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-wider text-gray-500">
										Creada
									</p>
									<p className="text-sm text-gray-400">
										{data.organization.createdAt
											? dateFormatter.format(data.organization.createdAt)
											: "N/A"}
									</p>
								</div>
							</div>
							{isManager && (
								<Button
									variant="outline"
									onClick={() => setIsEditing(true)}
									className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5"
								>
									<Pencil className="h-4 w-4 mr-2" />
									Editar Información
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
				<CardHeader>
					<CardTitle className="text-lg">Zona de Peligro</CardTitle>
					<CardDescription className="text-gray-400">
						Acciones irreversibles para esta organización
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isOwner ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="outline"
									className="border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Eliminar Organización
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
								<AlertDialogHeader>
									<AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
									<AlertDialogDescription className="text-gray-400">
										Esta acción no se puede deshacer. Se eliminarán todos los
										miembros, invitaciones y datos asociados.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5">
										Cancelar
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDelete}
										className="bg-red-500 text-white hover:bg-red-600"
									>
										{deleteOrgMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Eliminar"
										)}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="outline"
									className="border-amber-500/30 bg-transparent text-amber-200 hover:bg-amber-500/10"
								>
									<UserMinus className="h-4 w-4 mr-2" />
									Salir de la Organización
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
								<AlertDialogHeader>
									<AlertDialogTitle>
										¿Salir de la organización?
									</AlertDialogTitle>
									<AlertDialogDescription className="text-gray-400">
										Perderás el acceso a todos los recursos de esta
										organización.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5">
										Cancelar
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleLeave}
										className="bg-amber-500 text-black hover:bg-amber-600"
									>
										{leaveOrgMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Salir"
										)}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/* ---------- Members Tab ---------- */

function MembersTab({
	data,
	setFeedback,
}: {
	data: OrganizationManagementData;
	setFeedback: (msg: string | null, type?: "success" | "error") => void;
}) {
	const inviteMutation = useInviteMemberMutation();
	const removeMutation = useRemoveMemberMutation();
	const updateRoleMutation = useUpdateMemberRoleMutation();
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("member");
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

	const isManager = data.viewer.canManageAccess;

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		setFeedback(null);
		try {
			await inviteMutation.mutateAsync({
				email: inviteEmail,
				role: inviteRole,
			});
			setFeedback("Invitación enviada correctamente.");
			setInviteEmail("");
			setInviteRole("member");
			setIsInviteDialogOpen(false);
		} catch (error) {
			setFeedback(
				error instanceof Error
					? error.message
					: "No se pudo enviar la invitación.",
				"error",
			);
		}
	};

	const handleRemove = async (memberIdOrEmail: string) => {
		setFeedback(null);
		try {
			await removeMutation.mutateAsync({ memberIdOrEmail });
			setFeedback("Miembro eliminado correctamente.");
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo eliminar.",
				"error",
			);
		}
	};

	const handleUpdateRole = async (memberId: string, role: string) => {
		setFeedback(null);
		try {
			await updateRoleMutation.mutateAsync({ memberId, role });
			setFeedback("Rol actualizado correctamente.");
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo actualizar.",
				"error",
			);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-white">Miembros Activos</h2>
				{isManager && (
					<Dialog
						open={isInviteDialogOpen}
						onOpenChange={setIsInviteDialogOpen}
					>
						<DialogTrigger asChild>
							<Button className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]">
								<UserPlus className="h-4 w-4 mr-2" />
								Invitar Miembro
							</Button>
						</DialogTrigger>
						<DialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
							<DialogHeader>
								<DialogTitle>Invitar Miembro</DialogTitle>
								<DialogDescription className="text-gray-400">
									Envía una invitación por correo electrónico
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleInvite} className="space-y-4">
								<div className="space-y-2">
									<Label>Correo electrónico</Label>
									<Input
										type="email"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="usuario@ejemplo.com"
										required
										className="border-gray-800 bg-black/30"
									/>
								</div>
								<div className="space-y-2">
									<Label>Rol</Label>
									<Select value={inviteRole} onValueChange={setInviteRole}>
										<SelectTrigger className="border-gray-800 bg-black/30">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="member">Miembro</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="owner">Owner</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<DialogFooter>
									<Button
										type="submit"
										disabled={inviteMutation.isPending}
										className="bg-[var(--color-voltage)] text-black hover:bg-[#d9f15c]"
									>
										{inviteMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Enviar Invitación"
										)}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow className="border-gray-800 hover:bg-transparent">
								<TableHead className="text-gray-400">Miembro</TableHead>
								<TableHead className="text-gray-400">Rol</TableHead>
								<TableHead className="text-gray-400">Ingreso</TableHead>
								<TableHead className="text-gray-400 text-right">
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.members.map((memberRow) => (
								<TableRow
									key={memberRow.memberId}
									className="border-gray-800 hover:bg-white/5"
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800">
												<span className="text-sm font-medium text-gray-400">
													{memberRow.name.charAt(0).toUpperCase()}
												</span>
											</div>
											<div>
												<p className="font-medium text-white text-sm">
													{memberRow.name}
												</p>
												<p className="text-xs text-gray-500">
													{memberRow.email}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										{isManager && memberRow.userId !== data.viewer.userId ? (
											<Select
												value={memberRow.role}
												onValueChange={(value) =>
													handleUpdateRole(memberRow.memberId, value)
												}
											>
												<SelectTrigger className="w-32 h-8 border-gray-800 bg-black/30 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="member">Miembro</SelectItem>
													<SelectItem value="admin">Admin</SelectItem>
													<SelectItem value="owner">Owner</SelectItem>
												</SelectContent>
											</Select>
										) : (
											<Badge variant="outline" className="text-gray-300">
												{formatOrganizationRoleLabel(memberRow.role)}
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-sm text-gray-400">
										{memberRow.joinedAt
											? dateFormatter.format(memberRow.joinedAt)
											: "N/A"}
									</TableCell>
									<TableCell className="text-right">
										{isManager && memberRow.userId !== data.viewer.userId && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 text-gray-400 hover:text-white"
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="end"
													className="bg-[var(--color-carbon)] border-gray-800 text-white"
												>
													<AlertDialog>
														<AlertDialogTrigger asChild>
															<DropdownMenuItem
																onSelect={(e) => e.preventDefault()}
																className="text-red-200 focus:text-red-100 focus:bg-red-500/10 cursor-pointer"
															>
																<Trash2 className="h-4 w-4 mr-2" />
																Eliminar
															</DropdownMenuItem>
														</AlertDialogTrigger>
														<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
															<AlertDialogHeader>
																<AlertDialogTitle>
																	¿Eliminar miembro?
																</AlertDialogTitle>
																<AlertDialogDescription className="text-gray-400">
																	{memberRow.name} perderá acceso a todos los
																	recursos.
																</AlertDialogDescription>
															</AlertDialogHeader>
															<AlertDialogFooter>
																<AlertDialogCancel className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5">
																	Cancelar
																</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() =>
																		handleRemove(memberRow.memberId)
																	}
																	className="bg-red-500 text-white hover:bg-red-600"
																>
																	Eliminar
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{data.members.length === 0 && (
						<div className="p-8 text-center">
							<p className="text-sm text-gray-500">
								No hay miembros en la organización
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/* ---------- Invitations Tab ---------- */

function InvitationsTab({
	data,
	setFeedback,
}: {
	data: OrganizationManagementData;
	setFeedback: (msg: string | null, type?: "success" | "error") => void;
}) {
	const cancelMutation = useCancelInvitationMutation();
	const isManager = data.viewer.canManageAccess;

	const handleCancel = async (invitationId: string) => {
		setFeedback(null);
		try {
			await cancelMutation.mutateAsync({ invitationId });
			setFeedback("Invitación cancelada correctamente.");
		} catch (error) {
			setFeedback(
				error instanceof Error ? error.message : "No se pudo cancelar.",
				"error",
			);
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold text-white">
				Invitaciones Pendientes
			</h2>

			<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow className="border-gray-800 hover:bg-transparent">
								<TableHead className="text-gray-400">Email</TableHead>
								<TableHead className="text-gray-400">Rol</TableHead>
								<TableHead className="text-gray-400">Expira</TableHead>
								<TableHead className="text-gray-400 text-right">
									Acciones
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.pendingInvitations.map((invitation) => (
								<TableRow
									key={invitation.id}
									className="border-gray-800 hover:bg-white/5"
								>
									<TableCell className="text-sm text-white">
										{invitation.email}
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-gray-300">
											{formatOrganizationRoleLabel(invitation.role)}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-gray-400">
										{invitation.expiresAt
											? dateTimeFormatter.format(invitation.expiresAt)
											: "N/A"}
									</TableCell>
									<TableCell className="text-right">
										{isManager && (
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														className="border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10"
													>
														<XCircle className="h-3.5 w-3.5 mr-1.5" />
														Cancelar
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent className="bg-[var(--color-carbon)] border-gray-800 text-white">
													<AlertDialogHeader>
														<AlertDialogTitle>
															¿Cancelar invitación?
														</AlertDialogTitle>
														<AlertDialogDescription className="text-gray-400">
															La invitación enviada a {invitation.email} será
															revocada.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5">
															Cancelar
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => handleCancel(invitation.id)}
															className="bg-red-500 text-white hover:bg-red-600"
														>
															Revocar
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					{data.pendingInvitations.length === 0 && (
						<div className="p-8 text-center">
							<p className="text-sm text-gray-500">
								No hay invitaciones pendientes
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/* ---------- Access Tab ---------- */

function AccessTab({
	data,
	setFeedback,
}: {
	data: OrganizationManagementData;
	setFeedback: (msg: string | null, type?: "success" | "error") => void;
}) {
	const createJoinLinkMutation = useCreateOrganizationJoinLinkMutation();
	const revokeJoinLinkMutation = useRevokeOrganizationJoinLinkMutation();
	const labelId = useId();
	const expiryId = useId();
	const [joinLinkLabel, setJoinLinkLabel] = useState("");
	const [expiresInDays, setExpiresInDays] = useState("7");
	const [latestJoinUrl, setLatestJoinUrl] = useState<string | null>(null);

	const createJoinUrl = (joinPath: string) =>
		new URL(joinPath, window.location.origin).toString();

	const handleCopyJoinUrl = async (joinPath: string) => {
		const joinUrl = createJoinUrl(joinPath);
		await navigator.clipboard.writeText(joinUrl);
		setFeedback("Enlace copiado. Ya puedes compartirlo.");
	};

	const handleCreateJoinLink = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		setFeedback(null);

		try {
			const result = await createJoinLinkMutation.mutateAsync({
				label: joinLinkLabel || undefined,
				expiresInDays: Number(expiresInDays),
			});
			const joinUrl = createJoinUrl(result.joinPath);
			setLatestJoinUrl(joinUrl);
			setJoinLinkLabel("");
			await navigator.clipboard.writeText(joinUrl);
			setFeedback("Enlace creado y copiado.");
		} catch (error) {
			setLatestJoinUrl(null);
			setFeedback(
				error instanceof Error
					? error.message
					: "No se pudo crear el enlace de acceso.",
				"error",
			);
		}
	};

	const handleRevokeJoinLink = async (joinLinkId: string) => {
		setFeedback(null);
		try {
			await revokeJoinLinkMutation.mutateAsync({ joinLinkId });
			setFeedback("El enlace fue revocado.");
		} catch (error) {
			setFeedback(
				error instanceof Error
					? error.message
					: "No se pudo revocar el enlace.",
				"error",
			);
		}
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-6 lg:grid-cols-3">
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
							<form onSubmit={handleCreateJoinLink} className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor={labelId}>Referencia</Label>
										<Input
											id={labelId}
											name="joinLinkLabel"
											value={joinLinkLabel}
											onChange={(event) => setJoinLinkLabel(event.target.value)}
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
									Solo owners y admins pueden crear o revocar enlaces de acceso.
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
											navigator.clipboard.writeText(latestJoinUrl).then(() => {
												setFeedback("Enlace copiado nuevamente.");
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

			<Card className="border-gray-800 bg-[var(--color-carbon)] shadow-none">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg">Links de Acceso Activos</CardTitle>
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
											<JoinLinkStatusBadge status={joinLink.status} />
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
												? dateTimeFormatter.format(joinLink.expiresAt)
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
											onClick={() => handleCopyJoinUrl(joinLink.joinPath)}
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
												onClick={() => handleRevokeJoinLink(joinLink.id)}
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
	);
}

/* ---------- Helper Components ---------- */

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
