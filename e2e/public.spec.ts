import { expect, test } from "@playwright/test";

const VARIANTS = ["fashion", "electronics", "grocery"];
const PAGES = ["shop", "people", "reviews", "questions", "contact"];

/**
 * The demo, as a prospect meets it.
 *
 * The assertions are deliberately about **what is on the screen**, not about
 * class names or test ids. A test that checks for `data-testid="hero"` passes on
 * a page rendering an empty hero, which is the failure that actually happens
 * here: a query returns an error, the page turns it into an empty list, and
 * everything still renders.
 */

test.describe("the public site", () => {
  test("the bare address lands on a business", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`/(${VARIANTS.join("|")})$`));
  });

  for (const variant of VARIANTS) {
    test(`/${variant} renders its own name`, async ({ page }) => {
      await page.goto(`/${variant}`);

      // The business name is in the header link, and it is different per
      // variant -- which is the whole claim this demo makes.
      const name = await page.locator("header a").first().textContent();
      expect(name?.trim().length ?? 0).toBeGreaterThan(1);

      await expect(page.locator("h1")).toBeVisible();
    });
  }

  for (const path of PAGES) {
    test(`/${VARIANTS[0]}/${path} renders`, async ({ page }) => {
      const response = await page.goto(`/${VARIANTS[0]}/${path}`);

      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  test("the three businesses do not share a heading", async ({ page }) => {
    const headings: string[] = [];

    for (const variant of VARIANTS) {
      await page.goto(`/${variant}`);
      headings.push((await page.locator("h1").first().textContent()) ?? "");
    }

    // Three variants rendering the same words is the failure this demo exists
    // to avoid: one site with the name swapped is not three businesses.
    expect(new Set(headings).size).toBe(headings.length);
  });

  test("nothing scrolls sideways", async ({ page }) => {
    for (const variant of VARIANTS) {
      await page.goto(`/${variant}`);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow, `${variant} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });

  test("every demo says it is a demo", async ({ page }) => {
    await page.goto(`/${VARIANTS[0]}`);

    // A prospect must never be in doubt. It is the one line that may not be
    // removed to make the demo more convincing.
    await expect(page.getByText(/demonstration/i).first()).toBeVisible();
  });

  test("the demo is never indexed", async ({ page }) => {
    await page.goto(`/${VARIANTS[0]}`);

    const robots = page.locator('head meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  });
});

test.describe("dark mode", () => {
  test("the toggle changes the page and survives a reload", async ({ page }) => {
    await page.goto(`/${VARIANTS[0]}`);

    const before = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    const toggle = page.getByRole("button", { name: /dark|light|theme/i }).first();
    await toggle.click();

    await expect
      .poll(async () =>
        page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      )
      .not.toBe(before);

    const after = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    await page.reload();

    // A choice that does not survive a reload is not a choice, and the flash
    // back to light is the symptom everybody notices and nobody reports.
    await expect
      .poll(async () =>
        page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      )
      .toBe(after);
  });

  test("each business has its own dark palette", async ({ page }) => {
    const backgrounds: string[] = [];

    for (const variant of VARIANTS) {
      await page.goto(`/${variant}`);
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "dark"),
      );
      backgrounds.push(
        await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      );
    }

    // Not all three identical. A dark palette derived from the light one gives
    // every business the same near-black, which is the flat look this estate
    // spent a fortnight not being able to name.
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });
});

test.describe("what a visitor must not reach", () => {
  test("the panel asks for a sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a business that does not exist is not found", async ({ page }) => {
    const response = await page.goto("/not-a-real-business");

    // Either a 404 or a redirect to the expired screen. Both are correct; what
    // would be wrong is a 200 rendering an empty site.
    const url = page.url();
    expect(response?.status() === 404 || url.includes("/expired")).toBe(true);
  });

  test("a made-up share link goes nowhere", async ({ page }) => {
    await page.goto("/s/not-a-real-token");
    await expect(page).toHaveURL(/\/expired/);
  });
});
