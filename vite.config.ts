import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
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
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
