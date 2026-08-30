import type { ZodIssue } from "zod";

/**
 * What every form action gives back.
 *
 * **In its own file, and not in an actions file, because of a real rule rather
 * than tidiness.** A module marked `"use server"` may export nothing but async
 * functions — every export becomes an HTTP endpoint, and an exported object
 * cannot be one. Putting the shared shape and its initial value beside the
 * actions produces:
 *
 *     Error: A "use server" file can only export async functions, found object.
 *
 * which is a build-time failure of the whole route, discovered when a page will
 * not render rather than when the export is written. The same mistake was made
 * once already in the tracker, with `slugify`, and this comment is the cheapest
 * way to not make it a third time.
 */
export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  /** Keyed by field name, so a message lands under the input it belongs to. */
  fieldErrors?: Record<string, string>;
}

export const idleState: FormState = { status: "idle" };

/**
 * Zod issues, flattened to one message per field.
 *
 * The first wins. Three sentences under one input is a way of saying nothing
 * three times — only the first gets read.
 */
export function fieldErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}
