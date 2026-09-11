/**
 * Whether two colours can be read against each other.
 *
 * ---------------------------------------------------------------------------
 * **Why the panel needs this and not just a colour picker.**
 *
 * A palette is fourteen values, and the way one goes wrong is never "an ugly
 * colour" — it is a pair. Mid-grey muted text on a light-grey page, or white
 * button text on a yellow accent, looks deliberate in a picker and is
 * unreadable on a phone in daylight. STATUS.md records the estate's own
 * applications shipping exactly that for a fortnight before anybody could say
 * what was wrong.
 *
 * So the editor says the number out loud while the colour is being chosen.
 * Nothing is refused — a demo built for a client who insists on their own
 * brand grey must still be buildable — but it cannot be chosen *unknowingly*.
 *
 * ---------------------------------------------------------------------------
 * **WCAG 2.1 relative luminance**, which is the ratio browsers, auditors and
 * every accessibility tool agree on. 4.5 for body text, 3 for large text and
 * for the edge of a control.
 */

/** `#abc`, `#aabbcc` and `#aabbccdd` to three channels. Alpha is ignored. */
function channels(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");

  const expand =
    value.length === 3 || value.length === 4
      ? value
          .slice(0, 3)
          .split("")
          .map((c) => c + c)
          .join("")
      : value.length === 6 || value.length === 8
        ? value.slice(0, 6)
        : null;

  if (!expand || !/^[0-9a-fA-F]{6}$/.test(expand)) return null;

  return [
    parseInt(expand.slice(0, 2), 16),
    parseInt(expand.slice(2, 4), 16),
    parseInt(expand.slice(4, 6), 16),
  ];
}

/**
 * Relative luminance, as WCAG defines it.
 *
 * The 0.03928 branch is not decoration: sRGB is not a plain power curve near
 * black, and dropping the linear part overstates the contrast of dark colours —
 * which is the half of the palette these demos most often get wrong.
 */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * The contrast ratio between two colours, from 1 to 21.
 *
 * Returns `null` when either colour cannot be read, rather than a number that
 * looks like a measurement. A half-typed `#ab` in a text field is not a
 * contrast failure and must not be reported as one.
 */
export function contrastRatio(a: string, b: string): number | null {
  const first = channels(a);
  const second = channels(b);
  if (!first || !second) return null;

  const one = luminance(first);
  const two = luminance(second);

  const lighter = Math.max(one, two);
  const darker = Math.min(one, two);

  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastVerdict = "pass" | "large-only" | "fail" | "unknown";

/**
 * What that ratio means for a piece of text.
 *
 * `large` is 24px, or 19px bold — a heading. Everything else is body text and
 * answers to 4.5.
 */
export function contrastVerdict(
  a: string,
  b: string,
  { large = false }: { large?: boolean } = {},
): { ratio: number | null; verdict: ContrastVerdict } {
  const ratio = contrastRatio(a, b);
  if (ratio === null) return { ratio: null, verdict: "unknown" };

  const needed = large ? 3 : 4.5;

  return {
    ratio,
    verdict: ratio >= needed ? "pass" : ratio >= 3 ? "large-only" : "fail",
  };
}

/** The ratio as the panel prints it: one decimal, and a colon. */
export function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toFixed(1)}:1`;
}
