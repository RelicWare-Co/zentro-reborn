import { useEffect } from "react";
import { APP_BUILD_INFO, reloadForFreshBuild } from "../lib/app-build";

const MODULE_ERROR_PATTERNS = [
	"Failed to fetch dynamically imported module",
	"Importing a module script failed",
	"ChunkLoadError",
	"Loading CSS chunk",
];

function isAssetUrl(value: string | null | undefined) {
	return Boolean(value?.includes("/assets/"));
}

function isChunkLikeError(value: unknown) {
	if (value instanceof Error) {
		return MODULE_ERROR_PATTERNS.some((pattern) =>
			value.message.includes(pattern),
		);
	}

	if (typeof value === "string") {
		return MODULE_ERROR_PATTERNS.some((pattern) => value.includes(pattern));
	}

	return false;
}

async function recoverFromSkewOnce(reason: string) {
	const reloadKey = `zentro:skew-reload:${APP_BUILD_INFO.buildId}`;

	if (sessionStorage.getItem(reloadKey)) {
		return;
	}

	sessionStorage.setItem(reloadKey, reason);
	console.warn("Detectado deployment skew. Forzando recarga limpia.", reason);

	await reloadForFreshBuild();
}

export function DeploymentSkewProtection() {
	useEffect(() => {
		if (!import.meta.env.PROD) {
			return;
		}

		const handleVitePreloadError = (event: Event) => {
			event.preventDefault();
			void recoverFromSkewOnce("vite:preloadError");
		};

		const handleError = (event: Event) => {
			const errorEvent = event as ErrorEvent;
			if (
				isChunkLikeError(errorEvent.error) ||
				isChunkLikeError(errorEvent.message)
			) {
				void recoverFromSkewOnce("window:error");
				return;
			}

			const target = event.target;
			if (!(target instanceof HTMLElement)) {
				return;
			}

			if (target instanceof HTMLScriptElement && isAssetUrl(target.src)) {
				void recoverFromSkewOnce(`script:${target.src}`);
				return;
			}

			if (
				target instanceof HTMLLinkElement &&
				target.rel === "stylesheet" &&
				isAssetUrl(target.href)
			) {
				void recoverFromSkewOnce(`style:${target.href}`);
			}
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			if (isChunkLikeError(event.reason)) {
				event.preventDefault();
				void recoverFromSkewOnce("unhandledrejection");
			}
		};

		window.addEventListener("vite:preloadError", handleVitePreloadError);
		window.addEventListener("error", handleError, true);
		window.addEventListener("unhandledrejection", handleUnhandledRejection);

		return () => {
			window.removeEventListener("vite:preloadError", handleVitePreloadError);
			window.removeEventListener("error", handleError, true);
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
		};
	}, []);

	return null;
}
