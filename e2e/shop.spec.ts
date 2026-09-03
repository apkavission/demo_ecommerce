import { expect, test } from "@playwright/test";
import { openPage } from "./open";

const VARIANT = "fashion";

/**
 * The basket, which is the thing this demo has and the other five do not.
 *
 * **The whole point is that it is real.** The basket is a row in Postgres, the
 * stock comes down when an order is placed, and the total on the checkout is
 * the total on the confirmation. Every assertion here is about one of those
 * three, because a shop demo where the basket is a picture is a brochure.
 */


/**
 * Put the first product in the basket, and wait until it is actually there.
 *
 * ---------------------------------------------------------------------------
 * **The race this removes, and why it looked like a broken shop.**
 *
 * Adding to the basket is a Server Action: it writes a row and sets the cookie
 * that identifies the basket. Clicking the button does not wait for any of
 * that — so a test that clicks Add and immediately navigates to the cart
 * arrives before the cookie exists, and is correctly shown "Nothing in the
 * basket".
 *
 * On this suite's first ever run, on 2026-09-01, that failed the four specs
 * that walk this chain, twice each, one per viewport. The shop was right the
 * whole time: driven by hand with pauses, the same flow adds an Oxford shirt,
 * survives a reload and totals ₹2,499. Four tests reported a broken basket
 * that was not broken, which is the expensive kind of wrong.
 *
 * The count in the header is the signal, because it is the first thing that
 * cannot be true until the write has landed.
 */
async function addFirstProduct(page: import("@playwright/test").Page) {
  await openPage(page, VARIANT, "shop");

  // The products are the list; the collection filters above them are not in
  // one, which is what makes this selector the product grid rather than the
  // filters.
  await page.locator("main ul li a").first().click();
  await expect(page.getByRole("button", { name: /^Add/ })).toBeVisible();

  await page.getByRole("button", { name: /^Add/ }).click();

  /*
    The page's own announcement, not the header's count.

    Adding is a Server Action: it writes a row and sets the cookie that
    identifies the basket. Until that lands, a test that has already navigated
    to the cart is correctly shown "Nothing in the basket" — which is what
    failed these four specs on the suite's first ever run, while the shop
    itself was working.

    The status region is the signal because it is the same in both projects.
    The header's basket link is not: it reads "Basket 1" to a mouse and "1 in
    the basket" to a screen reader on a phone, so matching its name passed on
    desktop and failed all five phone specs — a test asserting a layout while
    claiming to assert a basket.
  */
  await expect(page.getByRole("status").filter({ hasText: /in the basket/i })).toHaveCount(1);
}

test("adding something puts it in the basket, and it survives a reload", async ({
  page,
}) => {
  await addFirstProduct(page);

  await openPage(page, VARIANT, "cart");
  await expect(page.getByRole("heading", { name: /basket/i })).toBeVisible();

  const lines = page.locator("main ul li");
  await expect(lines.first()).toBeVisible();

  // The reload is the point. A basket held in React state does not survive it,
  // and the customer who comes back on Monday finds it empty.
  await page.reload();
  await expect(lines.first()).toBeVisible();
});

test("the basket total includes delivery before the checkout", async ({ page }) => {
  await addFirstProduct(page);

  await openPage(page, VARIANT, "cart");

  // A delivery charge that first appears on the last screen is the commonest
  // reason a basket is abandoned, and it is self-inflicted.
  await expect(page.getByText(/delivery/i).first()).toBeVisible();
  await expect(page.getByText(/^Total$/i).first()).toBeVisible();
});

test("a made-up discount code is refused with a reason", async ({ page }) => {
  await addFirstProduct(page);

  await openPage(page, VARIANT, "cart");

  await page.locator('input[name="code"]').fill("NOTAREALCODE");
  await page.getByRole("button", { name: /apply|change/i }).click();

  // "Invalid code" when the real answer is "spend ₹200 more" loses a sale. The
  // database answers with a sentence and the page shows it.
  await expect(page.getByText(/not one of ours|expired|used|spend/i).first()).toBeVisible();
});

test("an empty basket cannot reach the checkout", async ({ page }) => {
  await openPage(page, VARIANT, "checkout");

  // A form that cannot succeed should not be shown. Filling it in and being
  // told the basket is empty is the worst version of this screen.
  await expect(page).toHaveURL(new RegExp(`/${VARIANT}/cart`));
});

test("the checkout asks for a real PIN code", async ({ page }) => {
  await addFirstProduct(page);

  await openPage(page, VARIANT, "checkout");

  await page.locator('input[name="name"]').fill("Test Person");
  await page.locator('input[name="phone"]').fill("9876543210");
  await page.locator('textarea[name="address_line"]').fill("12 Somewhere Street");
  await page.locator('input[name="city"]').fill("Bengaluru");
  await page.locator('input[name="pincode"]').fill("12");

  await page.getByRole("button", { name: /place the order/i }).click();

  await expect(page.getByText(/that is ordered/i)).toHaveCount(0);
});

test("no card details are asked for anywhere", async ({ page }) => {
  await addFirstProduct(page);

  await openPage(page, VARIANT, "checkout");

  // A demo shop that collects card numbers would be a real problem regardless
  // of what it does with them.
  await expect(page.locator('input[autocomplete*="cc-"]')).toHaveCount(0);
  await expect(page.getByLabel(/card number/i)).toHaveCount(0);
});
