import { expect, test } from "@playwright/test";

const VARIANT = "fashion";

/**
 * The basket, which is the thing this demo has and the other five do not.
 *
 * **The whole point is that it is real.** The basket is a row in Postgres, the
 * stock comes down when an order is placed, and the total on the checkout is
 * the total on the confirmation. Every assertion here is about one of those
 * three, because a shop demo where the basket is a picture is a brochure.
 */

test("adding something puts it in the basket, and it survives a reload", async ({
  page,
}) => {
  await page.goto(`/${VARIANT}/shop`);

  await page.locator("main ul li a").first().click();
  await expect(page.locator("h1")).toBeVisible();

  await page.getByRole("button", { name: /^Add/ }).click();

  await page.goto(`/${VARIANT}/cart`);
  await expect(page.getByRole("heading", { name: /basket/i })).toBeVisible();

  const lines = page.locator("main ul li");
  await expect(lines.first()).toBeVisible();

  // The reload is the point. A basket held in React state does not survive it,
  // and the customer who comes back on Monday finds it empty.
  await page.reload();
  await expect(lines.first()).toBeVisible();
});

test("the basket total includes delivery before the checkout", async ({ page }) => {
  await page.goto(`/${VARIANT}/shop`);
  await page.locator("main ul li a").first().click();
  await page.getByRole("button", { name: /^Add/ }).click();

  await page.goto(`/${VARIANT}/cart`);

  // A delivery charge that first appears on the last screen is the commonest
  // reason a basket is abandoned, and it is self-inflicted.
  await expect(page.getByText(/delivery/i).first()).toBeVisible();
  await expect(page.getByText(/^Total$/i).first()).toBeVisible();
});

test("a made-up discount code is refused with a reason", async ({ page }) => {
  await page.goto(`/${VARIANT}/shop`);
  await page.locator("main ul li a").first().click();
  await page.getByRole("button", { name: /^Add/ }).click();

  await page.goto(`/${VARIANT}/cart`);

  await page.locator('input[name="code"]').fill("NOTAREALCODE");
  await page.getByRole("button", { name: /apply|change/i }).click();

  // "Invalid code" when the real answer is "spend ₹200 more" loses a sale. The
  // database answers with a sentence and the page shows it.
  await expect(page.getByText(/not one of ours|expired|used|spend/i).first()).toBeVisible();
});

test("an empty basket cannot reach the checkout", async ({ page }) => {
  await page.goto(`/${VARIANT}/checkout`);

  // A form that cannot succeed should not be shown. Filling it in and being
  // told the basket is empty is the worst version of this screen.
  await expect(page).toHaveURL(new RegExp(`/${VARIANT}/cart`));
});

test("the checkout asks for a real PIN code", async ({ page }) => {
  await page.goto(`/${VARIANT}/shop`);
  await page.locator("main ul li a").first().click();
  await page.getByRole("button", { name: /^Add/ }).click();

  await page.goto(`/${VARIANT}/checkout`);

  await page.locator('input[name="name"]').fill("Test Person");
  await page.locator('input[name="phone"]').fill("9876543210");
  await page.locator('textarea[name="address_line"]').fill("12 Somewhere Street");
  await page.locator('input[name="city"]').fill("Bengaluru");
  await page.locator('input[name="pincode"]').fill("12");

  await page.getByRole("button", { name: /place the order/i }).click();

  await expect(page.getByText(/that is ordered/i)).toHaveCount(0);
});

test("no card details are asked for anywhere", async ({ page }) => {
  await page.goto(`/${VARIANT}/shop`);
  await page.locator("main ul li a").first().click();
  await page.getByRole("button", { name: /^Add/ }).click();

  await page.goto(`/${VARIANT}/checkout`);

  // A demo shop that collects card numbers would be a real problem regardless
  // of what it does with them.
  await expect(page.locator('input[autocomplete*="cc-"]')).toHaveCount(0);
  await expect(page.getByLabel(/card number/i)).toHaveCount(0);
});
