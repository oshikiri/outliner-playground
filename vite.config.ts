import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

const preactCompatAlias = {
  react: "preact/compat",
  "react-dom": "preact/compat",
  "react-dom/test-utils": "preact/test-utils",
  "react/jsx-runtime": "preact/jsx-runtime",
};

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: preactCompatAlias,
  },
  test: {
    alias: preactCompatAlias,
    coverage: {
      exclude: ["eslint/**"],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "eslint/**/*.test.ts"],
  },
});
