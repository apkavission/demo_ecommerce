/**
 * The typefaces a business may be set in.
 *
 * ---------------------------------------------------------------------------
 * **Why a list and not a text field.** `variants.theme.headingFont` and
 * `bodyFont` have been in the schema since it was written, they are validated
 * by `readTheme()`, they have a unit test — and until this file existed they
 * reached nothing at all. `layout.tsx` named Inter and Sora in code and
 * `themeCss()` emitted no font variable, so a row could say `Fraunces`, save
 * cleanly, and render in Sora. A value that can be set and changes nothing is
 * worse than one that cannot be set.
 *
 * The reason it could not simply be turned on is `next/font`: it self-hosts
 * each family at build time from a literal call, so a family named in a
 * database row at request time cannot be fetched. Nothing can look up a font
 * that was never built.
 *
 * So the families are declared here, built in the root layout, and the row
 * stores a **key** into this list. That makes the two columns mean something
 * without letting them promise something the build cannot deliver.
 *
 * ---------------------------------------------------------------------------
 * **No `server-only`, on purpose.** The panel's picker needs the same list the
 * page renders from, and a second copy of it in the client is how a demo ends
 * up offering a pairing that does not exist.
 */

export interface FontPair {
  /** What the row stores. */
  key: string;
  /** What the panel calls it. */
  label: string;
  /** Why somebody would choose it. */
  note: string;
  /** The CSS variable the root layout defines for the heading family. */
  headingVar: string;
  /** The CSS variable the root layout defines for the body family. */
  bodyVar: string;
}

/**
 * Six pairings, each one a decision rather than a font.
 *
 * A heading and a body face that were not chosen together is the commonest way
 * a site with good colours still looks assembled — so these are pairs, and a
 * business picks a pair rather than two faces.
 */
export const FONT_PAIRS: readonly FontPair[] = [
  {
    key: "sora-inter",
    label: "Sora & Inter",
    note: "Modern and neutral. The safe one — it suits any industry.",
    headingVar: "--font-sora",
    bodyVar: "--font-inter",
  },
  {
    key: "fraunces-inter",
    label: "Fraunces & Inter",
    note: "Warm and editorial. Food, hospitality, anything that should feel handmade.",
    headingVar: "--font-fraunces",
    bodyVar: "--font-inter",
  },
  {
    key: "playfair-lato",
    label: "Playfair & Lato",
    note: "Classic and established. A school, a chamber, a practice with a history.",
    headingVar: "--font-playfair",
    bodyVar: "--font-lato",
  },
  {
    key: "grotesk-inter",
    label: "Space Grotesk & Inter",
    note: "Technical. Software, dashboards, anything sold to a business.",
    headingVar: "--font-grotesk",
    bodyVar: "--font-inter",
  },
  {
    key: "dm-serif-dm-sans",
    label: "DM Serif & DM Sans",
    note: "Elegant and expensive. Property, jewellery, interiors.",
    headingVar: "--font-dm-serif",
    bodyVar: "--font-dm-sans",
  },
  {
    key: "manrope",
    label: "Manrope",
    note: "One face throughout. Retail and commerce, where the price is the headline.",
    headingVar: "--font-manrope",
    bodyVar: "--font-manrope",
  },
] as const;

/** The pair used when the row says nothing, or says something unknown. */
export const DEFAULT_FONT_PAIR = FONT_PAIRS[0];

/**
 * The pair a stored key names, or the default.
 *
 * A hand-edited row naming a family that was never built gets a plain site
 * rather than a broken one — the same rule `readTheme()` follows for colours.
 */
export function fontPair(key: string | null | undefined): FontPair {
  if (!key) return DEFAULT_FONT_PAIR;
  return FONT_PAIRS.find((pair) => pair.key === key) ?? DEFAULT_FONT_PAIR;
}

/** Whether a key is one this build can actually render. */
export function isFontPairKey(key: unknown): key is string {
  return typeof key === "string" && FONT_PAIRS.some((pair) => pair.key === key);
}
