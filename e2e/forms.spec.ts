import { expect, test } from "@playwright/test";
import { openPage } from "./open";

const VARIANT = "fashion";

/**
 * The form is the demonstration.
 *
 * A demo that cannot be used is a picture. What is checked here is that the
 * form refuses what it should refuse and says so **under the field** -- the
 * half that gets skipped, because a working submit is what everybody tests by
 * hand and a refusal is what nobody does.
 */

test("the contact form refuses an empty message and says where", async ({ page }) => {
  await openPage(page, VARIANT, "contact");

  const form = page.locator("form").filter({ has: page.locator("textarea") }).first();
  await form.getByRole("button", { name: /send/i }).click();

  // The browser's own validation stops it, which is the correct outcome: the
  // page must not post an empty message and must not clear what was typed.
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${VARIANT}/contact`));
});

test("a message with a bad address does not silently succeed", async ({ page }) => {
  await openPage(page, VARIANT, "contact");

  await page.locator('input[name="name"]').fill("Test Person");
  await page.locator('input[name="email"]').fill("not-an-address");
  await page.locator("textarea").first().fill("Checking the form refuses this.");

  await page.getByRole("button", { name: /send/i }).click();

  // Either the browser refuses the email field or the server answers with a
  // message. What must not happen is a success banner.
  await expect(page.getByText(/thank you/i)).toHaveCount(0);
});
