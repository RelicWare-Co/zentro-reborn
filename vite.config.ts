import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function resolveAppReleaseId(fallbackBuildId: string) {
	const envReleaseId = [
		process.env.APP_RELEASE_ID,
		process.env.RELEASE_ID,
		process.env.GITHUB_SHA,
		process.env.CI_COMMIT_SHA,
		process.env.CI_COMMIT_SHORT_SHA,
		process.env.VERCEL_GIT_COMMIT_SHA,
		process.env.RENDER_GIT_COMMIT,
		process.env.CF_PAGES_COMMIT_SHA,
		process.env.COMMIT_SHA,
		process.env.SOURCE_VERSION,
	]
		.map((value) => value?.trim())
		.find((value) => Boolean(value));

	return envReleaseId ?? fallbackBuildId;
}

const APP_BUILD_TIMESTAMP = Number(
	process.env.APP_BUILD_TIMESTAMP ?? Date.now(),
);
const APP_BUILT_AT = new Date(APP_BUILD_TIMESTAMP).toISOString();
const APP_BUILD_ID = APP_BUILT_AT;
const APP_RELEASE_ID = resolveAppReleaseId(APP_BUILD_ID);

function appBuildMetadataPlugin(): Plugin {
	return {
		name: "app-build-metadata",
		config() {
			return {
				define: {
					__APP_RELEASE_ID__: JSON.stringify(APP_RELEASE_ID),
					__APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
					__APP_BUILD_TIMESTAMP__: JSON.stringify(APP_BUILD_TIMESTAMP),
					__APP_BUILT_AT__: JSON.stringify(APP_BUILT_AT),
				},
			};
		},
		async writeBundle(outputOptions) {
			const outputDir = outputOptions.dir;
			if (!outputDir) {
				return;
			}

			const normalizedOutputDir = outputDir
				.split(path.sep)
				.join(path.posix.sep);
			if (!normalizedOutputDir.endsWith("/client")) {
				return;
			}

			const outDir = path.resolve(outputDir);
			await mkdir(outDir, { recursive: true });
			await writeFile(
				path.join(outDir, "app-version.json"),
				JSON.stringify(
					{
						releaseId: APP_RELEASE_ID,
						buildId: APP_BUILD_ID,
						buildTimestamp: APP_BUILD_TIMESTAMP,
						builtAt: APP_BUILT_AT,
					},
					null,
					2,
				),
			);
		},
	};
}

const config = defineConfig({
	preview: {
		host: "127.0.0.1",
	},
	resolve: {
		tsconfigPaths: true,
	},
	build: {
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					const assetNames = [
						...(assetInfo.names ?? []),
						...(assetInfo.originalFileNames ?? []),
					];

					if (assetNames.includes("globals.css")) {
						return "assets/globals[extname]";
					}

					return "assets/[name]-[hash][extname]";
				},
			},
		},
	},
	plugins: [
		appBuildMetadataPlugin(),
		devtools(),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
				prerender: {
					outputPath: "/index",
				},
			},
		}),
		viteReact(),
	],
});

export default config;
