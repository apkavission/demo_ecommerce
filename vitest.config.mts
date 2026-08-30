import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests: node environment, no DOM.
 *
 * Everything tested here is a pure function - how a malformed palette is read,
 * what a date looks like, which validation message survives. None of it needs a
 * browser, and what does need a browser is tested in one.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
