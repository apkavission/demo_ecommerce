import type { VariantPalette } from "@/types/database";

/**
 * Whole themes, ready to apply.
 *
 * ---------------------------------------------------------------------------
 * **Fourteen colour pickers is not a theme control.** A palette is seven values
 * in each mode, and they are not independent: the page has to sit a step away
 * from the card, the accent's foreground has to be readable on the accent, and
 * the muted text has to survive both. Somebody changing one value at a time
 * gets a site that looks worse at every step and only comes right at the end,
 * if it ever does.
 *
 * So the panel offers whole themes. One click writes all fourteen, plus the
 * typeface and the corner radius, and the pickers stay there for the business
 * that wants its own brand colour afterwards.
 *
 * ---------------------------------------------------------------------------
 * **Each pair satisfies the estate's one palette rule**: the page is a step
 * away from the things sitting on it. In light, the page is tinted and cards
 * are white; in dark, the page is near-black and the card is lifted above it.
 * A theme that breaks that looks flat in a way no shadow rescues, and that is
 * measured rather than asserted — `theme-presets.test.ts` checks the contrast
 * of every pair in this file, in both modes.
 */

export interface ThemePreset {
  key: string;
  label: string;
  /** What kind of business it is for, in one line. */
  note: string;
  light: VariantPalette;
  dark: VariantPalette;
  /** The pairing from `lib/fonts.ts` that suits it. */
  fontPair: string;
  radius: "sm" | "md" | "lg" | "xl";
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    key: "clinical-teal",
    label: "Clinical teal",
    note: "Calm and clean. Clinics, dentists, diagnostics, pathology.",
    light: {
      accent: "#0f766e",
      accentFg: "#ffffff",
      accentSoft: "#e6f2f1",
      bg: "#f4f6f8",
      surface: "#ffffff",
      text: "#0b1220",
      muted: "#475569",
    },
    dark: {
      accent: "#2dd4bf",
      accentFg: "#04201f",
      accentSoft: "#0e2a29",
      bg: "#07090c",
      surface: "#11151b",
      text: "#e8edf4",
      muted: "#9aa7b8",
    },
    fontPair: "sora-inter",
    radius: "lg",
  },
  {
    key: "deep-navy",
    label: "Deep navy",
    note: "Serious and established. Law, finance, consulting, schools.",
    light: {
      accent: "#1d4ed8",
      accentFg: "#ffffff",
      accentSoft: "#e6ecfd",
      bg: "#f3f5f9",
      surface: "#ffffff",
      text: "#0b1220",
      muted: "#4b5563",
    },
    dark: {
      accent: "#7aa2ff",
      accentFg: "#061024",
      accentSoft: "#14213d",
      bg: "#060911",
      surface: "#101728",
      text: "#e9eefb",
      muted: "#9db0cd",
    },
    fontPair: "playfair-lato",
    radius: "md",
  },
  {
    key: "warm-clay",
    label: "Warm clay",
    note: "Appetite and warmth. Restaurants, cafés, bakeries, interiors.",
    light: {
      accent: "#b3452b",
      accentFg: "#fff7f2",
      accentSoft: "#fbe8e0",
      bg: "#f8f3ee",
      surface: "#fffdfb",
      text: "#23150f",
      muted: "#6b5348",
    },
    dark: {
      accent: "#f08a63",
      accentFg: "#2b0f05",
      accentSoft: "#35180f",
      bg: "#100a07",
      surface: "#1c1310",
      text: "#f6ece5",
      muted: "#c3a698",
    },
    fontPair: "fraunces-inter",
    radius: "xl",
  },
  {
    key: "forest",
    label: "Forest",
    note: "Grounded and natural. Wellness, agriculture, landscaping, ayurveda.",
    light: {
      accent: "#1f6b3a",
      accentFg: "#ffffff",
      accentSoft: "#e3f1e7",
      bg: "#f2f6f2",
      surface: "#ffffff",
      text: "#0d1a12",
      muted: "#4a5b50",
    },
    dark: {
      accent: "#62c98a",
      accentFg: "#05200f",
      accentSoft: "#0f2a1a",
      bg: "#060a07",
      surface: "#101711",
      text: "#e8f2ea",
      muted: "#a2b6a8",
    },
    fontPair: "sora-inter",
    radius: "lg",
  },
  {
    key: "plum",
    label: "Plum",
    note: "Modern and a little premium. Salons, studios, software.",
    light: {
      accent: "#6d28d9",
      accentFg: "#ffffff",
      accentSoft: "#ede4fd",
      bg: "#f5f3f9",
      surface: "#ffffff",
      text: "#150f22",
      muted: "#574a6b",
    },
    dark: {
      accent: "#b491ff",
      accentFg: "#150726",
      accentSoft: "#241539",
      bg: "#08060d",
      surface: "#141020",
      text: "#efe9fb",
      muted: "#b0a3c9",
    },
    fontPair: "grotesk-inter",
    radius: "lg",
  },
  {
    key: "ink-amber",
    label: "Ink & amber",
    note: "Almost monochrome, one warm signal. Retail, workshops, garages.",
    light: {
      accent: "#b45309",
      accentFg: "#ffffff",
      accentSoft: "#fdf0dc",
      bg: "#f5f5f4",
      surface: "#ffffff",
      text: "#111110",
      muted: "#57534e",
    },
    dark: {
      accent: "#fbbf24",
      accentFg: "#241703",
      accentSoft: "#33240a",
      bg: "#0a0a09",
      surface: "#161614",
      text: "#f5f5f4",
      muted: "#b0aca4",
    },
    fontPair: "manrope",
    radius: "sm",
  },
  {
    key: "rose",
    label: "Rose",
    note: "Soft and personal. Paediatrics, maternity, beauty, boutiques.",
    light: {
      accent: "#b81f5e",
      accentFg: "#ffffff",
      accentSoft: "#fce4ee",
      bg: "#faf4f6",
      surface: "#ffffff",
      text: "#1c0d14",
      muted: "#6b4a57",
    },
    dark: {
      accent: "#f78bb0",
      accentFg: "#2d0716",
      accentSoft: "#3a0f21",
      bg: "#0c0709",
      surface: "#191013",
      text: "#f9eaf0",
      muted: "#cba6b5",
    },
    fontPair: "dm-serif-dm-sans",
    radius: "xl",
  },
  {
    key: "ocean",
    label: "Ocean",
    note: "Open and technical. Property, travel, logistics, dashboards.",
    light: {
      accent: "#0369a1",
      accentFg: "#ffffff",
      accentSoft: "#e0f0fa",
      bg: "#f1f5f8",
      surface: "#ffffff",
      text: "#08131c",
      muted: "#46586a",
    },
    dark: {
      accent: "#38bdf8",
      accentFg: "#041b28",
      accentSoft: "#0b2634",
      bg: "#05090d",
      surface: "#0f1720",
      text: "#e6f1fa",
      muted: "#97afc4",
    },
    fontPair: "grotesk-inter",
    radius: "md",
  },
] as const;

/** A preset by key, or nothing. The panel is the only caller. */
export function themePreset(key: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.key === key);
}
