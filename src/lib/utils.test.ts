import { describe, expect, it } from "vitest";
import { cn, formatDate, percent } from "./utils";

describe("formatDate", () => {
  it("is pinned to one locale and one zone, on both server and browser", () => {
    // Without both, the same date renders 29/08/2026 on one side and 8/29/2026
    // on the other - a hydration mismatch that only appears on somebody else's
    // machine.
    const rendered = formatDate("2026-08-29T06:00:00Z");

    expect(rendered).toContain("29");
    expect(rendered).toContain("Aug");
    expect(rendered).toContain("2026");
  });

  it("uses India time, not UTC", () => {
    // 19:30 UTC is half past one the next morning in Kolkata.
    expect(formatDate("2026-08-29T19:30:00Z")).toContain("30");
  });

  it("reads a Date and a string the same way", () => {
    const iso = "2026-01-05T10:00:00Z";

    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });

  it("gives an empty string rather than Invalid Date", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("percent", () => {
  it("clamps to a bar that can be drawn", () => {
    expect(percent(-40)).toBe(0);
    expect(percent(140)).toBe(100);
  });

  it("rounds to a whole number", () => {
    expect(percent(33.4)).toBe(33);
    expect(percent(66.6)).toBe(67);
  });

  it("treats nothing as nothing", () => {
    expect(percent(null)).toBe(0);
    expect(percent(undefined)).toBe(0);
    expect(percent(Number.NaN)).toBe(0);
  });
});

describe("cn", () => {
  it("lets the caller override what the component set", () => {
    expect(cn("p-2", "p-6")).toBe("p-6");
  });

  it("drops conditionals that did not fire", () => {
    expect(cn("rounded", false, null, undefined, "border")).toBe("rounded border");
  });
});
