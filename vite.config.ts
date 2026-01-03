import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	build: {
		ssr: true,
		target: "esnext",
		outDir: "dist",
		manifest: true,
		rollupOptions: {
			input: "./src/index.ts",
		},
		minify: "esbuild",
		sourcemap: true,
	},
});
