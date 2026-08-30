import { describe, expect, it } from "vitest";
import {
  availableStock,
  awayFromFreeShipping,
  discountPercent,
  formatMoney,
  parseMoney,
  shippingFor,
} from "./money";

/**
 * Money is the one thing in this demo that has a right answer.
 *
 * Everything else here is invented content where wrong looks like a typo. A
 * total that is off by a rupee is the bug a prospect notices, cannot un-notice,
 * and reasonably concludes says something about everything else in the build.
 */

describe("formatMoney", () => {
  it("shows whole rupees without a decimal tail", () => {
    // ₹1,299.00 on a shop front reads as a form field, not a price.
    expect(formatMoney(129900)).toBe("₹1,299");
  });

  it("shows paise when there are any, so the total matches the lines", () => {
    expect(formatMoney(129950)).toBe("₹1,299.50");
  });

  it("groups the Indian way, not the western way", () => {
    // 12,34,567 rather than 1,234,567. Pinned because it comes from the locale,
    // and a locale read off the machine differs between server and browser.
    expect(formatMoney(12345678900)).toBe("₹12,34,56,789");
  });

  it("takes the shop's own symbol", () => {
    expect(formatMoney(5000, "$")).toBe("$50");
  });

  it("treats nothing as zero rather than as NaN", () => {
    expect(formatMoney(null)).toBe("₹0");
    expect(formatMoney(undefined)).toBe("₹0");
    expect(formatMoney(Number.NaN)).toBe("₹0");
  });
});

describe("parseMoney", () => {
  it("reads what somebody actually types", () => {
    expect(parseMoney("1299")).toBe(129900);
    expect(parseMoney("1,299")).toBe(129900);
    expect(parseMoney("₹1299")).toBe(129900);
    expect(parseMoney(" 1299.50 ")).toBe(129950);
  });

  it("returns null rather than NaN for anything else", () => {
    // A null has to be handled; a NaN spreads quietly through arithmetic and
    // ends up in a column.
    expect(parseMoney("free")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("12.345")).toBeNull();
    expect(parseMoney("-50")).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });

  it("survives the multiplication that floating point gets wrong", () => {
    // 10.99 * 100 is 1098.9999999999999 in IEEE 754. Truncating gives 1098 and
    // the shop is a paisa cheaper on every order of that price -- always in the
    // same direction, which is how it stays invisible. `Math.round` is in that
    // function for this line and no other reason.
    expect(parseMoney("10.99")).toBe(1099);
    expect(parseMoney("1.15")).toBe(115);
    expect(parseMoney("8.29")).toBe(829);
  });

  it("survives the round trip", () => {
    for (const paise of [0, 1, 99, 100, 129900, 12345678900]) {
      expect(parseMoney(formatMoney(paise).replace("₹", ""))).toBe(paise);
    }
  });
});

describe("discountPercent", () => {
  it("works out what the badge says", () => {
    expect(discountPercent(249900, 299900)).toBe(17);
  });

  it("says nothing rather than zero when there is nothing to claim", () => {
    // Returning 0 would render a badge saying "0% off".
    expect(discountPercent(249900, null)).toBeNull();
    expect(discountPercent(249900, undefined)).toBeNull();
    expect(discountPercent(249900, 249900)).toBeNull();
    expect(discountPercent(249900, 199900)).toBeNull();
  });
});

describe("shippingFor", () => {
  it("charges for a basket below the threshold", () => {
    expect(shippingFor(50000, 4900, 99900)).toBe(4900);
  });

  it("stops charging at the threshold, not above it", () => {
    // Exactly the threshold is free. "Spend ₹999 for free delivery" and then
    // charging at ₹999 is the sort of thing people write reviews about.
    expect(shippingFor(99900, 4900, 99900)).toBe(0);
  });

  it("charges every basket where the shop set no threshold", () => {
    expect(shippingFor(9999900, 4900, null)).toBe(4900);
  });

  it("charges nothing on an empty basket", () => {
    expect(shippingFor(0, 4900, 99900)).toBe(0);
  });
});

describe("awayFromFreeShipping", () => {
  it("says how much more", () => {
    expect(awayFromFreeShipping(50000, 99900)).toBe(49900);
  });

  it("says nothing once it is already free", () => {
    expect(awayFromFreeShipping(99900, 99900)).toBeNull();
    expect(awayFromFreeShipping(120000, 99900)).toBeNull();
  });

  it("says nothing where the shop offers no free delivery", () => {
    expect(awayFromFreeShipping(50000, null)).toBeNull();
  });
});

describe("availableStock", () => {
  it("lets the chosen option decide", () => {
    // Three shirts left says nothing about how many of them are large.
    expect(availableStock(3, 0)).toBe(0);
    expect(availableStock(3, 9)).toBe(9);
  });

  it("falls back to the product where the option does not count", () => {
    expect(availableStock(3, null)).toBe(3);
  });

  it("keeps uncounted as uncounted", () => {
    // Null is "we do not count this"; zero is "counted, none left". Collapsing
    // them would take every made-to-order product off sale.
    expect(availableStock(null, null)).toBeNull();
  });
});
