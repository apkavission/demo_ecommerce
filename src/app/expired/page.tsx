import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CalendarX2, Clock, Lock, MailQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SHARE_COOKIE } from "@/lib/supabase/constants";

export const metadata: Metadata = {
  title: "This link is no longer open",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Where a link that no longer works ends up.
 *
 * ---------------------------------------------------------------------------
 * **It used to say the same thing for every failure, and that was wrong.**
 *
 * The reasoning was sound as far as it went: telling somebody why a token was
 * refused tells a person guessing tokens which of their guesses are real. So
 * expired, revoked, used up and never-existed all came out as one paragraph.
 *
 * What it missed is who is actually standing here. Overwhelmingly it is the
 * client we sent the link to, whose fortnight ran out on Friday — and what they
 * were told was a vague sentence that could equally mean our site is broken.
 * That is the difference between a reply asking for a new link and a quiet
 * decision not to work with us.
 *
 * **So the line is drawn at the token rather than at the reason.** Somebody
 * holding a real token already has the only secret there is, and telling them
 * it expired on the 12th gives away nothing further. Somebody who typed the
 * address, or guessed, holds nothing — and gets exactly the paragraph they got
 * before, learning nothing at all.
 *
 * The token reaches this page in a ten-minute cookie scoped to this one path,
 * set by `proxy.ts`. Never in the address: `/expired?t=…` would write a live
 * secret into browser history and into the referrer of every link on this page.
 */

/** What the database said, in the words this page needs. */
type Verdict = {
  headline: string;
  body: string;
  detail: string | null;
  icon: "expired" | "closed" | "used" | "unknown";
};

const ICONS = {
  expired: CalendarX2,
  closed: Lock,
  used: Clock,
  unknown: MailQuestion,
} as const;

const A_DAY = { day: "numeric", month: "long", year: "numeric" } as const;

/**
 * The paragraph for somebody holding nothing.
 *
 * Deliberately the same for a typed address, a guessed token and a database we
 * could not reach: all three are "we cannot tell you anything about this", and
 * three different phrasings would be three things to learn from.
 */
const NOTHING: Verdict = {
  headline: "This link is no longer open",
  body: "Demonstration links work for a limited time, and this one has passed it — or it was closed early. Nothing has gone wrong at your end.",
  detail: null,
  icon: "unknown",
};

async function whatHappened(): Promise<Verdict> {
  const store = await cookies();
  const token = store.get(`${SHARE_COOKIE}-why`)?.value;

  if (!token) return NOTHING;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_state", { p_token: token });

  const state = data?.[0];
  if (error || !state || state.state === "unknown") return NOTHING;

  const business = state.business ? ` for ${state.business}` : "";

  if (state.state === "expired") {
    const on = state.expires_at
      ? new Date(state.expires_at).toLocaleDateString("en-IN", A_DAY)
      : null;

    return {
      headline: "This link has expired",
      body: `The demonstration${business} was open for a set length of time, and that time has passed. Nothing has gone wrong at your end, and nothing has been deleted — a new link opens the same thing again.`,
      detail: on ? `It stopped working on ${on}.` : null,
      icon: "expired",
    };
  }

  if (state.state === "revoked") {
    return {
      headline: "This link has been closed",
      body: `Someone at our end closed the link${business}. That is usually because a newer one was sent, or because it went to the wrong address — either way, asking will get you the right one.`,
      detail: null,
      icon: "closed",
    };
  }

  if (state.state === "used_up") {
    return {
      headline: "This link has been used up",
      body: `The link${business} was set to open a limited number of times, and it has reached it. Ask for another and we will open it again.`,
      detail: null,
      icon: "used",
    };
  }

  /* `live` — the link works and something else sent them here. Saying "this has
     expired" to somebody whose link is fine is the failure this page exists to
     avoid, so it says the honest thing instead. */
  return {
    headline: "We could not open that just now",
    body: "Your link is still valid. Something at our end could not answer for a moment — please try the link again, and if it happens twice, tell us.",
    detail: null,
    icon: "unknown",
  };
}

export default async function Expired() {
  const verdict = await whatHappened();
  const Icon = ICONS[verdict.icon];

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center shadow-sm sm:p-10">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon className="size-6" aria-hidden />
          </span>

          <h1 className="font-display mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            {verdict.headline}
          </h1>

          <p className="measure mx-auto mt-4 text-sm leading-relaxed text-muted sm:text-base">
            {verdict.body}
          </p>

          {verdict.detail && (
            <p className="mt-4 inline-block rounded-full bg-surface-2 px-4 py-1.5 text-xs font-medium sm:text-sm">
              {verdict.detail}
            </p>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm text-muted">Ask us for a fresh link</p>

            <a
              href="mailto:hello@apkavission.com"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              hello@apkavission.com
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Apka Saathi Private Limited
        </p>
      </div>
    </main>
  );
}
