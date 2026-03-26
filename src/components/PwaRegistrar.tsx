import { useEffect } from "react";
import { clearRuntimeCaches } from "@/lib/app-build";

const SERVICE_WORKER_URL = "/sw.js";

export function PwaRegistrar() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		if (!import.meta.env.PROD) {
			void clearRuntimeCaches();
			return;
		}

		const register = async () => {
			try {
				await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
					scope: "/",
				});
			} catch (error) {
				console.error(
					"No se pudo registrar el service worker de Zentro.",
					error,
				);
			}
		};

		if (document.readyState === "complete") {
			void register();
			return;
		}

		const handleLoad = () => {
			void register();
		};

		window.addEventListener("load", handleLoad, { once: true });

		return () => {
			window.removeEventListener("load", handleLoad);
		};
	}, []);

	return null;
}
