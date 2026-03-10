import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	build: {
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					// Elimina el hash específicamente para el css global
					if (assetInfo.names?.includes("globals.css")) {
						return "assets/globals[extname]"; // Output: assets/globals.css
					}
					// Mantiene el comportamiento por defecto con hash para el resto
					return "assets/[name]-[hash][extname]";
				},
			},
		},
	},
});

export default config;
