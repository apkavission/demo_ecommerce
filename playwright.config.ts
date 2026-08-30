import { defineConfig, devices } from "@playwright/test";

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
  timeout: 30_000,

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
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3800/",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
  },
});
