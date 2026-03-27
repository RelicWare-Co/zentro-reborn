import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

import { Button } from "./ui/button";

interface DefaultCatchBoundaryProps {
	error: Error;
	reset?: () => void;
}

export function DefaultCatchBoundary({
	error,
	reset,
}: DefaultCatchBoundaryProps) {
	const router = useRouter();

	const handleReset = () => {
		if (reset) {
			reset();
		} else {
			router.invalidate();
		}
	};

	return (
		<div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[var(--color-void)] p-6 text-[var(--color-photon)] md:p-12">
			<div className="w-full max-w-[460px] space-y-8 rounded-3xl border border-gray-800 bg-[var(--color-carbon)] p-8 shadow-2xl sm:p-10">
				<div className="flex flex-col items-center space-y-5 text-center">
					<div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
						<AlertTriangle className="h-10 w-10" />
					</div>

					<div className="space-y-2">
						<h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
							Algo salió mal
						</h1>
						<p className="text-sm leading-relaxed text-gray-400">
							{error?.message ||
								"Ha ocurrido un error inesperado en la aplicación. Por favor, inténtalo de nuevo."}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 pt-4">
					<Button
						onClick={handleReset}
						className="h-11 w-full rounded-xl bg-[var(--color-voltage)] text-[15px] font-semibold text-black hover:bg-[#c9e605]"
					>
						<RefreshCcw className="mr-2 h-4 w-4" />
						Intentar de nuevo
					</Button>
					<Button
						asChild
						variant="outline"
						className="h-11 w-full rounded-xl border-gray-700 bg-transparent text-[15px] font-medium text-gray-200 hover:bg-white/5 hover:text-white"
					>
						<Link to="/">
							<Home className="mr-2 h-4 w-4" />
							Volver al inicio
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
