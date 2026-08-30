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
    headingFont: typeof given.headingFont === "string" ? given.headingFont : undefined,
    bodyFont: typeof given.bodyFont === "string" ? given.bodyFont : undefined,
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

  return [
    `:root{${vars(theme.light)};--radius:${radius};color-scheme:light}`,
    `:root[data-theme="dark"]{${vars(theme.dark)};color-scheme:dark}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${vars(theme.dark)};color-scheme:dark}}`,
  ].join("");
}
