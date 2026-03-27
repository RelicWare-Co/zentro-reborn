import { SITE_TITLE } from "../lib/site";

export function AppBootSplash() {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[var(--color-void)]"
		>
			<div aria-hidden="true" className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(223,255,6,0.15),transparent)] motion-reduce:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(223,255,6,0.08),transparent)]" />
				<div className="absolute bottom-0 left-1/2 h-[50vh] w-[80vw] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgba(223,255,6,0.08),transparent_70%)] motion-reduce:opacity-50" />
				<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_30%,transparent_70%,rgba(255,255,255,0.01)_100%)]" />
			</div>

			<div className="relative flex flex-col items-center">
				<div className="relative mb-8">
					<div className="absolute -inset-8 rounded-full bg-[var(--color-voltage)]/5 blur-2xl motion-reduce:blur-xl" />

					<div className="relative flex size-24 items-center justify-center rounded-3xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-2xl backdrop-blur-xl">
						<div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[var(--color-voltage)]/10 to-transparent opacity-0 motion-safe:animate-pulse" />

						<svg
							viewBox="0 0 48 48"
							className="size-10 text-[var(--color-voltage)] motion-safe:animate-[spin_3s_linear_infinite] motion-reduce:animate-none"
							aria-hidden="true"
						>
							<circle
								cx="24"
								cy="24"
								r="20"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeDasharray="60 100"
								className="opacity-30"
							/>
							<circle
								cx="24"
								cy="24"
								r="20"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeDasharray="30 100"
								className="drop-shadow-[0_0_8px_rgba(223,255,6,0.8)]"
							>
								<animateTransform
									attributeName="transform"
									type="rotate"
									from="0 24 24"
									to="360 24 24"
									dur="1.5s"
									repeatCount="indefinite"
								/>
							</circle>
						</svg>

						<div className="absolute size-2 rounded-full bg-[var(--color-voltage)] shadow-[0_0_12px_rgba(223,255,6,1)] motion-safe:animate-pulse" />
					</div>
				</div>

				<div className="space-y-2 text-center">
					<p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-voltage)]/80">
						{SITE_TITLE}
					</p>
					<h1 className="text-2xl font-semibold tracking-tight text-white">
						Iniciando…
					</h1>
				</div>

				<div className="mt-8 flex items-center gap-1.5">
					<span className="size-1.5 rounded-full bg-white/30 motion-safe:animate-[bounce_0.6s_ease-in-out_infinite]" />
					<span className="size-1.5 rounded-full bg-white/50 motion-safe:animate-[bounce_0.6s_ease-in-out_0.2s_infinite]" />
					<span className="size-1.5 rounded-full bg-white/70 motion-safe:animate-[bounce_0.6s_ease-in-out_0.4s_infinite]" />
					<span className="ml-2 text-xs text-white/40">Cargando</span>
				</div>

				<span className="sr-only">Cargando aplicación…</span>
			</div>
		</div>
	);
}
