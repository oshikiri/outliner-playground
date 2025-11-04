import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  test: {
    // [P1] @owner: DOM 依存のユニットテストを追加する場合は 'jsdom' を使用すること。
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
