import type { Metadata } from "next";
import { Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "This link is no longer open",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Where a link that no longer works ends up.
 *
 * **One screen for every kind of failure** — expired, revoked, used up, never
 * existed, or a private demo somebody found the address of. Telling them apart
 * would tell somebody probing which links are real, and it is worth nothing to
 * an honest visitor: their link does not work either way, and what they need is
 * a person rather than a diagnosis.
 *
 * So it says what happened in the most likely terms, and gives them the one
 * thing that helps: a way to ask for a new one.
 */
export default function Expired() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Clock className="size-5" aria-hidden />
        </span>

        <h1 className="font-display mt-6 text-2xl font-semibold tracking-tight">
          This link is no longer open
        </h1>

        <p className="measure mx-auto mt-3 text-sm leading-relaxed text-muted">
          Demonstration links are set to work for a limited time, and this one
          has passed it — or it was closed early. Nothing has gone wrong at your
          end.
        </p>

        <p className="mt-6 text-sm">
          Ask whoever sent it for a fresh link, or write to{" "}
          <a
            href="mailto:hello@apkavission.com"
            className="font-medium text-accent hover:underline"
          >
            hello@apkavission.com
          </a>{" "}
          and we will open a new one.
        </p>

        <p className="mt-10 text-xs text-muted">
          Apka Saathi Private Limited
        </p>
      </div>
    </main>
  );
}
