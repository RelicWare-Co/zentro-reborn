declare const __APP_RELEASE_ID__: string;
declare const __APP_BUILD_ID__: string;
declare const __APP_BUILD_TIMESTAMP__: number;
declare const __APP_BUILT_AT__: string;

export interface AppBuildInfo {
	releaseId: string;
	buildId: string;
	buildTimestamp: number;
	builtAt: string;
}

export const APP_BUILD_INFO: AppBuildInfo = {
	releaseId: __APP_RELEASE_ID__,
	buildId: __APP_BUILD_ID__,
	buildTimestamp: __APP_BUILD_TIMESTAMP__,
	builtAt: __APP_BUILT_AT__,
};

export const APP_VERSION_ENDPOINT = "/_app-version";
export const APP_VERSION_CHECK_INTERVAL_MS = 60_000;

export async function clearRuntimeCaches() {
	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		for (const registration of registrations) {
			await registration.unregister();
		}
	}

	if ("caches" in window) {
		const cacheKeys = await caches.keys();
		await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
	}
}

export async function reloadForFreshBuild() {
	await clearRuntimeCaches();
	window.location.reload();
}
