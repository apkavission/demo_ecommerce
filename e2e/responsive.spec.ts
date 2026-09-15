import { expect, test } from "@playwright/test";
import { openPage, openVariant } from "./open";

/**
 * Nothing slides under the thumb, at any width, on any page.
 *
 * ---------------------------------------------------------------------------
 * **This is the demo's most exposed property.** A prospect is *sent* a link and
 * opens it on whatever they are holding — very often a phone, on a train,
 * because somebody forwarded it. A page that scrolls sideways there is the
 * first thing they notice and the last impression they keep, and it is the one
 * failure that cannot be talked around in the meeting afterwards.
 *
 * The suite already asked this, on the front page of each business at the two
 * widths its projects run. This asks it on every page and at six.
 *
 * ---------------------------------------------------------------------------
 * **What this cannot see.** Whether a page *reads* well at 360px needs eyes.
 * Wide content is allowed to scroll inside its own box — a menu, a table, a
 * price list. What is measured is the document itself.
 */

/** Phone, big phone, tablet, laptop, desktop. */
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

const PAGES = ["shop", "reviews", "questions", "contact"];

async function measure(page: import("@playwright/test").Page): Promise<{
  scrollWidth: number;
  clientWidth: number;
}> {
  /* A lazy image or a web font still settling can change the layout once more
     after load. */
  await page.waitForLoadState("networkidle");

  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

function fits(where: string, measured: { scrollWidth: number; clientWidth: number }): void {
  /* One pixel of tolerance: a sub-pixel width rounds up in Chromium and is not
     something a person can scroll. */
  expect(
    measured.scrollWidth,
    `${where} is ${measured.scrollWidth}px wide in a ${measured.clientWidth}px viewport`,
  ).toBeLessThanOrEqual(measured.clientWidth + 1);
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("the business a link opens", async ({ page }) => {
      /* VARIANTS is not imported: which businesses exist is the demo's own
         business, and the setup minted a link for each. The first is the one
         the saved state already holds. */
      await page.goto("/");
      fits("the front page", await measure(page));
    });

    for (const path of PAGES) {
      test(`/${path}`, async ({ page }) => {
        /* The slug comes from wherever the saved state landed, so this follows
           the demo rather than restating its business names.

           **Waited for, not read straight after the `goto`.** The bare address
           answers 200 and sends the browser on to the business it opens, and
           under a streaming render that second step happens after the
           navigation has settled. Reading `page.url()` immediately gives "/",
           so the slug came out empty and every page under it was requested as
           `//shop` — which a browser reads as the host `shop`, and the
           failure says `net::ERR_ABORTED at http://shop/` rather than
           anything about this demo. */
        await page.goto("/");
        await page.waitForURL(/\/[a-z0-9-]+$/);
        const slug = new URL(page.url()).pathname.split("/")[1];

        await openPage(page, slug, path);
        fits(`/${slug}/${path}`, await measure(page));
      });
    }
  });
}

/**
 * The expired screen, too.
 *
 * It is the page most likely to be seen on a phone — somebody opening a link
 * that ran out while they were on the way to the meeting — and the one nobody
 * would think to check.
 */
test.describe("the expired screen at 360px", () => {
  test.use({ viewport: { width: 360, height: 900 } });

  test("does not scroll sideways", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto("/not-a-real-business");
    fits("the expired screen", await measure(page));

    await context.close();
  });
});

/* `openVariant` is exported for specs that need a named business; this one
   follows whichever the saved state opened. Referenced so the import is used
   and the helper stays discoverable from here. */
void openVariant;
