import { describe, expect, it } from "vitest";
import { readTheme, themeCss } from "./theme";

/**
 * `variants.theme` is `jsonb`. Postgres does not check its shape, so anything
 * can arrive - and the moment it arrives malformed is the moment somebody is
 * mid-edit with a prospect watching. These pin the two promises that file
 * makes: it never throws, and the page always has depth.
 */
describe("readTheme", () => {
  it("gives a whole theme when given nothing at all", () => {
    const theme = readTheme(undefined);

    expect(theme.light.accent).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(theme.dark.accent).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(theme.radius).toBe("lg");
  });

  it("survives null, a string and a number where an object was expected", () => {
    for (const bad of [null, "teal", 7, [], true]) {
      expect(() => readTheme(bad)).not.toThrow();
      expect(readTheme(bad).light.bg).toBeTruthy();
    }
  });

  it("keeps the page a step away from the things sitting on it", () => {
    const theme = readTheme(null);

    // The flat-light bug: page and card two shades of white, so nothing has
    // edges. Both modes must differ.
    expect(theme.light.bg).not.toBe(theme.light.surface);
    expect(theme.dark.bg).not.toBe(theme.dark.surface);
  });

  it("does not derive one mode from the other", () => {
    const theme = readTheme(null);

    expect(theme.light.bg).not.toBe(theme.dark.bg);
    expect(theme.light.text).not.toBe(theme.dark.text);
  });

  it("takes the colours it is given", () => {
    const theme = readTheme({ light: { accent: "#123456" }, dark: { accent: "#abcdef" } });

    expect(theme.light.accent).toBe("#123456");
    expect(theme.dark.accent).toBe("#abcdef");
  });

  it("refuses anything that is not a hex colour, one key at a time", () => {
    const fallback = readTheme(null);
    const theme = readTheme({ light: { accent: "rebeccapurple", surface: "#ffffff" } });

    expect(theme.light.accent).toBe(fallback.light.accent);
    expect(theme.light.surface).toBe("#ffffff");
  });

  it("accepts a known radius and ignores an invented one", () => {
    expect(readTheme({ radius: "sm" }).radius).toBe("sm");
    expect(readTheme({ radius: "enormous" }).radius).toBe("lg");
  });

  it("carries fonts through only when they are strings", () => {
    expect(readTheme({ headingFont: "Fraunces" }).headingFont).toBe("Fraunces");
    expect(readTheme({ headingFont: 12 }).headingFont).toBeUndefined();
  });
});

describe("themeCss", () => {
  const theme = readTheme({
    light: { accent: "#111111", bg: "#eeeeee" },
    dark: { accent: "#222222", bg: "#000011" },
  });
  const css = themeCss(theme);

  it("writes the dark palette twice, once for each way of asking for it", () => {
    // A media query alone cannot express "dark, on a light machine".
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("@media (prefers-color-scheme:dark)");
    expect(css).toContain(':root:not([data-theme="light"])');
  });

  it("puts the light palette on bare :root so an explicit choice can beat it", () => {
    expect(css).toContain("--accent:#111111");
    expect(css).toContain("--accent:#222222");
    expect(css.indexOf("--accent:#111111")).toBeLessThan(css.indexOf("--accent:#222222"));
  });

  it("declares color-scheme in both modes, so form controls follow", () => {
    expect(css).toContain("color-scheme:light");
    expect(css).toContain("color-scheme:dark");
  });

  it("scopes to :root rather than a wrapper, so portals inherit", () => {
    // A dialog rendered at the end of <body> sits outside any wrapper and would
    // otherwise open in the previous variant's colours.
    expect(css.startsWith(":root{")).toBe(true);
  });

  it("resolves the radius to a length", () => {
    expect(themeCss(readTheme({ radius: "sm" }))).toContain("--radius:0.375rem");
  });
});
