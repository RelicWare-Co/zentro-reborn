import { useEffect, useMemo, useState } from "react";
import {
	APP_BUILD_INFO,
	APP_VERSION_CHECK_INTERVAL_MS,
	APP_VERSION_ENDPOINT,
	type AppBuildInfo,
	reloadForFreshBuild,
} from "../lib/app-build";

const updateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
	dateStyle: "medium",
	timeStyle: "short",
});

async function fetchLatestBuildInfo(
	signal?: AbortSignal,
): Promise<AppBuildInfo | null> {
	try {
		const response = await fetch(APP_VERSION_ENDPOINT, {
			cache: "no-store",
			headers: {
				"cache-control": "no-store",
				pragma: "no-cache",
			},
			signal,
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as AppBuildInfo;
		if (
			typeof data?.releaseId !== "string" ||
			typeof data?.buildId !== "string" ||
			typeof data?.buildTimestamp !== "number" ||
			typeof data?.builtAt !== "string"
		) {
			return null;
		}

		return data;
	} catch {
		return null;
	}
}

export function AppUpdateNotifier() {
	const [availableBuild, setAvailableBuild] = useState<AppBuildInfo | null>(
		null,
	);
	const [dismissedReleaseId, setDismissedReleaseId] = useState<string | null>(
		null,
	);
	const [isReloading, setIsReloading] = useState(false);

	useEffect(() => {
		if (!import.meta.env.PROD) {
			return;
		}

		let isDisposed = false;

		const checkForUpdates = async () => {
			if (isDisposed) {
				return;
			}

			const nextBuild = await fetchLatestBuildInfo();
			if (!nextBuild || isDisposed) {
				return;
			}

			if (nextBuild.releaseId !== APP_BUILD_INFO.releaseId) {
				setAvailableBuild((currentBuild) =>
					currentBuild?.releaseId === nextBuild.releaseId
						? currentBuild
						: nextBuild,
				);
			}
		};

		void checkForUpdates();

		const intervalId = window.setInterval(() => {
			void checkForUpdates();
		}, APP_VERSION_CHECK_INTERVAL_MS);

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				void checkForUpdates();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			isDisposed = true;
			window.clearInterval(intervalId);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	const shouldShowPrompt =
		availableBuild && availableBuild.releaseId !== dismissedReleaseId;

	const updateLabel = useMemo(() => {
		if (!availableBuild) {
			return null;
		}

		return updateTimeFormatter.format(new Date(availableBuild.buildTimestamp));
	}, [availableBuild]);

	if (!shouldShowPrompt) {
		return null;
	}

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4">
			<div className="pointer-events-auto w-full max-w-lg rounded-3xl border border-[var(--color-voltage)]/20 bg-[rgba(15,15,15,0.94)] p-4 text-[var(--color-photon)] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-1">
						<p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-voltage)]/85">
							Actualización disponible
						</p>
						<p className="text-sm leading-6 text-gray-200">
							Hay una versión más reciente de Zentro lista para cargar.
						</p>
						{updateLabel ? (
							<p className="text-xs text-gray-400">
								Release detectada: {updateLabel}
							</p>
						) : null}
					</div>

					<div className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							onClick={() => setDismissedReleaseId(availableBuild.releaseId)}
							className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-white/20 hover:text-white"
						>
							Más tarde
						</button>
						<button
							type="button"
							onClick={async () => {
								setIsReloading(true);
								try {
									await reloadForFreshBuild();
								} finally {
									setIsReloading(false);
								}
							}}
							disabled={isReloading}
							className="rounded-full bg-[var(--color-voltage)] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#d9f15c] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isReloading ? "Actualizando..." : "Actualizar ahora"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
