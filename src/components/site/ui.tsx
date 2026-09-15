import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Counter } from "@/components/site/motion";
import { cn } from "@/lib/utils";

/**
 * The furniture every page of this site is built out of.
 *
 * ---------------------------------------------------------------------------
 * **Seven pages used to write their own headers.** Each one had a title, an
 * opening line and a grid, arranged slightly differently, and the difference
 * was not a decision anybody made — it was six files written on six days. The
 * effect on a prospect is exact: the home page looks designed and the pages
 * behind the menu look like the same content in a plainer template, which is
 * the first thing a click on "Services" reveals.
 *
 * So the header, the section heading, the monogram, the week strip and the
 * statistic live here, once. A change to any of them is a change to the whole
 * site, which is what a design system is for and the only way seven pages stay
 * one site while somebody is still editing them.
 *
 * ---------------------------------------------------------------------------
 * **These are server components.** They take strings and numbers and render
 * markup; the only client component in the file is the counter, imported into
 * `Stat`, and it renders its final value before it counts.
 */

/* -------------------------------------------------------------------------- */
/* The band at the top of an inner page                                       */
/* -------------------------------------------------------------------------- */

/**
 * What a page says about itself before anything else.
 *
 * ---------------------------------------------------------------------------
 * **Shorter than the home page's hero, and that is the point.** Somebody who
 * clicked "Services" has already decided what they want; a full-height band on
 * every page makes them scroll past the same furniture six times. This one is
 * about two-fifths of the height and carries three things: what page this is,
 * what it is for, and — where there is one worth printing — a fact that answers
 * the question they arrived with.
 *
 * **The heading is the `<h1>` and it comes from the business.** Not from this
 * file: `copy.pages.<page>.heading`, typed in the panel, which is what
 * `check:copy` asserts on the services page and what makes three clinics with
 * one codebase read as three businesses.
 */
export function PageBand({
  eyebrow,
  heading,
  intro,
  facts,
  children,
}: {
  eyebrow?: string | null;
  heading: string;
  intro?: string | null;

  /** Two or three numbers off the data. Anything without a number behind it is
      left out by the caller rather than printed as a zero. */
  facts?: { label: string; value: string }[];

  /** An action, where the page has an obvious next one. */
  children?: React.ReactNode;
}) {
  return (
    <section className="page-band">
      <div className="container-page py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            {eyebrow && (
              <p className="micro enter" style={{ "--enter": 0 } as React.CSSProperties}>
                {eyebrow}
              </p>
            )}

            {/*
              The clip is on the wrapper and the movement on the heading
              inside it, so the letters are cut off as they rise rather than
              sliding in from somewhere off the page. See `.mask-rise`.
            */}
            <span className="mask-rise mt-4 block">
              <h1
                className="font-display display-1 font-semibold"
                style={{ "--enter": 1 } as React.CSSProperties}
              >
                {heading}
              </h1>
            </span>

            {intro && (
              <p
                className="measure enter mt-5 text-lg leading-relaxed text-muted"
                style={{ "--enter": 2 } as React.CSSProperties}
              >
                {intro}
              </p>
            )}

            {children && (
              <div
                className="enter mt-7 flex flex-wrap gap-3"
                style={{ "--enter": 3 } as React.CSSProperties}
              >
                {children}
              </div>
            )}
          </div>

          {facts && facts.length > 0 && (
            <dl
              className="enter flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-6 lg:justify-end lg:border-0 lg:pt-0"
              style={{ "--enter": 3 } as React.CSSProperties}
            >
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted">{fact.label}</dt>
                  <dd className="font-display figure mt-1 text-2xl font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* A section heading, numbered                                                */
/* -------------------------------------------------------------------------- */

/**
 * The start of a band, said the same way every time.
 *
 * ---------------------------------------------------------------------------
 * **The number is the idea.** "01 — TREATMENTS" over a heading tells a reader
 * two things a bare heading cannot: that this is a sequence, and roughly how
 * far through it they are. It is what an annual report does and what a template
 * never does, it costs one line of markup, and it is the single cheapest way to
 * make a scroll feel like a document rather than a stack of cards.
 *
 * **The rule draws itself.** `data-reveal="draw"` scales it from its left edge
 * when the band is reached — so the section does not merely appear, it starts.
 */
export function SectionHead({
  index,
  label,
  heading,
  intro,
  action,
  align = "left",
}: {
  /** Its place in the sequence, from 1. Printed as 01, 02, 03. */
  index: number;
  label: string;
  heading: string;
  intro?: string | null;
  action?: { href: string; label: string };
  align?: "left" | "centre";
}) {
  const centred = align === "centre";

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-x-8 gap-y-4",
        centred ? "flex-col items-center text-center" : "justify-between",
      )}
    >
      <div className={cn("relative isolate min-w-0", centred && "flex flex-col items-center")}>
        {/*
          The same number again, set large and faint behind the heading.

          It is what a printed report does with a chapter, it is `aria-hidden`
          because the heading already says it, and it is gone below 768px where
          there is no margin to lose it in.
        */}
        <span className="chapter-mark font-display" aria-hidden>
          {String(index).padStart(2, "0")}
        </span>

        <p className="micro" data-reveal>
          <span className="index-num">{String(index).padStart(2, "0")}</span>
          {label}
        </p>

        {/*
          Risen out of a clipped box rather than faded in — and the clip is on
          this wrapper, never on the heading.

          `.mask-rise` would animate it on load, which is right for a first
          screen and wrong three bands down: the movement would be over before
          anybody reached it, which is the failure the reveal mechanism exists
          to fix. `data-reveal="mask"` is the same effect owed to the observer,
          and `globals.css` says why the wrapper is the observed element.
        */}
        <span className="mask-line mt-3" data-reveal="mask">
          <h2 className="font-display display-2 font-semibold">{heading}</h2>
        </span>

        {/*
          A rule rather than a border, so it can be drawn.

          `rule-accent` puts its dash above the heading as a `::before`, which
          cannot be animated independently of the text it belongs to. Here the
          rule is its own element under the heading, which is what lets it draw
          from the left as the band arrives.
        */}
        <span
          className="mt-4 block h-px w-24 bg-[linear-gradient(to_right,var(--accent),transparent)]"
          data-reveal="draw"
          aria-hidden
        />

        {intro && (
          <p className="measure mt-4 text-muted" data-reveal>
            {intro}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          data-reveal
        >
          {action.label}
          <ArrowRight className="arrow size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The small parts                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Initials, in the brand colour, where a photograph would be.
 *
 * A grey silhouette says "missing image"; two letters in the accent say the
 * business chose not to have one. Titles are stripped first, or every dentist
 * on the page has the monogram "DA".
 */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter((word) => !/^(dr|dr\.|mr|mr\.|mrs|ms|prof|prof\.)$/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "font-display grid shrink-0 place-items-center rounded-full font-semibold",
        /* A ring rather than a filled circle: at 48px a solid accent disc beside
           a name is a button that cannot be pressed. */
        "bg-accent-soft text-accent ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent)_28%,transparent)]",
        className ?? "size-12 text-base",
      )}
    >
      {initials}
    </span>
  );
}

