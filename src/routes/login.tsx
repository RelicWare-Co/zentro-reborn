import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	getOrganizationJoinLinkPreview,
	redeemOrganizationJoinLink,
} from "@/features/organization/organization.functions";
import { formatOrganizationRoleLabel } from "@/features/organization/organization.shared";
import { resetQueryCache } from "@/integrations/tanstack-query/root-provider";
import { authClient } from "@/lib/auth-client";

const loginSearchSchema = z.object({
	joinToken: z.string().trim().min(1).optional(),
});

const inputBase =
	"w-full pl-10 h-11 bg-[#1c1c1c] border-white/10 text-white placeholder:text-gray-500 focus-visible:border-[var(--color-voltage)] focus-visible:ring-[var(--color-voltage)]/20 rounded-xl";

export const Route = createFileRoute("/login")({
	validateSearch: loginSearchSchema,
	loaderDeps: ({ search }) => ({ joinToken: search.joinToken ?? null }),
	loader: ({ deps }) =>
		deps.joinToken
			? getOrganizationJoinLinkPreview({
					data: { token: deps.joinToken },
				})
			: null,
	component: LoginPage,
});

function LoginForm(props: {
	isCompletingJoin: boolean;
	onAuthenticated: () => Promise<boolean>;
}) {
	const navigate = useNavigate();
	const emailId = useId();
	const passwordId = useId();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleLogin = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsPending(true);
		setErrorMsg(null);

		const { error } = await authClient.signIn.email({
			email,
			password,
		});

		if (error) {
			setIsPending(false);
			setErrorMsg(error.message || "Credenciales inválidas.");
			return;
		}

		const shouldContinue = await props.onAuthenticated();
		setIsPending(false);

		if (shouldContinue) {
			navigate({ to: "/dashboard" });
		}
	};

	return (
		<form className="space-y-6" onSubmit={handleLogin}>
			<div className="space-y-2">
				<LabelWithRequired htmlFor={emailId}>
					Correo electrónico
				</LabelWithRequired>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<Mail className="h-4 w-4" />
					</div>
					<input
						id={emailId}
						name="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="tu@negocio.com…"
						autoComplete="email"
						spellCheck={false}
						className={inputBase}
						required
					/>
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<LabelWithRequired htmlFor={passwordId}>Contraseña</LabelWithRequired>
					<Link
						to="/"
						className="text-xs text-[var(--color-voltage)] hover:underline"
					>
						¿Olvidaste tu contraseña?
					</Link>
				</div>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<Lock className="h-4 w-4" />
					</div>
					<input
						id={passwordId}
						name="password"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="••••••••"
						autoComplete="current-password"
						className={`${inputBase} pr-10`}
						required
					/>
					<button
						type="button"
						onClick={() => setShowPassword((currentValue) => !currentValue)}
						disabled={isPending || props.isCompletingJoin}
						className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={
							showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
						}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>

			{errorMsg ? <InlineErrorMessage message={errorMsg} /> : null}

			<Button
				type="submit"
				disabled={isPending || props.isCompletingJoin}
				className="h-11 w-full rounded-xl bg-[var(--color-voltage)] text-[15px] font-semibold text-black hover:bg-[#c9e605]"
			>
				{props.isCompletingJoin
					? "Completando acceso…"
					: isPending
						? "Ingresando…"
						: "Ingresar"}
			</Button>
		</form>
	);
}

