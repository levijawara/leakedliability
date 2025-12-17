import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    watch: false,
    reporters: ["default"],
    environment: "node",
    testTimeout: 30000, // 30 seconds for network requests
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
