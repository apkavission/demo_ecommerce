"use client";

import { useActionState, useState } from "react";
import { Check, Palette, Type as TypeIcon } from "lucide-react";
import { saveContact, saveIdentity, saveLook, saveWords } from "@/lib/actions/website";
import { contrastVerdict, formatRatio } from "@/lib/contrast";
import { FONT_PAIRS } from "@/lib/fonts";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { idleState, type FormState } from "@/lib/form-state";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { BrandEditor } from "@/components/admin/brand-editor";
import { cn } from "@/lib/utils";
import type { BrandRow } from "@/lib/branding";

/**
 * One business, and everything about it that used to need SQL.
 *
 * ---------------------------------------------------------------------------
 * **The owner's instruction, twice over.**
 *
 *   > admin panel me jo h website ka naam and logo sab change karne wala hona
 *   > chaiye … sab kuch dynamic karna h
 *
 *   > theme wala chaiye hi chaiye … sab kuch change hona chiate theme wise
 *
 * The logo was already editable. The name was not, and neither was the thing
 * that changes the most: the theme. Fourteen colours, a typeface and a corner
 * radius were set once by a migration and unreachable afterwards.
 *
 * ---------------------------------------------------------------------------
 * **Five sections, five saves.** One save for the lot means a half-finished
 * palette is submitted with a corrected phone number, and one bad field throws
 * both away. Each section is its own form and its own action.
 *
 * ---------------------------------------------------------------------------
 * **The theme section shows both modes at once, and says the contrast out
 * loud.** A palette does not go wrong by being ugly — it goes wrong in a pair:
 * grey text on a grey page, white text on a yellow button. The estate shipped
 * exactly that for a fortnight. Nothing here is refused, because a client who
 * insists on their own brand grey must still be buildable — but it cannot be
 * chosen without being told.
 */

/** What the screen needs to know about a business. Identity, look and words. */
export interface WebsiteBusiness {
  id: string;
  slug: string;
  name: string;
  industryLabel: string;
  businessName: string;
  tagline: string | null;
  description: string | null;
  theme: {
    light: Record<string, string>;
    dark: Record<string, string>;
    headingFont?: string;
    radius?: "sm" | "md" | "lg" | "xl";
  };
  contact: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    /*
      One line, not three.

      Every other demo stores `hours` as `{ weekdays, saturday, sunday }`; this
      one stores a single string, and both the shop's contact page and its
      footer render it as one. A screen offering three boxes here would write a
      shape those two pages cannot read.
    */
    hours?: string;
  };
  features: { bookingLabel?: string };
  defaultMode: "light" | "dark";
  allowModeToggle: boolean;
}

const FIELD =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const SECTIONS = [
  { key: "identity", label: "Name & words" },
  { key: "theme", label: "Theme" },
  { key: "logo", label: "Logo & search" },
  { key: "contact", label: "Contact" },
  { key: "labels", label: "Buttons & extras" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function WebsiteEditor({
  business,
  brand,
}: {
  business: WebsiteBusiness;
  brand: BrandRow | null;
}) {
  const [section, setSection] = useState<SectionKey>("identity");

  return (
    <div className="mt-8">
      {/* A row of sections rather than one long scroll: six forms stacked is a
          screen nobody reaches the bottom of, and the theme — the part most
          often changed — would be furthest away. */}
      <nav aria-label="Section" className="flex flex-wrap gap-2 border-b border-border pb-4">
        {SECTIONS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setSection(entry.key)}
            aria-current={section === entry.key ? "true" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              section === entry.key
                ? "border-accent bg-accent-soft font-semibold text-accent"
                : "border-border text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {section === "identity" && <IdentityForm business={business} />}
        {section === "theme" && <ThemeForm business={business} />}
        {section === "logo" &&
          (brand ? (
            <BrandEditor business={brand} />
          ) : (
            <Empty>The logo screen could not read this business.</Empty>
          ))}
        {section === "contact" && <ContactForm business={business} />}
        {section === "labels" && <WordsForm business={business} />}
      </div>
    </div>
  );
}

/* ================================================================ pieces == */

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-sm text-muted">
      {children}
    </p>
  );
}

/** A save button and whatever the action said, in one place. */
function SaveBar({
  state,
  pending,
  label = "Save",
}: {
  state: FormState;
  pending: boolean;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving" : label}
      </button>

      {state.status !== "idle" && !pending && (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm",
            state.status === "error" ? "text-red-600 dark:text-red-400" : "text-muted",
          )}
        >
          {state.status === "success" && <Check className="size-4" aria-hidden />}
          {state.message}
        </span>
      )}
    </div>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{message}</span>;
}

