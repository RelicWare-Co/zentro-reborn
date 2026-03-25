const APP_CACHE = "zentro-app-v1";
const ASSET_CACHE = "zentro-assets-v1";
const APP_SHELL_URL = "/index.html";
const PRECACHE_URLS = [
	APP_SHELL_URL,
	"/manifest.json",
	"/favicon.ico",
	"/logo192.png",
	"/logo512.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(APP_CACHE)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then(async (cacheNames) => {
			await Promise.all(
				cacheNames
					.filter((cacheName) => ![APP_CACHE, ASSET_CACHE].includes(cacheName))
					.map((cacheName) => caches.delete(cacheName)),
			);

			await self.clients.claim();
		}),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) {
		return;
	}

	if (
		url.pathname === "/_app-version" ||
		url.pathname.startsWith("/_serverFn/") ||
		url.pathname.startsWith("/api/")
	) {
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(handleNavigationRequest(request));
		return;
	}

	if (isStaticAssetRequest(request, url)) {
		event.respondWith(handleStaticAssetRequest(request));
	}
});

async function handleNavigationRequest(request) {
	const cache = await caches.open(APP_CACHE);

	try {
		const response = await fetch(request);

		if (response.ok) {
			await cache.put(APP_SHELL_URL, response.clone());
			return response;
		}
	} catch (_error) {
		// Ignore and fall back to the cached shell.
	}

	const cachedShell = await cache.match(APP_SHELL_URL);
	return cachedShell || Response.error();
}

async function handleStaticAssetRequest(request) {
	const cache = await caches.open(ASSET_CACHE);
	const cachedResponse = await cache.match(request);

	const networkResponsePromise = fetch(request)
		.then(async (response) => {
			if (response.ok) {
				await cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => null);

	if (cachedResponse) {
		return cachedResponse;
	}

	return networkResponsePromise.then((response) => response || Response.error());
}

function isStaticAssetRequest(request, url) {
	if (
		["style", "script", "font", "image", "worker"].includes(
			request.destination,
		)
	) {
		return true;
	}

	return (
		url.pathname === "/manifest.json" ||
		url.pathname.endsWith(".css") ||
		url.pathname.endsWith(".js") ||
		url.pathname.endsWith(".ico") ||
		url.pathname.endsWith(".png") ||
		url.pathname.endsWith(".svg") ||
		url.pathname.endsWith(".woff2")
	);
}
