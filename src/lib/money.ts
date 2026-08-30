/**
 * Money, in and out.
 *
 * ---------------------------------------------------------------------------
 * **Everything is paise, and nothing is a float.**
 *
 * A rupee is a hundred paise and an integer count of paise is the one shape
 * that cannot be half of one. The moment money becomes a float, 0.1 + 0.2 is
 * not 0.3, a 15% discount on ₹1,299.99 has a tail of digits nobody can spend,
 * and two screens showing the same basket disagree by a paisa — which is small
 * until it is a customer arguing about it.
 *
 * The suffix `_paise` on every column and every argument here is not decoration.
 * It is the thing that stops somebody rendering 129900 as a price, which is a
 * bug that ships because it looks like a number in the right place.
 *
 * ---------------------------------------------------------------------------
 * **Formatting is pinned to one locale and one currency.**
 *
 * `toLocaleString` without a locale asks the machine, and the server and the
 * browser can answer differently — a price that renders `₹1,299` on one and
 * `₹1,299.00` on the other is a hydration mismatch that appears only on
 * somebody else's computer. The whole estate has been bitten by the same class
 * of bug with dates already.
 */

/**
 * Paise as a person reads it.
 *
 * Whole rupees when it is a whole number of them, because `₹1,299.00` on a shop
 * front reads as a form field rather than as a price. Paise shown when there
 * are any, because hiding them would make the total not match the lines.
 */
export function formatMoney(paise: number | null | undefined, symbol = "₹"): string {
  if (typeof paise !== "number" || Number.isNaN(paise)) return `${symbol}0`;

  const rupees = Math.round(paise) / 100;
  const whole = Number.isInteger(rupees);

  return (
    symbol +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rupees)
  );
}

/**
 * What somebody typed, as paise.
 *
 * Accepts `1299`, `1,299`, `₹1299`, `1299.50` and refuses everything else by
 * returning null rather than NaN — a null has to be handled, a NaN spreads
 * quietly through arithmetic and ends up in a column.
 *
 * Rounds rather than truncates: `10.005` is a hundredth of a rupee somebody
 * meant to charge, and dropping it makes the shop cheaper by one paisa every
 * time, which is the wrong direction to be wrong in.
 */
export function parseMoney(input: string | null | undefined): number | null {
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  return Math.round(Number(cleaned) * 100);
}

/**
 * A percentage off, as a whole number, for the badge on a product card.
 *
 * Returns null rather than zero when there is nothing to claim, so the caller
 * renders no badge at all instead of one saying "0% off".
 */
export function discountPercent(
  priceP: number,
  compareAtP: number | null | undefined,
): number | null {
  if (typeof compareAtP !== "number" || compareAtP <= priceP) return null;

  const off = Math.round(((compareAtP - priceP) / compareAtP) * 100);
  return off > 0 ? off : null;
}

/**
 * What a shop charges to deliver this basket.
 *
 * Here rather than in three pages, because the basket, the checkout and the
 * confirmation all have to agree, and three copies of one rule is how they stop
 * agreeing. The database's `place_order` holds the same rule, which is the one
 * duplication that cannot be avoided: the total a customer is charged must be
 * decided where it cannot be edited by a browser.
 */
export function shippingFor(
  itemsPaise: number,
  shippingPaise: number,
  freeAbove: number | null,
): number {
  if (itemsPaise <= 0) return 0;
  if (freeAbove !== null && itemsPaise >= freeAbove) return 0;
  return shippingPaise;
}

/** How much more to spend for delivery to become free, or null if it already is. */
export function awayFromFreeShipping(
  itemsPaise: number,
  freeAbove: number | null,
): number | null {
  if (freeAbove === null || itemsPaise >= freeAbove) return null;
  return freeAbove - itemsPaise;
}

/** What is left on the shelf, given a product's count and the chosen option's. */
export function availableStock(
  productStock: number | null,
  optionStock: number | null,
): number | null {
  /* An option's own count wins where it has one: three shirts left says nothing
     about how many of them are large. */
  if (optionStock !== null) return optionStock;
  return productStock;
}
