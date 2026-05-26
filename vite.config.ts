import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages project site: https://<user>.github.io/<repo-name>/
 * CI sets VITE_BASE_PATH automatically. Local default: /karate/
 */
const base = process.env.VITE_BASE_PATH ?? "/karate/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});
