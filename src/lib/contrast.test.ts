import { describe, expect, it } from "vitest";
import { contrastRatio, contrastVerdict, formatRatio } from "@/lib/contrast";

describe("contrastRatio", () => {
  it("gives 21 for black on white, which is the maximum there is", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("gives 1 for a colour against itself", () => {
    expect(contrastRatio("#0f766e", "#0f766e")).toBeCloseTo(1, 5);
  });

  it("does not care which way round the two are given", () => {
    const one = contrastRatio("#0f766e", "#ffffff");
    const two = contrastRatio("#ffffff", "#0f766e");
    expect(one).toBeCloseTo(two as number, 10);
  });

  it("reads the three shorthands a brand guide is written in", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
    /* An alpha pair is ignored rather than refused: a colour pasted out of a
       design tool often carries one, and the opaque value is still the colour
       somebody meant. */
    expect(contrastRatio("#ffffffff", "#000000ff")).toBeCloseTo(21, 5);
  });

  it("answers null for something that is not a colour, rather than a number", () => {
    /* A half-typed value in a text field is not a contrast failure, and
       reporting it as one trains people to ignore the warning. */
    expect(contrastRatio("#ab", "#ffffff")).toBeNull();
    expect(contrastRatio("rebeccapurple", "#ffffff")).toBeNull();
    expect(contrastRatio("", "#ffffff")).toBeNull();
  });

  it("uses the linear part of the sRGB curve near black", () => {
    /*
      The reason this test exists: dropping the 0.03928 branch and using a
      plain power curve gives a visibly different answer for near-black pairs,
      and near-black is half of every dark palette here. #010101 on #000000 is
      barely above 1 — a plain curve puts it lower still.
    */
    const ratio = contrastRatio("#010101", "#000000") as number;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(1.1);
  });
});

describe("contrastVerdict", () => {
  it("passes body text at 4.5 and above", () => {
    /* The clinic's own light palette: near-black text on a light grey page. */
    expect(contrastVerdict("#0b1220", "#f4f6f8").verdict).toBe("pass");
  });

  it("calls 3-to-4.5 large-only, because that is exactly what it is", () => {
    const { verdict } = contrastVerdict("#8a8a8a", "#ffffff");
    expect(verdict).toBe("large-only");
    expect(contrastVerdict("#8a8a8a", "#ffffff", { large: true }).verdict).toBe("pass");
  });

  it("fails below 3 in both sizes", () => {
    expect(contrastVerdict("#bbbbbb", "#ffffff").verdict).toBe("fail");
    expect(contrastVerdict("#bbbbbb", "#ffffff", { large: true }).verdict).toBe("fail");
  });

  it("says unknown rather than fail when a colour cannot be read", () => {
    expect(contrastVerdict("#zz", "#ffffff").verdict).toBe("unknown");
  });
});

describe("formatRatio", () => {
  it("prints one decimal and a colon", () => {
    expect(formatRatio(4.53215)).toBe("4.5:1");
  });

  it("prints a dash for nothing measurable", () => {
    expect(formatRatio(null)).toBe("—");
  });
});