function RegisterForm(props: {
	isCompletingJoin: boolean;
	onAuthenticated: () => Promise<boolean>;
}) {
	const navigate = useNavigate();
	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const confirmId = useId();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleRegister = async (event: React.FormEvent) => {
		event.preventDefault();
		setErrorMsg(null);

		if (password.length < 8) {
			setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
			return;
		}

		if (password !== confirmPassword) {
			setErrorMsg("Las contraseñas no coinciden.");
			return;
		}

		setIsPending(true);

		const { error } = await authClient.signUp.email({
			email,
			password,
			name: name.trim() || email.split("@")[0],
		});

		if (error) {
			setIsPending(false);
			setErrorMsg(error.message || "No se pudo crear la cuenta.");
			return;
		}

		const shouldContinue = await props.onAuthenticated();
		setIsPending(false);

		if (shouldContinue) {
			navigate({ to: "/dashboard" });
		}
	};

	return (
		<form className="space-y-6" onSubmit={handleRegister}>
			<div className="space-y-2">
				<label htmlFor={nameId} className="text-xs font-semibold text-gray-200">
					Nombre
				</label>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<User className="h-4 w-4" />
					</div>
					<input
						id={nameId}
						name="name"
						type="text"
						value={name}
						onChange={(event) => setName(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="Tu nombre…"
						autoComplete="name"
						className={inputBase}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<LabelWithRequired htmlFor={emailId}>
					Correo electrónico
				</LabelWithRequired>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<Mail className="h-4 w-4" />
					</div>
					<input
						id={emailId}
						name="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="tu@negocio.com…"
						autoComplete="email"
						spellCheck={false}
						className={inputBase}
						required
					/>
				</div>
			</div>

			<div className="space-y-2">
				<LabelWithRequired htmlFor={passwordId}>Contraseña</LabelWithRequired>
				<p className="text-xs text-gray-500">Mínimo 8 caracteres.</p>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<Lock className="h-4 w-4" />
					</div>
					<input
						id={passwordId}
						name="password"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="••••••••"
						autoComplete="new-password"
						className={`${inputBase} pr-10`}
						required
						minLength={8}
					/>
					<button
						type="button"
						onClick={() => setShowPassword((currentValue) => !currentValue)}
						disabled={isPending || props.isCompletingJoin}
						className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={
							showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
						}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>

			<div className="space-y-2">
				<LabelWithRequired htmlFor={confirmId}>
					Confirmar contraseña
				</LabelWithRequired>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
						<Lock className="h-4 w-4" />
					</div>
					<input
						id={confirmId}
						name="confirmPassword"
						type={showConfirmPassword ? "text" : "password"}
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						disabled={isPending || props.isCompletingJoin}
						placeholder="••••••••"
						autoComplete="new-password"
						className={`${inputBase} pr-10`}
						required
						minLength={8}
					/>
					<button
						type="button"
						onClick={() =>
							setShowConfirmPassword((currentValue) => !currentValue)
						}
						disabled={isPending || props.isCompletingJoin}
						className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={
							showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"
						}
					>
						{showConfirmPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>

			{errorMsg ? <InlineErrorMessage message={errorMsg} /> : null}

			<Button
				type="submit"
				disabled={isPending || props.isCompletingJoin}
				className="h-11 w-full rounded-xl bg-[var(--color-voltage)] text-[15px] font-semibold text-black hover:bg-[#c9e605]"
			>
				{props.isCompletingJoin
					? "Completando acceso…"
					: isPending
						? "Creando cuenta…"
						: "Crear cuenta"}
			</Button>
		</form>
	);
}

function LoginPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const joinPreview = Route.useLoaderData();
	const { data: sessionData, isPending: isSessionPending } =
		authClient.useSession();
	const [mode, setMode] = useState<"login" | "register">("login");
	const [joinError, setJoinError] = useState<string | null>(null);
	const [isCompletingJoin, setIsCompletingJoin] = useState(false);

	const finishJoinFlow = async () => {
		if (!search.joinToken) {
			return true;
		}

		setJoinError(null);
		setIsCompletingJoin(true);

		try {
			const result = await redeemOrganizationJoinLink({
				data: { token: search.joinToken },
			});
			await authClient.organization.setActive({
				organizationId: result.organizationId,
			});
			await resetQueryCache();
			return true;
		} catch (error) {
			setJoinError(
				error instanceof Error
					? error.message
					: "No se pudo completar el acceso con este enlace.",
			);
			return false;
		} finally {
			setIsCompletingJoin(false);
		}
	};

	const handleJoinWithCurrentAccount = async () => {
		const shouldContinue = await finishJoinFlow();
		if (shouldContinue) {
			navigate({ to: "/dashboard" });
		}
	};

	return (
		<div className="app-safe-area flex min-h-[100dvh] w-full bg-[var(--color-void)] text-[var(--color-photon)]">
			<div className="relative hidden w-1/2 overflow-hidden bg-[var(--color-carbon)] lg:flex lg:flex-col lg:items-center lg:justify-center">
				<div className="relative z-10 flex flex-col items-center px-8 text-center">
					<h1 className="mb-6 text-6xl font-bold tracking-tight text-[var(--color-voltage)]">
						Zentro
					</h1>
					<p className="max-w-md text-xl text-gray-400">
						El sistema POS más inteligente para tu negocio
					</p>
				</div>
			</div>

			<div className="relative flex w-full flex-col items-center justify-center p-8 sm:p-12 md:p-16 lg:w-1/2 lg:p-24">
				<div className="w-full max-w-[460px] space-y-8">
					<div className="space-y-3 text-center">
						<h2 className="text-3xl font-bold tracking-tight">
							{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}{" "}
							<span className="text-[var(--color-voltage)]">Zentro™</span>
						</h2>
						<p className="text-sm text-gray-400">
							{mode === "login"
								? "Ingresa tus credenciales para acceder."
								: "Regístrate para empezar a vender más."}
						</p>
					</div>

					{search.joinToken ? (
						<div className="space-y-3">
							<JoinContextCard joinPreview={joinPreview} />
							{joinError ? (
								<Alert
									variant="destructive"
									className="border-red-500/20 bg-red-500/10 text-red-100"
								>
									<AlertTitle>No se pudo completar el acceso</AlertTitle>
									<AlertDescription>{joinError}</AlertDescription>
								</Alert>
							) : null}
						</div>
					) : null}

					{search.joinToken && sessionData ? (
						<CardForSignedInUser
							isSessionPending={isSessionPending}
							isCompletingJoin={isCompletingJoin}
							sessionName={sessionData.user.name}
							sessionEmail={sessionData.user.email}
							canJoin={Boolean(joinPreview?.canJoin)}
							onJoin={handleJoinWithCurrentAccount}
							onSwitchAccount={async () => {
								await authClient.signOut();
							}}
						/>
					) : (
						<>
							<div className="mb-6 flex w-full rounded-xl border border-gray-800 bg-gray-900/50 p-1">
								<button
									type="button"
									onClick={() => setMode("login")}
									className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
										mode === "login"
											? "bg-[var(--color-voltage)] text-black shadow-sm"
											: "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
									}`}
								>
									Iniciar sesión
								</button>
								<button
									type="button"
									onClick={() => setMode("register")}
									className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
										mode === "register"
											? "bg-[var(--color-voltage)] text-black shadow-sm"
											: "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
									}`}
								>
									Registrarse
								</button>
							</div>

							<div>
								{mode === "login" ? (
									<LoginForm
										isCompletingJoin={isCompletingJoin}
										onAuthenticated={finishJoinFlow}
									/>
								) : (
									<RegisterForm
										isCompletingJoin={isCompletingJoin}
										onAuthenticated={finishJoinFlow}
									/>
								)}
							</div>
						</>
					)}
				</div>

				<div className="absolute bottom-8 left-0 flex w-full flex-col items-center justify-center gap-2 text-xs text-gray-500">
					<p>2026 Zentro POS System. Todos los derechos reservados.</p>
					<div className="flex gap-4">
						<Link to="/" className="transition-colors hover:text-gray-300">
							Privacidad
						</Link>
						<Link to="/" className="transition-colors hover:text-gray-300">
							Términos
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

function CardForSignedInUser(props: {
	isSessionPending: boolean;
	isCompletingJoin: boolean;
	sessionName: string;
	sessionEmail: string;
	canJoin: boolean;
	onJoin: () => Promise<void>;
	onSwitchAccount: () => Promise<void>;
}) {
	return (
		<div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
			<div className="space-y-2">
				<Badge className="border-[var(--color-voltage)]/20 bg-[var(--color-voltage)]/10 text-[var(--color-voltage)] hover:bg-[var(--color-voltage)]/10">
					Ya Iniciaste Sesión
				</Badge>
				<p className="text-lg font-semibold text-white">{props.sessionName}</p>
				<p className="text-sm text-gray-400">{props.sessionEmail}</p>
			</div>
			<div className="mt-5 flex flex-col gap-3">
				<Button
					type="button"
					onClick={() => void props.onJoin()}
					disabled={
						props.isSessionPending || props.isCompletingJoin || !props.canJoin
					}
					className="bg-[var(--color-voltage)] text-black hover:bg-[#c9e605]"
				>
					{props.isCompletingJoin
						? "Entrando a la organización…"
						: "Continuar con esta cuenta"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => void props.onSwitchAccount()}
					className="border-gray-700 bg-transparent text-gray-200 hover:bg-white/5 hover:text-white"
				>
					Usar otra cuenta
				</Button>
			</div>
		</div>
	);
}

function JoinContextCard(props: {
	joinPreview: Awaited<
		ReturnType<typeof getOrganizationJoinLinkPreview>
	> | null;
}) {
	if (!props.joinPreview) {
		return null;
	}

	if (!props.joinPreview.organization) {
		return (
			<Alert
				variant="destructive"
				className="border-red-500/20 bg-red-500/10 text-red-100"
			>
				<AlertTitle>Enlace no disponible</AlertTitle>
				<AlertDescription>{props.joinPreview.message}</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 rounded-xl bg-[var(--color-voltage)]/10 p-2 text-[var(--color-voltage)]">
					<Building2 className="h-4 w-4" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-semibold text-white">
						{props.joinPreview.organization.name}
					</p>
					<p className="text-sm text-gray-400">
						/{props.joinPreview.organization.slug}
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Badge
							variant="outline"
							className="border-sky-500/30 bg-sky-500/10 text-sky-200"
						>
							{formatOrganizationRoleLabel(props.joinPreview.role)}
						</Badge>
						{props.joinPreview.label ? (
							<Badge
								variant="outline"
								className="border-gray-700 bg-transparent text-gray-300"
							>
								{props.joinPreview.label}
							</Badge>
						) : null}
					</div>
					<p className="mt-3 text-sm text-gray-400">
						{props.joinPreview.canJoin
							? "Cuando termines de iniciar sesión o crear tu cuenta entrarás directo a esta organización."
							: props.joinPreview.message}
					</p>
				</div>
			</div>
		</div>
	);
}

function LabelWithRequired(props: {
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<label
			htmlFor={props.htmlFor}
			className="text-xs font-semibold text-gray-200"
		>
			{props.children} <span className="text-red-500">*</span>
		</label>
	);
}

function InlineErrorMessage(props: { message: string }) {
	return (
		<div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">
			{props.message}
		</div>
	);
}
