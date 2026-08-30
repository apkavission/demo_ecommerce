import { describe, expect, it } from "vitest";
import type { ZodIssue } from "zod";
import { fieldErrors, idleState } from "./form-state";

const issue = (path: (string | number)[], message: string) =>
  ({ code: "custom", path, message }) as unknown as ZodIssue;

describe("fieldErrors", () => {
  it("puts each message under the input it belongs to", () => {
    expect(fieldErrors([issue(["email"], "Enter an email address")])).toEqual({
      email: "Enter an email address",
    });
  });

  it("keeps the first message per field and drops the rest", () => {
    // Three sentences under one input is a way of saying nothing three times.
    const errors = fieldErrors([
      issue(["phone"], "Enter a phone number"),
      issue(["phone"], "Ten digits, please"),
    ]);

    expect(errors.phone).toBe("Enter a phone number");
  });

  it("gives a whole-form problem somewhere to land", () => {
    expect(fieldErrors([issue([], "Something was wrong")]).form).toBe("Something was wrong");
  });

  it("names a nested field by its path", () => {
    expect(fieldErrors([issue(["guest", "name"], "Required")])).toEqual({
      "guest.name": "Required",
    });
  });
});

describe("idleState", () => {
  it("starts with nothing said", () => {
    expect(idleState).toEqual({ status: "idle" });
  });
});
