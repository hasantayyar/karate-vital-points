import { createHash } from "node:crypto";
import { copyFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages project site: https://<user>.github.io/<repo-name>/
 * CI sets VITE_BASE_PATH automatically. Local default: /karate/
 */
const base = process.env.VITE_BASE_PATH ?? "/karate/";
const pointsSourcePath = resolve("src/data/points.json");
const pointsPublicPath = resolve("public/points.json");

function readPointsSource(): string {
  return readFileSync(pointsSourcePath, "utf-8");
}

function pointsRevision(source: string): string {
  return createHash("sha256").update(source).digest("hex").slice(0, 12);
}

function syncPointsJson(): string {
  const source = readPointsSource();
  copyFileSync(pointsSourcePath, pointsPublicPath);
  return source;
}

function pointsJsonPlugin(): Plugin {
  return {
    name: "points-json",
    buildStart() {
      syncPointsJson();
    },
    configureServer() {
      syncPointsJson();
    },
    handleHotUpdate({ file, server }) {
      if (file === pointsSourcePath) {
        syncPointsJson();
        server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}

const pointsSource = syncPointsJson();

export default defineConfig({
  base,
  define: {
    __POINTS_REVISION__: JSON.stringify(pointsRevision(pointsSource)),
  },
  plugins: [pointsJsonPlugin(), react(), tailwindcss()],
});
