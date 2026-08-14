import { defineConfig } from "vitest/config";

// Vitest reads vite.config.mjs by default, which scopes root to the demo-site.
// This config takes precedence and keeps the test run at the repo root.
export default defineConfig({
  root: ".",
});
