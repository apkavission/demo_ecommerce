"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FONT_PAIRS } from "@/lib/fonts";
import { type FormState, fieldErrors } from "@/lib/form-state";

/**
 * What a business *is*, made editable.
 *
 * ---------------------------------------------------------------------------
 * **The owner's instruction.**
 *
 *   > demos ka jitna bhi project h usko best banana h … admin panel me jo h
 *   > website ka naam and logo sab change karne wala hona chaiye … sab kuch
 *   > dynamic karna h demos ka bhi jaise services ka kiya h
 *
 * The logo could already be changed. The name could not — nor the tagline, the
 * phone number in the footer, the fourteen colours, the corner radius, the
 * typeface, or which mode the site opens in. **Every one of those already had a
 * column**, filled in by a migration or by `clone_variant`, and reachable
 * afterwards only by writing SQL. A demo whose name is set by a migration is a
 * template with a client's name typed into it, which is exactly what these
 * exist to not be.
 *
 * So this file adds no column and needs no migration. It is the missing half of
 * a schema that was always meant to be edited.
 *
 * ---------------------------------------------------------------------------
 * **Four actions rather than one.** A single save for six sections means a
 * half-finished palette is submitted along with a corrected phone number, and
 * one validation failure anywhere throws away every field. Each section saves
 * itself, and a mistake in one leaves the others alone.
 *
 * ---------------------------------------------------------------------------
 * **Super admin only**, like Brand and Businesses. A name and a palette decide
 * what every future prospect sees; content decides what this week says. That
 * line is the reason the panel has two levels at all.
 *
 * ---------------------------------------------------------------------------
 * **The slug is not here on purpose.** It is in the address of every share link
 * already sent to somebody, and renaming it turns a live link in a prospect's
 * inbox into the expired-link screen. Changing it is a decision with a
 * consequence outside this application, so it stays a deliberate database
 * change rather than a text field beside the tagline.
 */

const ok = (message: string): FormState => ({ status: "success", message });
const no = (message: string): FormState => ({ status: "error", message });

const SAVED = "Saved. The site shows it straight away.";

/**
 * Everything a save touches.
 *
 * `"/"` with `"layout"` because the palette, the type and the name all live in
 * `[variant]/layout.tsx` — revalidating the page alone would leave the header
 * and the stylesheet on the old row.
 */
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

/**
 * A colour, as a browser's colour input writes one.
 *
 * Three, six and eight digits are all accepted because a value pasted from a
 * brand guide is as likely to be `#fff` or to carry an alpha pair as it is to
 * be the six digits the picker produces. `readTheme()` applies the same rule at
 * the other end, and a value that fails it there falls back silently — which is
 * the reason to fail loudly here instead.
 */
const colour = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$/, `${label} is not a colour.`);

/*
  The fourteen colour fields, written out rather than generated.

  A helper returning `{ [`${mode}_accent`]: … }` compiles, and then Zod infers
  an object with an index signature and no known keys — so `parsed.data.light_bg`
  is a type error and every colour has to be cast back out. `branding.ts` has
  the same note over its three named branches: a computed key is exactly how a
  typo becomes a silent write to a column chosen by whoever sent it.
*/
const lookSchema = z.object({
  variant_id: z.string().uuid(),

  light_accent: colour("The accent"),
  light_accent_fg: colour("The text on the accent"),
  light_accent_soft: colour("The soft tint"),
  light_bg: colour("The page"),
  light_surface: colour("The card"),
  light_text: colour("The text"),
  light_muted: colour("The quiet text"),

  dark_accent: colour("The accent in dark mode"),
  dark_accent_fg: colour("The text on the accent in dark mode"),
  dark_accent_soft: colour("The soft tint in dark mode"),
  dark_bg: colour("The page in dark mode"),
  dark_surface: colour("The card in dark mode"),
  dark_text: colour("The text in dark mode"),
  dark_muted: colour("The quiet text in dark mode"),

  radius: z.enum(["sm", "md", "lg", "xl"]),
  /* Only a pairing this build has actually made. A family name — which is what
     these columns held before `lib/fonts.ts` existed — is refused rather than
     saved and silently ignored. */
  font_pair: z.enum(FONT_PAIRS.map((pair) => pair.key) as [string, ...string[]]),
  default_mode: z.enum(["light", "dark"]),
  /* A checkbox sends "on" or nothing at all, never "false". */
  allow_mode_toggle: z.boolean(),
});

/* ============================================================== identity == */

const identitySchema = z.object({
  variant_id: z.string().uuid(),
  business_name: z
    .string()
    .trim()
    .min(2, "A business needs a name.")
    .max(120, "That will not fit in a header."),
  /*
    Two names, and both are needed.

    `business_name` is what the site says it is — "Smile Care Dental Studio".
    `name` is what we call it between ourselves, and it is what the switcher at
    the top of a demo shows when somebody is comparing three of them: a dropdown
    of full trading names is unreadable, and "Dental" is not.
  */
  name: z.string().trim().min(2, "A short name for the switcher.").max(80),
  industry_label: z
    .string()
    .trim()
    .min(2, "What kind of business is this?")
    .max(60, "Keep it to a couple of words."),
  tagline: z.string().trim().max(180, "A tagline, not a paragraph.").optional(),
  description: z.string().trim().max(900, "Long enough. The rest belongs on a page.").optional(),
});

