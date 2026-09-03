import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * A way in, for the rest of the suite.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** Since 2026-09-03 a demo is opened by invitation: typing
 * a business's address gets the expired screen, and only a browser holding a
 * live share link gets the site. Every spec here navigates straight to an
 * address, so without this they all test the expired screen — which is how
 * eighteen of these tests started failing in one afternoon.
 *
 * That is not a workaround. The suite now takes the path a prospect takes:
 * redeem the link, then read the site.
 *
 * ---------------------------------------------------------------------------
 * **One link per business, not one for the demo.**
 *
 * A link opens *one* business — that is the point of it. A single link would
 * send every spec to the same place, and "the three businesses do not share a
 * heading" would fail with three identical headings, blaming the site for
 * something the setup did.
 *
 * ---------------------------------------------------------------------------
 * **It writes rows, and cleans up after itself.** The links are labelled so
 * anybody who finds them in the panel knows what they are, every run removes
 * what the last one left, and they expire in a day so a crashed run does not
 * leave a live door open.
 */

const LABEL = "Browser tests — safe to delete";

setup("mint a share link for each business", async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  /*
    Skipped rather than failed on a machine with no service key.

    The specs cannot run without links and will fail anyway — but failing *here*
    would blame the setup for a missing environment variable instead of saying
    so plainly.
  */
  setup.skip(
    !url || !key,
    "No SUPABASE_SERVICE_ROLE_KEY, so no share link can be made. Add it to .env.local.",
  );

  const db = createClient(url as string, key as string, {
    db: { schema: "demo_shop" },
    auth: { persistSession: false },
  });

  /*
    Only this run's own leftovers, and only the stale ones.

    Deleting every link with this label removes the links a *concurrent* run has
    just minted, and every test in that run then lands on the expired screen —
    which looks exactly like a broken gate and is really two cleanups colliding.
    That happened once, and it cost half an hour of reading failures that were
    telling the truth about the wrong thing.

    An hour is longer than any run and far shorter than the day these live for,
    so a crashed run is still tidied and a running one is left alone.
  */
  await db
    .from("share_links")
    .delete()
    .eq("label", LABEL)
    .lt("created_at", new Date(Date.now() - 3_600_000).toISOString());

  const { data: variants } = await db
    .from("variants")
    .select("id, slug")
    .eq("is_active", true)
    .order("sort_order");

  expect(variants?.length, "the demo has at least one active business").toBeGreaterThan(0);

  const links: Record<string, string> = {};

  for (const variant of variants ?? []) {
    /* Long and random, the same shape the estate screen issues. */
    const token = (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(
      /-/g,
      "",
    );

    const { error } = await db.from("share_links").insert({
      variant_id: variant.id,
      token,
      label: LABEL,
      /* A day is plenty for a run, and a short life means a row left behind by
         a crash stops working on its own. */
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(error, error?.message).toBeNull();
    links[variant.slug] = token;
  }

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync("e2e/.auth/links.json", JSON.stringify(links, null, 2));

  /*
    The first business is redeemed into the saved state, so a spec that does not
    care which one it is looking at needs no ceremony. Redeemed rather than
    merely requested: the cookie is only set on the way through.
  */
  const first = (variants ?? [])[0];
  await page.goto(`/s/${links[first.slug]}`);
  await expect(page).toHaveURL(new RegExp(`/${first.slug}$`));

  await page.context().storageState({ path: "e2e/.auth/visitor.json" });
});