/* ============================================================== identity == */

function IdentityForm({ business }: { business: WebsiteBusiness }) {
  const [state, action, pending] = useActionState(saveIdentity, idleState);
  useBusyWhile(pending, "Saving the name");

  return (
    <form action={action} className="card space-y-5 p-6">
      <input type="hidden" name="variant_id" value={business.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">What the site calls itself</span>
          <input
            name="business_name"
            defaultValue={business.businessName}
            required
            maxLength={120}
            className={FIELD}
          />
          <span className="mt-1 block text-xs text-muted">
            The full trading name. It is the header, the footer, the tab and
            every page title.
          </span>
          <Error message={state.fieldErrors?.business_name} />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Short name, for the switcher</span>
          <input name="name" defaultValue={business.name} required maxLength={80} className={FIELD} />
          <span className="mt-1 block text-xs text-muted">
            What &ldquo;Viewing: …&rdquo; says at the top of a demo. A dropdown
            of full trading names is unreadable.
          </span>
          <Error message={state.fieldErrors?.name} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">What kind of business it is</span>
        <input
          name="industry_label"
          defaultValue={business.industryLabel}
          required
          maxLength={60}
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-muted">
          The small line above the headline — &ldquo;Dental studio&rdquo;,
          &ldquo;Eye hospital&rdquo;. A couple of words.
        </span>
        <Error message={state.fieldErrors?.industry_label} />
      </label>

      <label className="block text-sm">
        <span className="font-medium">The headline</span>
        <input
          name="tagline"
          defaultValue={business.tagline ?? ""}
          maxLength={180}
          placeholder={business.businessName}
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-muted">
          The first thing anybody reads. Empty falls back to the name, which is
          a headline that says nothing — so write one.
        </span>
        <Error message={state.fieldErrors?.tagline} />
      </label>

      <label className="block text-sm">
        <span className="font-medium">The paragraph under it</span>
        <textarea
          name="description"
          defaultValue={business.description ?? ""}
          rows={4}
          maxLength={900}
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-muted">
          Two or three sentences. What this place does and who for.
        </span>
        <Error message={state.fieldErrors?.description} />
      </label>

      <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
        The address <span className="font-medium text-text">/{business.slug}</span> is
        not editable here. It is inside every share link already sent to
        somebody, and renaming it turns a live link in a prospect&rsquo;s inbox
        into the expired-link screen.
      </p>

      <SaveBar state={state} pending={pending} label="Save the name" />
    </form>
  );
}

/* ================================================================= theme == */

/** The seven colours of one mode, in the order somebody thinks about them. */
const SWATCHES = [
  { key: "bg", label: "The page", note: "Behind everything." },
  { key: "surface", label: "Cards", note: "A step away from the page." },
  { key: "text", label: "Text", note: "Headings and paragraphs." },
  { key: "muted", label: "Quiet text", note: "Hints and captions." },
  { key: "accent", label: "The brand colour", note: "Buttons and links." },
  { key: "accentFg", label: "Text on the brand colour", note: "The button's label." },
  { key: "accentSoft", label: "Soft tint", note: "Chips and highlighted bands." },
] as const;

/** Form field names are `light_accent_fg`, so camelCase becomes snake_case. */
const fieldName = (mode: "light" | "dark", key: string) =>
  `${mode}_${key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())}`;

type Palette = Record<string, string>;

function ThemeForm({ business }: { business: WebsiteBusiness }) {
  const [state, action, pending] = useActionState(saveLook, idleState);
  useBusyWhile(pending, "Saving the theme");

  /*
    Controlled inputs, because a preset has to be able to write into them.

    Fourteen `defaultValue` inputs cannot be changed by a click on "Warm clay"
    — the DOM would keep the old value and the preview would lie. So the
    palette is state, the pickers read from it, and a preset is one `setState`.
  */
  const [light, setLight] = useState<Palette>(() => ({ ...business.theme.light }));
  const [dark, setDark] = useState<Palette>(() => ({ ...business.theme.dark }));
  const [fontPair, setFontPair] = useState(business.theme.headingFont ?? FONT_PAIRS[0].key);
  const [radius, setRadius] = useState(business.theme.radius ?? "lg");
  const [defaultMode, setDefaultMode] = useState(business.defaultMode);
  const [allowToggle, setAllowToggle] = useState(business.allowModeToggle);
  const [applied, setApplied] = useState<string | null>(null);

  const dirty =
    applied !== null ||
    JSON.stringify(light) !== JSON.stringify(business.theme.light) ||
    JSON.stringify(dark) !== JSON.stringify(business.theme.dark) ||
    fontPair !== (business.theme.headingFont ?? FONT_PAIRS[0].key) ||
    radius !== (business.theme.radius ?? "lg") ||
    defaultMode !== business.defaultMode ||
    allowToggle !== business.allowModeToggle;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="variant_id" value={business.id} />

      {/* ------------------------------------------------------ whole themes */}

      <section className="card p-6">
        <header className="flex items-start gap-3">
          <Palette className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold">Start from a theme</h2>
            <p className="measure mt-1 text-sm text-muted">
              One click sets all fourteen colours, the typeface and the corner
              radius. Every one of these is checked for readability in both
              modes by a test, so none of them can be the pretty one that
              cannot be read.
            </p>
          </div>
        </header>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {THEME_PRESETS.map((preset) => (
            <li key={preset.key}>
              <button
                type="button"
                onClick={() => {
                  setLight({ ...preset.light });
                  setDark({ ...preset.dark });
                  setFontPair(preset.fontPair);
                  setRadius(preset.radius);
                  setApplied(preset.key);
                }}
                className={cn(
                  "flex w-full flex-col gap-3 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                  applied === preset.key
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface-2",
                )}
              >
                {/* The theme as it is, not as a name. Two rows, because a
                    palette chosen in light and never seen in dark is the
                    commonest way one of these goes wrong. */}
                <span className="flex gap-1.5">
                  {(["light", "dark"] as const).map((mode) => (
                    <span
                      key={mode}
                      className="flex flex-1 items-center gap-1 rounded-md p-1.5"
                      style={{ background: preset[mode].bg }}
                    >
                      <span
                        className="size-4 rounded-full"
                        style={{ background: preset[mode].accent }}
                      />
                      <span
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: preset[mode].text, opacity: 0.85 }}
                      />
                      <span
                        className="size-4 rounded-sm"
                        style={{ background: preset[mode].surface }}
                      />
                    </span>
                  ))}
                </span>

                <span>
                  <span className="block text-sm font-semibold">{preset.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{preset.note}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {dirty && (
          <p role="status" className="mt-4 rounded-lg bg-surface-2 p-3 text-xs text-muted">
            This is a preview. Nothing has changed on the site until you press{" "}
            <span className="font-medium text-text">Save the theme</span>.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------- the two */}

      <div className="grid gap-6 lg:grid-cols-2">
        <PaletteEditor
          mode="light"
          title="Light mode"
          palette={light}
          onChange={(key, value) => setLight((was) => ({ ...was, [key]: value }))}
          errors={state.fieldErrors}
        />
        <PaletteEditor
          mode="dark"
          title="Dark mode"
          palette={dark}
          onChange={(key, value) => setDark((was) => ({ ...was, [key]: value }))}
          errors={state.fieldErrors}
        />
      </div>

      {/* -------------------------------------------------------- type, shape */}

      <section className="card space-y-5 p-6">
        <header className="flex items-start gap-3">
          <TypeIcon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold">Type and shape</h2>
            <p className="measure mt-1 text-sm text-muted">
              A heading face and a body face that were not chosen together is
              the commonest way a site with good colours still looks assembled,
              so these are pairs.
            </p>
          </div>
        </header>

        <fieldset>
          <legend className="text-sm font-medium">Typeface</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {FONT_PAIRS.map((pair) => (
              <label
                key={pair.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-3 transition-colors",
                  fontPair === pair.key
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="font_pair"
                  value={pair.key}
                  checked={fontPair === pair.key}
                  onChange={() => setFontPair(pair.key)}
                  className="mt-1 size-4"
                />
                <span className="min-w-0">
                  {/* Set in the face it names. A list of typeface names in one
                      typeface asks somebody to choose a font they cannot see. */}
                  <span
                    className="block truncate text-base font-semibold"
                    style={{ fontFamily: `var(${pair.headingVar})` }}
                  >
                    {pair.label}
                  </span>
                  <span
                    className="mt-0.5 block text-xs text-muted"
                    style={{ fontFamily: `var(${pair.bodyVar})` }}
                  >
                    {pair.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Error message={state.fieldErrors?.font_pair} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">Corners</span>
            <select
              name="radius"
              value={radius}
              onChange={(event) => setRadius(event.target.value as typeof radius)}
              className={FIELD}
            >
              <option value="sm">Sharp</option>
              <option value="md">Slightly rounded</option>
              <option value="lg">Rounded</option>
              <option value="xl">Very rounded</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Opens in</span>
            <select
              name="default_mode"
              value={defaultMode}
              onChange={(event) => setDefaultMode(event.target.value as "light" | "dark")}
              className={FIELD}
            >
              <option value="light">Light mode</option>
              <option value="dark">Dark mode</option>
            </select>
          </label>

          <label className="flex items-start gap-3 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="allow_mode_toggle"
              checked={allowToggle}
              onChange={(event) => setAllowToggle(event.target.checked)}
              className="mt-0.5 size-4 rounded border-border"
            />
            <span>
              Let visitors switch
              <span className="mt-0.5 block text-xs text-muted">
                Off when the business only looks right one way.
              </span>
            </span>
          </label>
        </div>
      </section>

      {/* ------------------------------------------------------------ preview */}

      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">How it looks</h2>
        <p className="measure mt-1 text-sm text-muted">
          Both modes, side by side, as they will be. A palette checked in only
          one of them is how the estate&rsquo;s own applications looked flat for
          a fortnight.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Preview
            palette={light}
            radius={radius}
            fontPair={fontPair}
            name={business.businessName}
            tagline={business.tagline}
            label={business.features.bookingLabel ?? "Book an appointment"}
            mode="Light"
          />
          <Preview
            palette={dark}
            radius={radius}
            fontPair={fontPair}
            name={business.businessName}
            tagline={business.tagline}
            label={business.features.bookingLabel ?? "Book an appointment"}
            mode="Dark"
          />
        </div>
      </section>

      <div className="card p-6">
        <SaveBar state={state} pending={pending} label="Save the theme" />
      </div>
    </form>
  );
}

/** Seven colours of one mode, each with the contrast it produces. */
function PaletteEditor({
  mode,
  title,
  palette,
  onChange,
  errors,
}: {
  mode: "light" | "dark";
  title: string;
  palette: Palette;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
}) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>

      <ul className="mt-4 space-y-3">
        {SWATCHES.map((swatch) => {
          const name = fieldName(mode, swatch.key);
          const value = palette[swatch.key] ?? "";

          return (
            <li key={swatch.key} className="flex items-center gap-3">
              {/*
                A colour input and a text input for the same value.

                The picker is how somebody chooses; the text field is how a
                brand guide's hex gets in. A picker alone means retyping a
                known value by dragging at it until it matches.
              */}
              <input
                type="color"
                aria-label={swatch.label}
                value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
                onChange={(event) => onChange(swatch.key, event.target.value)}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />

              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium" htmlFor={name}>
                  {swatch.label}
                </label>
                <span className="block text-xs text-muted">{swatch.note}</span>
                <Error message={errors?.[name]} />
              </div>

              <input
                id={name}
                name={name}
                value={value}
                onChange={(event) => onChange(swatch.key, event.target.value)}
                spellCheck={false}
                className="w-28 shrink-0 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-xs"
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-5 space-y-1.5 border-t border-border pt-4">
        <Ratio label="Text on the page" a={palette.text} b={palette.bg} />
        <Ratio label="Text on a card" a={palette.text} b={palette.surface} />
        <Ratio label="Quiet text on a card" a={palette.muted} b={palette.surface} />
        <Ratio label="A button's label" a={palette.accentFg} b={palette.accent} />
        <Ratio label="Brand colour on its tint" a={palette.accent} b={palette.accentSoft} large />
      </div>
    </section>
  );
}

/** One contrast pair, said out loud. */
function Ratio({
  label,
  a,
  b,
  large = false,
}: {
  label: string;
  a?: string;
  b?: string;
  large?: boolean;
}) {
  const { ratio, verdict } = contrastVerdict(a ?? "", b ?? "", { large });

  const word =
    verdict === "pass"
      ? "reads"
      : verdict === "large-only"
        ? "large text only"
        : verdict === "fail"
          ? "hard to read"
          : "—";

  return (
    <p className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "shrink-0 font-medium",
          verdict === "pass" && "text-muted",
          verdict === "large-only" && "text-amber-600 dark:text-amber-400",
          verdict === "fail" && "text-red-600 dark:text-red-400",
        )}
      >
        {formatRatio(ratio)} · {word}
      </span>
    </p>
  );
}

const RADIUS_LENGTH = { sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.25rem" } as const;

/**
 * A page in miniature, in one mode.
 *
 * Deliberately not an iframe of the real site: an iframe would need the values
 * saved first, which is the wrong way round — the point is to see a palette
 * before committing it. So this is the same shapes the site uses, drawn from
 * the same seven values.
 */
function Preview({
  palette,
  radius,
  fontPair,
  name,
  tagline,
  label,
  mode,
}: {
  palette: Palette;
  radius: keyof typeof RADIUS_LENGTH;
  fontPair: string;
  name: string;
  tagline: string | null;
  label: string;
  mode: string;
}) {
  const pair = FONT_PAIRS.find((entry) => entry.key === fontPair) ?? FONT_PAIRS[0];
  const round = RADIUS_LENGTH[radius];

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{mode}</p>

      <div
        className="overflow-hidden rounded-[var(--radius-card)] border border-border"
        style={{ background: palette.bg, color: palette.text }}
      >
        {/* the header */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ background: palette.surface, borderBottom: `1px solid ${palette.accentSoft}` }}
        >
          <span
            className="truncate text-sm font-semibold"
            style={{ fontFamily: `var(${pair.headingVar})` }}
          >
            {name}
          </span>
          <span className="flex gap-2" aria-hidden>
            {["Services", "Contact"].map((item) => (
              <span
                key={item}
                className="text-[11px]"
                style={{ color: palette.muted, fontFamily: `var(${pair.bodyVar})` }}
              >
                {item}
              </span>
            ))}
          </span>
        </div>

        {/* the hero */}
        <div className="px-4 py-5">
          <span
            className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: palette.accentSoft,
              color: palette.accent,
              borderRadius: round,
            }}
          >
            Eyebrow
          </span>

          <p
            className="mt-2 text-lg font-semibold leading-tight"
            style={{ fontFamily: `var(${pair.headingVar})` }}
          >
            {tagline ?? name}
          </p>

          <p
            className="mt-1.5 text-xs leading-relaxed"
            style={{ color: palette.muted, fontFamily: `var(${pair.bodyVar})` }}
          >
            The paragraph under the headline, in the quiet colour, at the size
            it is actually read at.
          </p>

          <span
            className="mt-3 inline-block px-3 py-1.5 text-xs font-semibold"
            style={{
              background: palette.accent,
              color: palette.accentFg,
              borderRadius: 999,
              fontFamily: `var(${pair.bodyVar})`,
            }}
          >
            {label}
          </span>
        </div>

        {/* a card, on the page, so the step between them is visible */}
        <div className="px-4 pb-5">
          <div
            className="p-3"
            style={{
              background: palette.surface,
              borderRadius: round,
              border: `1px solid ${palette.accentSoft}`,
            }}
          >
            <p className="text-xs font-semibold" style={{ fontFamily: `var(${pair.headingVar})` }}>
              A card
            </p>
            <p
              className="mt-1 text-[11px]"
              style={{ color: palette.muted, fontFamily: `var(${pair.bodyVar})` }}
            >
              If this looks like part of the page rather than sitting on it, the
              page and the card are too close together.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================== contact == */

function ContactForm({ business }: { business: WebsiteBusiness }) {
  const [state, action, pending] = useActionState(saveContact, idleState);
  useBusyWhile(pending, "Saving the contact details");

  const c = business.contact;

  return (
    <form action={action} className="card space-y-5 p-6">
      <input type="hidden" name="variant_id" value={business.id} />

      <p className="measure text-sm text-muted">
        Everything here is optional, and an empty field is left out of the site
        rather than drawn empty — no &ldquo;Call us&rdquo; row with nothing to
        call.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Phone</span>
          <input name="phone" defaultValue={c.phone ?? ""} maxLength={40} className={FIELD} />
          <Error message={state.fieldErrors?.phone} />
        </label>

        <label className="block text-sm">
          <span className="font-medium">WhatsApp</span>
          <input name="whatsapp" defaultValue={c.whatsapp ?? ""} maxLength={40} className={FIELD} />
          <span className="mt-1 block text-xs text-muted">
            With the country code, so the link opens a chat rather than an error.
          </span>
          <Error message={state.fieldErrors?.whatsapp} />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={c.email ?? ""}
            maxLength={160}
            className={FIELD}
          />
          <Error message={state.fieldErrors?.email} />
        </label>

      </div>

      <label className="block text-sm">
        <span className="font-medium">Address</span>
        <textarea
          name="address"
          defaultValue={c.address ?? ""}
          rows={3}
          maxLength={300}
          className={FIELD}
        />
        <Error message={state.fieldErrors?.address} />
      </label>

      <label className="block text-sm">
        <span className="font-medium">When the shop is open</span>
        <input
          name="hours"
          defaultValue={c.hours ?? ""}
          placeholder="Mon–Sat 10:00 — 20:00, Sunday closed"
          maxLength={160}
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-muted">
          One line, as the footer and the contact page print it.
        </span>
        <Error message={state.fieldErrors?.hours} />
      </label>

      <SaveBar state={state} pending={pending} label="Save the contact details" />
    </form>
  );
}

/* ================================================================= words == */

function WordsForm({ business }: { business: WebsiteBusiness }) {
  const [state, action, pending] = useActionState(saveWords, idleState);
  useBusyWhile(pending, "Saving");

  return (
    <form action={action} className="card space-y-5 p-6">
      <input type="hidden" name="variant_id" value={business.id} />

      <label className="block text-sm">
        <span className="font-medium">What the main button says</span>
        <input
          name="booking_label"
          defaultValue={business.features.bookingLabel ?? ""}
          placeholder="Book an appointment"
          maxLength={40}
          className={FIELD}
        />
        <span className="mt-1 block text-xs text-muted">
          An eye hospital books a screening; a dental clinic books a cleaning.
          Empty uses &ldquo;Book an appointment&rdquo;.
        </span>
        <Error message={state.fieldErrors?.booking_label} />
      </label>

<SaveBar state={state} pending={pending} />
    </form>
  );
}
