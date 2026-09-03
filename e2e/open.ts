import { readFileSync } from "node:fs";
import { expect, type Page, type Response } from "@playwright/test";

/**
 * Open one business the way a prospect does: through its link.
 *
 * ---------------------------------------------------------------------------
 * **Why every spec goes through this rather than `page.goto("/dental")`.**
 *
 * A demo is opened by invitation. Typing the address gets the expired screen —
 * that is the feature, and `check:door` in the company website is what proves
 * it. So a spec that wants to *read* a business has to hold that business's
 * link first, and holding one link does not open another.
 *
 * The tokens come from `share.setup.ts`, which mints one per business at the
 * start of the run.
 */

let links: Record<string, string> | null = null;

function tokens(): Record<string, string> {
  links ??= JSON.parse(readFileSync("e2e/.auth/links.json", "utf8")) as Record<string, string>;
  return links;
}

/** Redeem this business's link, then land on it. */
export async function openVariant(page: Page, slug: string): Promise<void> {
  const token = tokens()[slug];

  expect(token, `no share link was minted for "${slug}" — see e2e/share.setup.ts`).toBeTruthy();

  await page.goto(`/s/${token}`);
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));
}

/**
 * A page *inside* a business, once its link is held.
 *
 * The cookie survives the navigation, so this is a plain `goto` once the link
 * has been redeemed — but it is named so a spec never has to think about
 * whether that has happened yet.
 *
 * **It returns the response**, because several specs assert on the status. A
 * helper that swallowed it would force those back to a raw `goto`, which is
 * the thing that stopped working.
 */
export async function openPage(
  page: Page,
  slug: string,
  path: string,
): Promise<Response | null> {
  if (!page.url().includes(`/${slug}`)) await openVariant(page, slug);

  return page.goto(`/${slug}/${path}`);
}
