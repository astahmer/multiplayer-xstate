import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import jsxSource from "unplugin-jsx-source/vite";
import Inspect from "vite-plugin-inspect";

const defaultTransformFileName = (
	id: string,
	loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	},
) => {
	const fileName = id.split("/").slice(-2).join("/") ?? "unknown";
	return `${fileName}:${loc.start.line}`;
};

export default defineConfig({
	plugins: [
		Inspect(),
		process.env.NODE_ENV === "development" &&
			jsxSource({
				enforce: "pre",
				transformFileName: (fileName, loc) =>
					defaultTransformFileName(fileName, loc),
			}),
		,
		react(),
		!process.env.VITEST && cloudflare(),
		tsconfigPaths(),
	],
});