export async function saveIdentity(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const parsed = identitySchema.safeParse({
    variant_id: formData.get("variant_id"),
    business_name: formData.get("business_name"),
    name: formData.get("name"),
    industry_label: formData.get("industry_label"),
    tagline: formData.get("tagline") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("variants")
    .update({
      business_name: parsed.data.business_name,
      name: parsed.data.name,
      industry_label: parsed.data.industry_label,
      /* Null rather than an empty string: the site asks "is there a tagline"
         and an empty string answers yes, then renders nothing where something
         was expected. */
      tagline: parsed.data.tagline ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("id", parsed.data.variant_id);

  if (error) return no(error.message);

  refresh();
  return ok(SAVED);
}

/* ================================================================== look == */

export async function saveLook(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const parsed = lookSchema.safeParse({
    variant_id: formData.get("variant_id"),

    light_accent: text("light_accent"),
    light_accent_fg: text("light_accent_fg"),
    light_accent_soft: text("light_accent_soft"),
    light_bg: text("light_bg"),
    light_surface: text("light_surface"),
    light_text: text("light_text"),
    light_muted: text("light_muted"),

    dark_accent: text("dark_accent"),
    dark_accent_fg: text("dark_accent_fg"),
    dark_accent_soft: text("dark_accent_soft"),
    dark_bg: text("dark_bg"),
    dark_surface: text("dark_surface"),
    dark_text: text("dark_text"),
    dark_muted: text("dark_muted"),

    radius: formData.get("radius"),
    font_pair: formData.get("font_pair"),
    default_mode: formData.get("default_mode"),
    allow_mode_toggle: formData.get("allow_mode_toggle") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const d = parsed.data;

  /*
    The whole `theme` object is replaced rather than merged.

    Every key the application reads is on this form, so a merge would only ever
    preserve a key nothing renders — and merging jsonb from an action means
    reading the row first, which is a second round trip and a race with whoever
    else is editing. A replace is one statement and cannot half-apply.
  */
  const theme = {
    light: {
      accent: d.light_accent,
      accentFg: d.light_accent_fg,
      accentSoft: d.light_accent_soft,
      bg: d.light_bg,
      surface: d.light_surface,
      text: d.light_text,
      muted: d.light_muted,
    },
    dark: {
      accent: d.dark_accent,
      accentFg: d.dark_accent_fg,
      accentSoft: d.dark_accent_soft,
      bg: d.dark_bg,
      surface: d.dark_surface,
      text: d.dark_text,
      muted: d.dark_muted,
    },
    /* One pairing, written to both columns so the two can never disagree.
       `readTheme()` reads the key off `headingFont`; `bodyFont` is kept in step
       so a row inspected by hand is not misleading. */
    headingFont: d.font_pair,
    bodyFont: d.font_pair,
    radius: d.radius,
  };

  const supabase = await createClient();

  const { error } = await supabase
    .from("variants")
    .update({
      theme,
      default_mode: d.default_mode,
      allow_mode_toggle: d.allow_mode_toggle,
    })
    .eq("id", d.variant_id);

  if (error) return no(error.message);

  refresh();
  return ok(SAVED);
}

/* =============================================================== contact == */

const contactSchema = z.object({
  variant_id: z.string().uuid(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  /* Validated only when given: most of these demos have no email at all, and
     an empty field is not a malformed address. */
  email: z.string().trim().max(160).email("That is not an email address.").optional(),
  address: z.string().trim().max(300).optional(),
  /*
    One line, and no map query.

    This schema's `contact` is not the other five demos': `hours` is a single
    string here, printed whole by the shop's footer and its contact page, and
    there is no `mapQuery` at all. Three boxes and a map field would write a
    shape nothing in this application reads.
  */
  hours: z.string().trim().max(160).optional(),
});

export async function saveContact(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const text = (key: string) => (String(formData.get(key) ?? "").trim() ? formData.get(key) : undefined);

  const parsed = contactSchema.safeParse({
    variant_id: formData.get("variant_id"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    address: text("address"),
    hours: text("hours"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const d = parsed.data;

  /*
    An absent field is left out of the object rather than stored as `""`.
    Every place the site renders a phone number asks whether there is one, and
    an empty string is a yes — which draws a "Call us" row with nothing to
    call. The same rule as `tagline` above, applied to jsonb.
  */
  const contact = {
    ...(d.phone ? { phone: d.phone } : {}),
    ...(d.whatsapp ? { whatsapp: d.whatsapp } : {}),
    ...(d.email ? { email: d.email } : {}),
    ...(d.address ? { address: d.address } : {}),
    ...(d.hours ? { hours: d.hours } : {}),
  };

  const supabase = await createClient();

  const { error } = await supabase.from("variants").update({ contact }).eq("id", d.variant_id);

  if (error) return no(error.message);

  refresh();
  return ok(SAVED);
}

/* ================================================================= words == */

const wordsSchema = z.object({
  variant_id: z.string().uuid(),
  booking_label: z.string().trim().max(40, "It is a button, not a sentence.").optional(),
});

export async function saveWords(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const parsed = wordsSchema.safeParse({
    variant_id: formData.get("variant_id"),
    booking_label: formData.get("booking_label") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Have a look below.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const d = parsed.data;

  /* Only the label. This demo's site reads no other toggle, and a field
     that writes a key nothing renders is the thing this screen exists to
     remove rather than to add. */
  const features = d.booking_label ? { bookingLabel: d.booking_label } : {};

  const supabase = await createClient();

  const { error } = await supabase.from("variants").update({ features }).eq("id", d.variant_id);

  if (error) return no(error.message);

  refresh();
  return ok(SAVED);
}
