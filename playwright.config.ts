import { defineConfig, devices } from "@playwright/test";

/*
  `.env.local`, for the service key the share-link setup needs and nothing else.

  Next loads it for the application; Playwright does not, so the setup project
  would find `SUPABASE_SERVICE_ROLE_KEY` unset on a machine where it is
  perfectly well configured — and then skip itself, and then every spec would
  fail on the expired screen for a reason nothing on screen explains.

  `process.loadEnvFile` is Node's own, so this needs no dependency. Wrapped,
  because a checkout with no `.env.local` is a legitimate state: the setup says
  plainly why it is skipping.
*/
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local. The setup project skips and says so.
}

/**
 * What a visitor sees, and what a visitor must not.
 *
 * **Nobody signs in.** Everything worth testing about a demo happens before a
 * sign-in: the shop loads, the switcher moves between businesses, the panel
 * refuses, and a link-only business is not reachable by typing its address.
 * Testing the panel would need the owner's own session, which is a manual step
 * per machine, and it would not test the thing these are for.
 *
 * Two widths, because a demo is opened on a phone at least as often as on a
 * laptop -- somebody forwards the link and it is read on the train.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "line",

  /*
    Every route is requested once before any browser opens.

    The dev server compiles a route the first time it is asked for. The shop
    specs walk a chain — listing, then a product, then the basket, then the
    checkout — and the first test through it paid four cold compiles inside one
    30-second budget. On this suite's first ever run, on 2026-09-01, exactly
    those four tests failed, twice each, one per viewport, while all 44 others
    passed — and the shop was correct the whole time: driven by hand with
    pauses, the same flow adds an Oxford shirt, survives a reload and totals
    ₹2,499.

    Paying the compile up front, in plain fetches, is what makes the result
    mean something. See `e2e/global-setup.ts`.
  */
  globalSetup: "./e2e/global-setup.ts",

  /* Sixty seconds, not thirty. A warmed route is quick, but the checkout
     writes an order and reads it back, and a laptop running two workers and a
     dev server beside them is not a quiet machine. */
  timeout: 60_000,

  /* Ten seconds, not the default five: this runs against a Next dev server,
     which compiles each route the first time it is asked for. Not a retry -- a
     retry lets a genuinely broken screen pass on the second go. */
  expect: { timeout: 10_000 },

  workers: 2,

  use: {
    baseURL: "http://localhost:3800",
    trace: "retain-on-failure",
  },

  projects: [
    /*
      One setup, then two widths that reuse its cookie.

      The demo is opened by invitation, so a browser with no share link sees the
      expired screen and nothing else. This mints a link once per run rather
      than once per spec — six specs each making their own would be six rows in
      the panel after every run.
    */
    { name: "setup", testMatch: /share\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/visitor.json" },
      dependencies: ["setup"],
      testIgnore: /(share\.setup|open)\.ts/,
    },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], storageState: "e2e/.auth/visitor.json" },
      dependencies: ["setup"],
      testIgnore: /(share\.setup|open)\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3800/",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
  },
});
