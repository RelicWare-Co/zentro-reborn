import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import { AppBootSplash } from "../components/AppBootSplash";
import { AppUpdateNotifier } from "../components/AppUpdateNotifier";
import { DefaultCatchBoundary } from "../components/DefaultCatchBoundary";
import { DeploymentSkewProtection } from "../components/DeploymentSkewProtection";
import { PwaRegistrar } from "../components/PwaRegistrar";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { APP_BUILD_INFO } from "../lib/app-build";
import { SITE_DESCRIPTION, SITE_TITLE } from "../lib/site";
import appCss from "../styles/globals.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;
const DEV_SERVICE_WORKER_RESET_SCRIPT = import.meta.env.PROD
	? ""
	: `(function(){try{if(!('serviceWorker'in navigator)){return}var key='zentro:dev-sw-reset';navigator.serviceWorker.getRegistrations().then(function(registrations){if(registrations.length===0){sessionStorage.removeItem(key);return}return Promise.all(registrations.map(function(registration){return registration.unregister()})).then(function(){if(!('caches'in window)){return}return caches.keys().then(function(cacheKeys){return Promise.all(cacheKeys.map(function(cacheKey){return caches.delete(cacheKey)}))})}).then(function(){if(navigator.serviceWorker.controller&&sessionStorage.getItem(key)!=='done'){sessionStorage.setItem(key,'done');window.location.reload()}})}).catch(function(){})}catch(e){}})();`;
const BOOTSTRAP_INIT_SCRIPT = `${THEME_INIT_SCRIPT}${DEV_SERVICE_WORKER_RESET_SCRIPT}`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	errorComponent: DefaultCatchBoundary,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title: SITE_TITLE,
			},
			{
				name: "description",
				content: SITE_DESCRIPTION,
			},
			{
				name: "application-name",
				content: SITE_TITLE,
			},
			{
				name: "theme-color",
				content: "#0f0f0f",
			},
			{
				name: "mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{
				name: "apple-mobile-web-app-title",
				content: SITE_TITLE,
			},
			{
				name: "format-detection",
				content: "telephone=no",
			},
			{
				name: "app-release-id",
				content: APP_BUILD_INFO.releaseId,
			},
			{
				name: "app-build-id",
				content: APP_BUILD_INFO.buildId,
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const { hasResolvedInitialMatch, isRoutePending } = useRouterState({
		select: (state) => ({
			hasResolvedInitialMatch: state.matches.length > 0,
			isRoutePending:
				state.isLoading ||
				state.matches.some((match) => match.status === "pending"),
		}),
		structuralSharing: true,
	});
	const [hasCompletedAppBoot, setHasCompletedAppBoot] = useState(
		() => hasResolvedInitialMatch && !isRoutePending,
	);

	useEffect(() => {
		if (hasCompletedAppBoot) {
			return;
		}

		if (!hasResolvedInitialMatch || isRoutePending) {
			return;
		}

		setHasCompletedAppBoot(true);
	}, [hasCompletedAppBoot, hasResolvedInitialMatch, isRoutePending]);

	return (
		<html lang="es-CO" suppressHydrationWarning>
			<head>
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: required for theme initialization */}
				<script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="min-h-screen bg-[var(--color-void)] font-sans text-[var(--color-photon)] antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				<TanStackQueryProvider>
					{children}
					{hasCompletedAppBoot ? null : <AppBootSplash />}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</TanStackQueryProvider>
				<AppUpdateNotifier />
				<DeploymentSkewProtection />
				<PwaRegistrar />
				<Scripts />
			</body>
		</html>
	);
}
