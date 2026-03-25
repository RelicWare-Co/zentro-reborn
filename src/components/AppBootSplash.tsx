import { SITE_TITLE } from "../lib/site";

export function AppBootSplash() {
	return (
		<section
			role="status"
			aria-live="polite"
			aria-busy="true"
			className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-void)] px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
		>
			<div aria-hidden="true" className="pointer-events-none absolute inset-0">
				<div className="absolute inset-x-0 top-[-16%] h-[42svh] bg-[radial-gradient(circle_at_top,rgba(223,255,6,0.16),transparent_62%)]" />
				<div className="absolute bottom-[-18%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(223,255,6,0.12),transparent_68%)] blur-3xl" />
				<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_78%,rgba(255,255,255,0.02))]" />
			</div>

			<div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,28,28,0.94),rgba(15,15,15,0.98))] p-7 shadow-[0_32px_96px_rgba(0,0,0,0.45)] backdrop-blur-xl">
				<div
					aria-hidden="true"
					className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(223,255,6,0.55),transparent)]"
				/>

				<div className="flex items-start gap-4">
					<div className="relative flex size-16 shrink-0 items-center justify-center rounded-[22px] border border-[var(--color-voltage)]/16 bg-[radial-gradient(circle_at_30%_30%,rgba(223,255,6,0.18),rgba(223,255,6,0.02)_45%,rgba(255,255,255,0.03)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
						<div className="absolute inset-[9px] rounded-full border border-white/10" />
						<div className="absolute inset-[9px] rounded-full border-2 border-transparent border-t-[var(--color-voltage)] border-r-[rgba(223,255,6,0.35)] animate-spin motion-reduce:animate-none" />
						<div className="h-2.5 w-2.5 rounded-full bg-[var(--color-voltage)] shadow-[0_0_18px_rgba(223,255,6,0.55)]" />
					</div>

					<div className="min-w-0 space-y-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-voltage)]/78">
							{SITE_TITLE}
						</p>
						<h1 className="text-balance text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
							Iniciando tu espacio de trabajo…
						</h1>
						<p className="max-w-sm text-sm leading-6 text-gray-400">
							Estamos preparando la interfaz, la sesión y el contexto
							operativo para continuar.
						</p>
					</div>
				</div>

				<div className="mt-7 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
					<div className="flex items-center gap-3">
						<div
							aria-hidden="true"
							className="flex items-center gap-1.5 text-[var(--color-voltage)]"
						>
							<span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
							<span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
							<span className="h-1.5 w-1.5 rounded-full bg-current" />
						</div>
						<p className="text-xs font-medium uppercase tracking-[0.22em] text-white/62">
							Cargando aplicación…
						</p>
					</div>
					<p className="mt-3 text-sm leading-6 text-gray-500">
						Este arranque puede tardar un instante más después de una
						actualización o al volver a abrir la app.
					</p>
				</div>

				<span className="sr-only">Cargando aplicación…</span>
			</div>
		</section>
	);
}
