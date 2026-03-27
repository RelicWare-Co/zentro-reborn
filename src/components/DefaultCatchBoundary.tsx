import { useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "./ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./ui/empty";

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
		<div className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
			<Empty className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl border-border bg-card shadow-sm">
				<EmptyHeader className="max-w-none sm:max-w-md lg:max-w-lg">
					<EmptyMedia
						variant="icon"
						className="mb-4 size-12 sm:size-14 lg:size-16 bg-destructive/10 text-destructive"
					>
						<AlertTriangle className="size-6 sm:size-7 lg:size-8" />
					</EmptyMedia>
					<EmptyTitle className="text-xl sm:text-2xl lg:text-3xl">
						Algo salió mal
					</EmptyTitle>
					<EmptyDescription className="mt-2 text-center text-muted-foreground text-sm sm:text-base lg:text-lg max-w-xs sm:max-w-md lg:max-w-lg">
						{error?.message ||
							"Ha ocurrido un error inesperado en la aplicación. Por favor, inténtalo de nuevo."}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="mt-6 sm:mt-8 max-w-none sm:max-w-md lg:max-w-lg">
					<Button
						onClick={handleReset}
						variant="outline"
						className="min-w-[120px] sm:min-w-[140px] lg:min-w-[160px] text-sm sm:text-base lg:text-lg h-9 sm:h-10 lg:h-11 px-4 sm:px-5 lg:px-6"
					>
						Intentar de nuevo
					</Button>
				</EmptyContent>
			</Empty>
		</div>
	);
}
