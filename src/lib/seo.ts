/**
 * What a search engine is told about a shop, in its own language.
 *
 * ---------------------------------------------------------------------------
 * **Every field is derived from something, and nothing is invented.** That is
 * the whole discipline of this file, because structured data is the one place
 * where a guess is not a cosmetic error — it is a claim made to a search
 * engine, in machine-readable form, by the business.
 *
 * So there are two things this deliberately does **not** emit:
 *
 *   **No `aggregateRating`.** This shop carries reviews that are labelled, on
 *   the page, as examples written for a demonstration. Turning three invented
 *   quotes into "4.7 from 3 reviews" would put a fabricated trust signal into a
 *   search result. It is also the single most common piece of structured-data
 *   fraud, and Google has manual penalties for it.
 *
 *   **No `openingHoursSpecification`.** The hours are free text, written by
 *   whoever filled the panel in — "Mon–Sat, 10am–7pm", "Closed". Parsing that
 *   into machine times means guessing, and a wrong closing time sends somebody
 *   to a locked door.
 *
 * ---------------------------------------------------------------------------
 * **What a shop has that a clinic does not is stock.** The other demos in this
 * estate describe what they *offer*; a shop describes what it *has*, one
 * `Product` at a time, each with a price in the shop's own currency and an
 * `availability` read off the stock column rather than assumed. That is the
 * field a search result actually uses — "In stock" under a price is the
 * difference between a click and a scroll — and it is the one field a shop
 * must never claim wrongly.
 *
 * ---------------------------------------------------------------------------
 * **It stays `noindex` regardless**, and that is not a contradiction. A demo
 * that outranked the business it was built for would take months to undo. What
 * this is for is the day one of these becomes a real shop: the same panel, the
 * same fields, the same block — with the one line in `layout.tsx` removed.
 */
import type { FaqRow, PersonRow, ProductRow } from "@/types/database";
import type { Variant } from "@/lib/variants";
import { formatMoney } from "@/lib/money";

/**
 * What kind of thing this demo is, in schema.org's vocabulary.
 *
 * `Store` rather than `OnlineStore`, which is newer than most consumers of this
 * data, and rather than `ClothingStore`, which is false for the grocery and
 * electronics businesses this same demo also holds. Each demo in the estate
 * sets its own, and the rule is the same one: the type has to be true of every
 * business inside that demo, not only the first.
 */
const BUSINESS_TYPE = "Store";

/**
 * The cheapest and dearest thing on the shelf, as a range.
 *
 * Read off the prices rather than typed, so it cannot disagree with the page.
 * Absent when the shelf is empty — a `priceRange` of "₹0" is worse than none.
 */
export function priceRange(products: ProductRow[], symbol: string): string | null {
  const live = products.filter((product) => product.status === "published");
  if (live.length === 0) return null;

  const prices = live.map((product) => product.price_paise);
  const least = Math.min(...prices);
  const most = Math.max(...prices);

  return least === most
    ? formatMoney(least, symbol)
    : `${formatMoney(least, symbol)} – ${formatMoney(most, symbol)}`;
}

/**
 * Whether a thing can be bought right now, in schema.org's words.
 *
 * `null` stock means the shop does not count this one, which is not the same as
 * having none — so it is `InStock` rather than `OutOfStock`. Saying "out of
 * stock" about something a shop simply does not count is how a listing loses
 * the sale it would have made.
 */
function availability(stock: number | null): string {
  if (stock === null) return "https://schema.org/InStock";
  return stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

/**
 * The shop, and everything on its shelf.
 *
 * One `Store` with a `Product` per published row. The products are the point:
 * a search engine that knows the name, the price and whether it is in stock can
 * show the thing itself rather than the shop's home page.
 */
export function businessJsonLd(
  variant: Variant,
  products: ProductRow[],
  siteUrl: string,
): Record<string, unknown> {
  const url = `${siteUrl}/${variant.slug}`;
  const { phone, email, address } = variant.contact;
  const symbol = variant.currencySymbol;
  const range = priceRange(products, symbol);

  const items = products
    .filter((product) => product.status === "published")
    .map((product) => ({
      "@type": "Product",
      name: product.name,
      ...(product.summary ? { description: product.summary } : {}),
      ...(product.sku ? { sku: product.sku } : {}),
      url: `${url}/shop/${product.slug}`,
      offers: {
        "@type": "Offer",
        /* In the major unit, as a string, which is what schema.org asks for —
           and derived from the same paise the till charges. */
        price: (product.price_paise / 100).toFixed(2),
        priceCurrency: "INR",
        availability: availability(product.stock),
        url: `${url}/shop/${product.slug}`,
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": BUSINESS_TYPE,
    "@id": url,
    name: variant.businessName,
    url,
    ...(variant.tagline ? { slogan: variant.tagline } : {}),
    ...(variant.description ? { description: variant.description } : {}),
    ...(variant.logo.light ? { logo: variant.logo.light } : {}),
    ...(variant.hero.image ? { image: variant.hero.image } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    /* Text rather than a `PostalAddress` split into parts: the panel holds one
       free-text address, and inventing a postcode field out of it is the kind
       of guess this file exists to avoid. */
    ...(address ? { address } : {}),
    ...(range ? { priceRange: range } : {}),
    ...(items.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "In stock",
            itemListElement: items,
          },
        }
      : {}),
  };
}

/**
 * The questions, as a `FAQPage`.
 *
 * Verbatim, both sides. This is the one block on the page that is quoted back
 * into a search result almost word for word, so anything editorialised here
 * would be a different answer from the one on the page.
 */
export function faqJsonLd(faqs: FaqRow[]): Record<string, unknown> | null {
  const live = faqs.filter((faq) => faq.status === "published");
  if (live.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: live.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * The people, as an `ItemList` of `Person`.
 *
 * Tied back to the shop with `worksFor`, so the list is about this business
 * rather than five loose names.
 */
export function peopleJsonLd(
  people: PersonRow[],
  businessId: string,
): Record<string, unknown> | null {
  const live = people.filter((person) => person.status === "published");
  if (live.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: live.map((person, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Person",
        name: person.full_name,
        ...(person.role_label ? { jobTitle: person.role_label } : {}),
        worksFor: { "@id": businessId },
      },
    })),
  };
}

/**
 * The blocks, as one script's worth of JSON.
 *
 * Nulls are dropped rather than emitted as empty objects, and the output is
 * escaped for `</script>` — a product description with a closing tag in it
 * would otherwise end the script element early and put markup on the page.
 */
export function structuredData(blocks: (Record<string, unknown> | null)[]): string {
  const kept = blocks.filter((block): block is Record<string, unknown> => block !== null);
  return JSON.stringify(kept.length === 1 ? kept[0] : kept).replace(/</g, "\\u003c");
}
