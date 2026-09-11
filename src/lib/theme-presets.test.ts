import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { FONT_PAIRS } from "@/lib/fonts";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { readTheme } from "@/lib/theme";

/**
 * The presets, measured rather than admired.
 *
 * A theme offered as a ready-made choice is a promise that it works. Eight
 * themes in two modes is 112 colour values and sixteen palettes, and checking
 * them by looking at them is how one of them ends up with grey text on a grey
 * page for the client who happened to pick it. Every rule the palette comment
 * in `globals.css` states out loud is asserted here.
 */
describe("the ready-made themes", () => {
  const modes = ["light", "dark"] as const;

  it("are all offered under a different key", () => {
    const keys = THEME_PRESETS.map((preset) => preset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("name a typeface pairing this build has actually made", () => {
    /* A preset naming a pairing that does not exist would silently apply the
       default one, which is the bug `lib/fonts.ts` exists to end. */
    const known = new Set(FONT_PAIRS.map((pair) => pair.key));
    for (const preset of THEME_PRESETS) {
      expect(known, preset.label).toContain(preset.fontPair);
    }
  });

  it("survive the reader that the page actually uses", () => {
    /* `readTheme()` replaces anything malformed with the fallback pair. A
       preset that comes back changed has a value in it the page would not
       render — a colour in the wrong notation, or a radius that is not one of
       the four. */
    for (const preset of THEME_PRESETS) {
      const read = readTheme({
        light: preset.light,
        dark: preset.dark,
        headingFont: preset.fontPair,
        bodyFont: preset.fontPair,
        radius: preset.radius,
      });

      expect(read.light, preset.label).toEqual(preset.light);
      expect(read.dark, preset.label).toEqual(preset.dark);
      expect(read.radius, preset.label).toBe(preset.radius);
      expect(read.headingFont, preset.label).toBe(preset.fontPair);
    }
  });

  describe.each(THEME_PRESETS)("$label", (preset) => {
    it.each(modes)("reads on the page in %s", (mode) => {
      const p = preset[mode];
      expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(modes)("keeps the quiet text readable in %s", (mode) => {
      const p = preset[mode];
      /*
        Muted text is body text — a card's supporting line, a form's hint —
        so it answers to 4.5 like any other, on the page and on a card. This
        is the value most often set by eye and it is the one that fails.
      */
      expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(modes)("has a button whose label can be read in %s", (mode) => {
      const p = preset[mode];
      expect(contrastRatio(p.accentFg, p.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(modes)("keeps the accent visible on its own soft tint in %s", (mode) => {
      const p = preset[mode];
      /*
        Three is the threshold, not 4.5: the accent on its tint is a chip, a
        badge or a large number, never a paragraph. Below three the tinted
        block reads as one flat shape.
      */
      expect(contrastRatio(p.accent, p.accentSoft)).toBeGreaterThanOrEqual(3);
    });

    it.each(modes)("puts the page a step away from the card in %s", (mode) => {
      const p = preset[mode];
      /*
        The estate's own applications were built the other way round for a
        fortnight — a page at #fcfcfd under cards at #ffffff — and looked flat
        in light mode while looking fine in dark. Two shades a printer cannot
        tell apart give a card no edges.

        A small ratio, because this is a step and not a contrast: 1.04 is
        about the least difference that still reads as an edge.
      */
      expect(contrastRatio(p.bg, p.surface)).toBeGreaterThanOrEqual(1.04);
    });

    it("is light where it says light and dark where it says dark", () => {
      /* A preset with the two modes swapped passes every check above and is
         still completely wrong. Compared against white rather than by
         eyeballing the hex. */
      const lightPage = contrastRatio(preset.light.bg, "#ffffff") as number;
      const darkPage = contrastRatio(preset.dark.bg, "#ffffff") as number;

      expect(lightPage).toBeLessThan(1.4);
      expect(darkPage).toBeGreaterThan(10);
    });
  });
});
