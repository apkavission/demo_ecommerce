import { describe, expect, it } from "vitest";
import { businessJsonLd, faqJsonLd, peopleJsonLd, priceRange, structuredData } from "@/lib/seo";
import type { FaqRow, PersonRow, ProductRow } from "@/types/database";
import type { Variant } from "@/lib/variants";

/**
 * What the shop tells a search engine, and the two things it refuses to.
 *
 * The refusals are the reason this file exists. Structured data is a claim made
 * in machine-readable form, so a rating nobody gave and an opening time nobody
 * wrote are not cosmetic errors — they are false statements that a search
 * result repeats. Both are asserted here rather than left to a comment, because
 * a comment does not fail a build.
 */

const shop = {
  slug: "fashion",
  businessName: "Kora Label",
  tagline: "Everyday clothes, made to last a decade",
  description: "Twelve pieces, cut from mill-finished cotton.",
  currencySymbol: "₹",
  logo: { light: "https://example.test/logo.png", dark: null },
  hero: { image: null, imageAlt: "", video: null },
  contact: {
    phone: "+91 98765 40001",
    email: "hello@koralabel.example",
    address: "14 Cotton Street, Tiruppur",
    hours: { weekdays: "10am – 7pm", saturday: "10am – 7pm", sunday: "Closed" },
  },
} as unknown as Variant;

const product = (over: Partial<ProductRow>) =>
  ({
    status: "published",
    slug: "merino-crew",
    name: "Merino crew",
    summary: null,
    sku: null,
    stock: null,
    price_paise: 449900,
    compare_at_paise: null,
    ...over,
  }) as ProductRow;

const SITE = "https://koralabel.example";

describe("priceRange", () => {
  it("is read off the shelf rather than typed", () => {
    const range = priceRange(
      [
        product({ price_paise: 289900 }),
        product({ price_paise: 449900 }),
        product({ price_paise: 99900 }),
      ],
      "₹",
    );

    expect(range).toBe("₹999 – ₹4,499");
  });

  it("collapses to one number when everything costs the same", () => {
    expect(priceRange([product({}), product({})], "₹")).toBe("₹4,499");
  });

  it("is absent when the shelf is empty", () => {
    expect(priceRange([], "₹")).toBeNull();
  });

  it("ignores what has not been published", () => {
    expect(priceRange([product({ status: "draft", price_paise: 100 })], "₹")).toBeNull();
  });
});

describe("businessJsonLd", () => {
  const json = businessJsonLd(
    shop,
    [
      product({ slug: "merino-crew", name: "Merino crew", stock: 3, sku: "KL-MC-01" }),
      product({ slug: "linen-shirt", name: "Linen shirt", price_paise: 289900, stock: 0 }),
      product({ slug: "draft", name: "Not published", status: "draft" }),
    ],
    SITE,
  );

  it("says what kind of thing this is, and identifies it by its own URL", () => {
    expect(json["@type"]).toBe("Store");
    expect(json["@id"]).toBe(`${SITE}/fashion`);
  });

  it("carries the shop's own contact details rather than invented ones", () => {
    expect(json.telephone).toBe("+91 98765 40001");
    expect(json.email).toBe("hello@koralabel.example");
    expect(json.address).toBe("14 Cotton Street, Tiruppur");
  });

  it("lists every published product and nothing else", () => {
    const catalogue = json.hasOfferCatalog as { itemListElement: Record<string, unknown>[] };
    expect(catalogue.itemListElement).toHaveLength(2);
    expect(catalogue.itemListElement.map((item) => item.name)).toEqual([
      "Merino crew",
      "Linen shirt",
    ]);
  });

  it("prices in the major unit, from the paise the till charges", () => {
    const catalogue = json.hasOfferCatalog as {
      itemListElement: { offers: { price: string; priceCurrency: string } }[];
    };

    expect(catalogue.itemListElement[0].offers.price).toBe("4499.00");
    expect(catalogue.itemListElement[0].offers.priceCurrency).toBe("INR");
  });

  it("reads availability off the stock rather than assuming it", () => {
    const catalogue = json.hasOfferCatalog as {
      itemListElement: { offers: { availability: string } }[];
    };

    expect(catalogue.itemListElement[0].offers.availability).toBe("https://schema.org/InStock");
    expect(catalogue.itemListElement[1].offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("treats stock nobody counts as available, not as sold out", () => {
    const json = businessJsonLd(shop, [product({ stock: null })], SITE);
    const catalogue = json.hasOfferCatalog as {
      itemListElement: { offers: { availability: string } }[];
    };

    expect(catalogue.itemListElement[0].offers.availability).toBe("https://schema.org/InStock");
  });

  /* The two refusals. */

  it("never emits a rating, because the reviews are labelled as examples", () => {
    expect(json.aggregateRating).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("aggregateRating");
  });

  it("never emits opening hours parsed out of free text", () => {
    expect(json.openingHoursSpecification).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("openingHours");
  });
});

describe("faqJsonLd", () => {
  const faq = (over: Partial<FaqRow>) =>
    ({ status: "published", question: "Can I return it?", answer: "Yes.", ...over }) as FaqRow;

  it("quotes both sides verbatim", () => {
    const json = faqJsonLd([faq({})]) as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };

    expect(json.mainEntity[0].name).toBe("Can I return it?");
    expect(json.mainEntity[0].acceptedAnswer.text).toBe("Yes.");
  });

  it("is absent when nothing is published", () => {
    expect(faqJsonLd([faq({ status: "draft" })])).toBeNull();
  });
});

describe("peopleJsonLd", () => {
  const person = (over: Partial<PersonRow>) =>
    ({ status: "published", full_name: "Anita Rao", role_label: "Founder", ...over }) as PersonRow;

  it("ties each person back to the shop", () => {
    const json = peopleJsonLd([person({})], `${SITE}/fashion`) as {
      itemListElement: { item: { worksFor: { "@id": string } } }[];
    };

    expect(json.itemListElement[0].item.worksFor["@id"]).toBe(`${SITE}/fashion`);
  });

  it("is absent when nobody is published", () => {
    expect(peopleJsonLd([person({ status: "draft" })], SITE)).toBeNull();
  });
});

describe("structuredData", () => {
  it("drops the blocks that have nothing to say", () => {
    expect(structuredData([{ a: 1 }, null])).toBe('{"a":1}');
  });

  it("escapes a closing tag, so a description cannot end the script early", () => {
    expect(structuredData([{ a: "</script>" }])).not.toContain("</script>");
  });
});
