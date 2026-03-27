import { cn } from "../lib/utils";

interface LoadingScreenProps {
	title?: string;
	subtitle?: string;
	className?: string;
	fullscreen?: boolean;
}

export function LoadingScreen({
	title = "Cargando...",
	subtitle,
	className,
	fullscreen = true,
}: LoadingScreenProps) {
	const containerClasses = fullscreen
		? "fixed inset-0 z-50"
		: "absolute inset-0 z-10 rounded-[inherit]";

	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className={cn(
				containerClasses,
				"flex flex-col items-center justify-center bg-[var(--color-void)]",
				className,
			)}
		>
			<div className="relative flex flex-col items-center gap-6 p-8">
				<div className="relative">
					<div className="absolute -inset-4 rounded-full bg-[var(--color-voltage)]/10 blur-xl motion-reduce:blur-lg" />

					<svg
						viewBox="0 0 48 48"
						className="relative size-12 text-[var(--color-voltage)] motion-safe:animate-[spin_1.5s_linear_infinite] motion-reduce:animate-none"
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
							strokeDasharray="30 100"
							className="drop-shadow-[0_0_6px_rgba(223,255,6,0.6)]"
						/>
					</svg>
				</div>

				<div className="space-y-1 text-center">
					<p className="text-sm font-medium text-white">{title}</p>
					{subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
				</div>
			</div>

			<span className="sr-only">{title}</span>
		</div>
	);
}
