import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@shared": resolve("src/shared"),
      "@renderer": resolve("src/renderer/src"),
    },
  },
});
