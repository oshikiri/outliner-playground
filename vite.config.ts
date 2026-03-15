import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [preact(), tailwindcss()],
  test: {
    coverage: {
      exclude: ["eslint/**"],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "eslint/**/*.test.mjs"],
  },
});
