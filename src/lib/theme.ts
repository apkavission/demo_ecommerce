import { fontPair, isFontPairKey } from "@/lib/fonts";
import type { VariantPalette, VariantTheme } from "@/types/database";

/**
 * A variant's colours, turned into CSS the page can use.
 *
 * ---------------------------------------------------------------------------
 * **Both modes are stored, and neither is derived from the other.**
 *
 * This is the lesson from the estate's own applications, where light mode was
 * built by taking the dark palette and lightening it — and looked flat and
 * washed out for a fortnight before anybody could say why. The page background
 * and the card were two shades of white a printer could not tell apart, so
 * nothing had edges.
 *
 * So every palette here declares its own `bg` and `surface`, and the rule they
 * must satisfy is the same in both modes: **the page is a step away from the
 * things sitting on it.** In light, the page is grey and cards are white; in
 * dark, the page is near-black and cards are lifted above it. A palette that
 * breaks that rule produces the flat look, whichever mode it is in.
 *
 * ---------------------------------------------------------------------------
 * **A missing or malformed theme is a working page, not a crash.**
 *
 * `variants.theme` is `jsonb`, which Postgres does not check the shape of. A
 * half-edited palette must not take a demo down in front of a prospect — that
 * is the single worst moment for this application to fail. Anything missing
 * falls back to a neutral pair that is deliberately plain: it looks unfinished,
 * which is a truthful signal that somebody has not finished it.
 */

const FALLBACK_LIGHT: VariantPalette = {
  accent: "#0f766e",
  accentFg: "#ffffff",
  accentSoft: "#e6f2f1",
  bg: "#f4f6f8",
  surface: "#ffffff",
  text: "#0b1220",
  muted: "#4b5563",
};

const FALLBACK_DARK: VariantPalette = {
  accent: "#2dd4bf",
  accentFg: "#04201f",
  accentSoft: "#0e2a29",
  bg: "#07090c",
  surface: "#11151b",
  text: "#e8edf4",
  muted: "#9aa7b8",
};

const RADIUS = { sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.25rem" } as const;

function palette(value: unknown, fallback: VariantPalette): VariantPalette {
  if (!value || typeof value !== "object") return fallback;

  const given = value as Partial<VariantPalette>;
  const colour = (key: keyof VariantPalette) =>
    typeof given[key] === "string" && /^#[0-9a-fA-F]{3,8}$/.test(given[key] as string)
      ? (given[key] as string)
      : fallback[key];

  return {
    accent: colour("accent"),
    accentFg: colour("accentFg"),
    accentSoft: colour("accentSoft"),
    bg: colour("bg"),
    surface: colour("surface"),
    text: colour("text"),
    muted: colour("muted"),
  };
}

/** Read whatever is in the column, and always return something usable. */
export function readTheme(value: unknown): VariantTheme {
  const given = (value ?? {}) as Partial<VariantTheme>;

  return {
    light: palette(given.light, FALLBACK_LIGHT),
    dark: palette(given.dark, FALLBACK_DARK),
    /*
      One key, not two family names.

      These two columns held a family name for a fortnight and reached nothing:
      `next/font` builds a face from a literal call at compile time, so a name
      arriving from a database row at request time cannot be fetched. The row
      now stores a key into `lib/fonts.ts`, which is a pairing the build has
      actually made — and an unknown key falls back to the default pair rather
      than to a face that does not exist.

      `headingFont` carries the key and `bodyFont` is kept in step with it, so
      an older row that still holds a family name is read as the default
      instead of being read as a font.
    */
    headingFont: isFontPairKey(given.headingFont) ? given.headingFont : undefined,
    bodyFont: isFontPairKey(given.bodyFont) ? given.bodyFont : undefined,
    radius: given.radius && given.radius in RADIUS ? given.radius : "lg",
  };
}

/**
 * The theme as a stylesheet, for the page to carry.
 *
 * Written as a `<style>` block scoped to `:root` and `[data-theme]` rather than
 * as inline styles on a wrapper, for one reason that matters: **portals**. A
 * dialog or a toast rendered at the end of `<body>` sits outside any wrapper,
 * and inline variables would not reach it — the menu would open in the previous
 * variant's colours.
 *
 * The dark block is written twice on purpose: once under `prefers-color-scheme`
 * for somebody who has never touched the toggle, and once under
 * `[data-theme="dark"]` so an explicit choice beats the system in both
 * directions. A single media query cannot express "the user asked for dark on a
 * light machine".
 */
export function themeCss(theme: VariantTheme): string {
  const vars = (p: VariantPalette) =>
    [
      `--accent:${p.accent}`,
      `--accent-fg:${p.accentFg}`,
      `--accent-soft:${p.accentSoft}`,
      `--bg:${p.bg}`,
      `--surface:${p.surface}`,
      `--text:${p.text}`,
      `--muted:${p.muted}`,
    ].join(";");

  const radius = RADIUS[theme.radius ?? "lg"];

  /*
    The typefaces, pointed at rather than named.

    The root layout has already declared every family and given each one its own
    variable. All this has to do is say which two of them this business is set
    in — which is why a font change is a repaint and not a download.
  */
  const pair = fontPair(theme.headingFont);
  const type = `--font-heading:var(${pair.headingVar});--font-body:var(${pair.bodyVar})`;

  return [
    `:root{${vars(theme.light)};--radius:${radius};${type};color-scheme:light}`,
    `:root[data-theme="dark"]{${vars(theme.dark)};color-scheme:dark}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${vars(theme.dark)};color-scheme:dark}}`,
  ].join("");
}
