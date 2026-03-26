import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
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
import {
	getOrganizationJoinLinkPreview,
	redeemOrganizationJoinLink,
} from "@/features/organization/organization.functions";
import { formatOrganizationRoleLabel } from "@/features/organization/organization.shared";
import { resetQueryCache } from "@/integrations/tanstack-query/root-provider";
import { authClient } from "@/lib/auth-client";

const joinSearchSchema = z.object({
	token: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute("/join")({
	validateSearch: joinSearchSchema,
	loaderDeps: ({ search }) => ({ token: search.token ?? null }),
	loader: ({ deps }) =>
		deps.token
			? getOrganizationJoinLinkPreview({
					data: { token: deps.token },
				})
			: null,
	component: JoinPage,
});

function JoinPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const preview = Route.useLoaderData();
	const { data: sessionData, isPending: isSessionPending } =
		authClient.useSession();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isJoining, setIsJoining] = useState(false);

	const joinWithCurrentAccount = async () => {
		if (!search.token) {
			return;
		}

		setErrorMessage(null);
		setIsJoining(true);

		try {
			const result = await redeemOrganizationJoinLink({
				data: { token: search.token },
			});
			await authClient.organization.setActive({
				organizationId: result.organizationId,
			});
			await resetQueryCache();
			navigate({ to: "/dashboard" });
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "No se pudo completar el acceso a la organización.",
			);
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<div className="app-safe-area flex min-h-[100dvh] items-center justify-center bg-[var(--color-void)] p-4 text-[var(--color-photon)] md:p-8">
			<div className="w-full max-w-2xl space-y-6">
				<div className="space-y-3 text-center">
					<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
						Join Link
					</Badge>
					<h1 className="text-3xl font-bold tracking-tight text-balance">
						Entrar a una Organización
					</h1>
					<p className="mx-auto max-w-xl text-sm text-gray-400 md:text-base">
						Este enlace te lleva directo a la organización indicada después de
						iniciar sesión o crear tu cuenta.
					</p>
				</div>

				{errorMessage ? (
					<Alert
						variant="destructive"
						className="border-red-500/20 bg-red-500/10 text-red-100"
					>
						<AlertTitle>No se pudo completar el acceso</AlertTitle>
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				) : null}

				<Card className="border-gray-800 bg-[var(--color-carbon)] text-[var(--color-photon)] shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Building2 className="h-4 w-4 text-[var(--color-voltage)]" />
							Detalle del acceso
						</CardTitle>
						<CardDescription className="text-gray-400">
							Revisa la organización y continúa con la cuenta correcta.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{preview?.organization ? (
							<div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
								<p className="text-lg font-semibold text-white">
									{preview.organization.name}
								</p>
								<p className="text-sm text-gray-400">
									/{preview.organization.slug}
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									<Badge
										variant="outline"
										className="border-sky-500/30 bg-sky-500/10 text-sky-200"
									>
										{formatOrganizationRoleLabel(preview.role)}
									</Badge>
									{preview.label ? (
										<Badge
											variant="outline"
											className="border-gray-700 bg-transparent text-gray-300"
										>
											{preview.label}
										</Badge>
									) : null}
								</div>
								<p className="mt-4 text-sm text-gray-400">
									{preview.canJoin
										? "El acceso está listo para usarse."
										: preview.message}
								</p>
							</div>
						) : (
							<Alert
								variant="destructive"
								className="border-red-500/20 bg-red-500/10 text-red-100"
							>
								<AlertTitle>Enlace no disponible</AlertTitle>
								<AlertDescription>
									{preview?.message ??
										"No encontramos información para este enlace."}
								</AlertDescription>
							</Alert>
						)}

						{sessionData ? (
							<div className="space-y-4 rounded-2xl border border-gray-800 bg-black/20 p-5">
								<div>
									<p className="text-sm text-gray-400">Cuenta actual</p>
									<p className="mt-1 font-semibold text-white">
										{sessionData.user.name}
									</p>
									<p className="text-sm text-gray-400">
										{sessionData.user.email}
									</p>
								</div>
								<div className="flex flex-col gap-3 sm:flex-row">
									<Button
										type="button"
										onClick={() => void joinWithCurrentAccount()}
										disabled={
											isSessionPending || isJoining || !preview?.canJoin
										}
										className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
									>
										{isJoining ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Entrando…
											</>
										) : (
											<>
												<ArrowRight className="h-4 w-4" />
												Entrar con esta cuenta
											</>
										)}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={async () => {
											await authClient.signOut();
										}}
										className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
									>
										<LogOut className="h-4 w-4" />
										Usar otra cuenta
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-3 rounded-2xl border border-gray-800 bg-black/20 p-5">
								<p className="text-sm text-gray-400">
									Para continuar necesitas iniciar sesión o crear tu cuenta.
								</p>
								<div className="flex flex-col gap-3 sm:flex-row">
									<Button
										asChild
										className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
									>
										<Link to="/login" search={{ joinToken: search.token }}>
											Continuar
										</Link>
									</Button>
									<Button
										asChild
										variant="outline"
										className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
									>
										<Link to="/login">Abrir login sin enlace</Link>
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