/** The seven days, in the order a week is read, with the keys the rows store. */
const WEEK = [
  ["mon", "M"],
  ["tue", "T"],
  ["wed", "W"],
  ["thu", "T"],
  ["fri", "F"],
  ["sat", "S"],
  ["sun", "S"],
] as const;

/**
 * Which days somebody is in, in the width of a card.
 *
 * ---------------------------------------------------------------------------
 * **This is the detail that makes the site look like it was built for a
 * clinic.** Every clinic site lists its doctors; almost none says which
 * afternoons each one sits, so people ring to find out and are told to ring
 * back. Seven marks with the working days filled answers it at a glance, and
 * the hours themselves are still listed under it for anybody who needs the
 * times.
 *
 * The label spelled out for a screen reader, because "M T W T F S S" with two
 * of them highlighted is meaningless when it is read aloud.
 */
export function WeekStrip({ availability }: { availability: Record<string, string[]> }) {
  const days = WEEK.filter(([key]) => (availability[key] ?? []).length > 0);
  if (days.length === 0) return null;

  const spoken = days
    .map(([key]) => key[0].toUpperCase() + key.slice(1))
    .join(", ");

  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Usually in on ${spoken}`}>
      {WEEK.map(([key, letter], index) => (
        <span
          key={`${key}-${index}`}
          className="week-dot"
          data-in={(availability[key] ?? []).length > 0 ? "yes" : "no"}
          aria-hidden
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

/**
 * A number worth printing, counting up to itself when it is reached.
 *
 * The value is rendered by the server and the count is what happens to it
 * afterwards — see `Counter`. A statistic that starts at zero and waits for
 * script is a statistic that reads "0 years" to a crawler.
 */
export function Stat({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="font-display mt-1 text-2xl font-semibold">
        <Counter value={value} suffix={suffix} />
      </dd>
    </div>
  );
}

/** A small pill for a fact that is one word long — a qualification, a duration. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}
