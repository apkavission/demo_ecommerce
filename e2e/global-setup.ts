/**
 * Ask for every route once, before any browser opens.
 *
 * ---------------------------------------------------------------------------
 * **Why this was needed here and not in the other five demos.**
 *
 * The Next dev server compiles a route the first time it is asked for, and the
 * first request to a cold one can take tens of seconds. The other demos are
 * flat — every spec opens a page and reads it — so each test pays for its own
 * route once and nothing depends on a second one being ready.
 *
 * The shop is a chain: the listing, then a product, then the basket, then the
 * checkout, one after another inside a single test. The first test through it
 * pays four cold compiles against a 30-second budget, and it does not make it.
 * On the suite's first ever run, on 2026-09-01, exactly the four tests that
 * walk that chain failed — twice each, once per viewport — while all 44 others
 * passed. The basket was correct the whole time: driven by hand, with pauses,
 * the same flow adds an Oxford shirt, survives a reload and totals ₹2,499.
 *
 * A suite that fails on the timing of its own dev server is worse than no
 * suite, because its red gets explained away and then its green means nothing.
 * The company website hit this and solved it the same way; this is that fix,
 * with the store's own addresses.
 *
 * Sequential on purpose. Compiling a dozen routes at once on a laptop is how
 * the dev server becomes the slowest part of the run.
 */

/** The three shops, so a cold variant is not paid for inside a test. */
const VARIANTS = ["fashion", "electronics", "grocery"];

async function globalSetup() {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3800";

  const routes = [
    "/",
    "/expired",
    "/admin/login",
    ...VARIANTS.flatMap((variant) => [
      `/${variant}`,
      `/${variant}/shop`,
      `/${variant}/cart`,
      `/${variant}/checkout`,
      `/${variant}/reviews`,
      `/${variant}/questions`,
      `/${variant}/contact`,
      `/${variant}/people`,
    ]),
    // A product page, which is its own route and the slowest of them.
    "/fashion/shop/oxford-shirt",
    // A 404 is a route too, and the first one is compiled on demand as well.
    "/fashion/shop/not-a-real-product",
  ];

  const started = Date.now();

  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        redirect: "manual",
        // Long enough for a cold compile of the heaviest page, short enough
        // that a genuinely hung server does not stall the whole run.
        signal: AbortSignal.timeout(120_000),
      });
      // Read it to the end: a streamed response is not finished being
      // rendered until it has been consumed.
      await response.arrayBuffer();
    } catch {
      /*
        Swallowed deliberately.

        This is a warm-up, not a check. A route that cannot be fetched here is
        a route whose own spec is about to fail with a message that says what
        was actually wrong — which is far more useful than this loop throwing
        and taking the entire suite down before a single test has run.
      */
    }
  }

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[e2e] warmed ${routes.length} routes in ${seconds}s`);
}

export default globalSetup;
