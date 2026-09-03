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

      /* `server-only` throws at collection under vitest — it is a bundler
         guard, and the real check runs in `next build`. Stubbed so the email
         frame, which is server-only, can be tested at all. */
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
