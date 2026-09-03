"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import { clearLogo, saveBranding, uploadLogo } from "@/lib/actions/branding";
import { idleState } from "@/lib/form-state";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import type { BrandRow } from "@/lib/branding";

/**
 * One business's brand.
 *
 * ---------------------------------------------------------------------------
 * **"The logo already has the name in it" is the field that matters most.**
 *
 * A mark on its own needs the business name printed beside it. A lockup — a
 * mark that already contains the name — must not have it printed again, and a
 * header that does is the single commonest way a site with a good logo looks
 * amateur. One tick box answers it, and the header reads it.
 */
export function BrandEditor({ business }: { business: BrandRow }) {
  const [state, action, pending] = useActionState(saveBranding, idleState);
  useBusyWhile(pending, "Saving brand");

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">{business.businessName}</h2>
          <p className="mt-0.5 text-sm text-muted">/{business.slug}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------ logos */}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Slot
          variantId={business.id}
          slot="light"
          title="On a light page"
          note="The everyday one. Dark ink, so it reads on white."
          image={business.light}
          backdrop="bg-white"
        />
        <Slot
          variantId={business.id}
          slot="dark"
          title="On a dark page"
          note="Light ink. Without this, the mark disappears in dark mode."
          image={business.dark}
          backdrop="bg-[#0b1120]"
        />
        <Slot
          variantId={business.id}
          slot="og"
          title="When the link is shared"
          note="What WhatsApp and LinkedIn show. 1200 × 630 is the shape they crop to."
          image={business.og}
          backdrop="bg-surface-2"
        />
      </div>

      {/* ------------------------------------------------------------ words */}

      <form action={action} className="mt-6 space-y-4 border-t border-border pt-6">
        <input type="hidden" name="variant_id" value={business.id} />

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="logo_shows_name"
            defaultChecked={business.logoShowsName}
            className="mt-0.5 size-4 rounded border-border"
          />
          <span>
            The logo already has the name in it
            <span className="mt-0.5 block text-xs text-muted">
              Tick this for a lockup, so the header does not print the name
              again beside a mark that already says it.
            </span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Title in a search result</span>
            <input
              name="meta_title"
              defaultValue={business.metaTitle ?? ""}
              placeholder={business.businessName}
              maxLength={70}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted">
              Around sixty characters. Empty uses the business name.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium">The sentence underneath</span>
            <input
              name="meta_description"
              defaultValue={business.metaDescription ?? ""}
              placeholder={business.tagline ?? "What this business does, in one line."}
              maxLength={180}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted">
              Around a hundred and fifty. Empty uses the tagline.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            Save
          </button>

          {state.status !== "idle" && (
            <p
              role="status"
              className={state.status === "error" ? "text-sm text-danger" : "text-sm text-muted"}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

/* ========================================================================== */

function Slot({
  variantId,
  slot,
  title,
  note,
  image,
  backdrop,
}: {
  variantId: string;
  slot: "light" | "dark" | "og";
  title: string;
  note: string;
  image: { url: string; alt: string } | null;
  backdrop: string;
}) {
  const [uploadState, upload, uploading] = useActionState(uploadLogo, idleState);
  const [, clear, clearing] = useActionState(clearLogo, idleState);

  useBusyWhile(uploading, "Uploading");
  useBusyWhile(clearing, "Removing");

  return (
    <div className="rounded-[var(--radius-card)] border border-border p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>

      {/*
        `object-contain`, never `object-cover`.

        The standing rule in this estate is that an uploaded image is never cut.
        A logo cropped to fill a preview box is a logo somebody approves and
        then finds trimmed on the live site.
      */}
      <div className={`mt-3 grid h-24 place-items-center overflow-hidden rounded-lg ${backdrop}`}>
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || title}
            width={240}
            height={96}
            unoptimized
            className="max-h-20 w-auto object-contain"
          />
        ) : (
          <span className="text-xs text-muted">Nothing yet</span>
        )}
      </div>

      <form action={upload} className="mt-3 space-y-2">
        <input type="hidden" name="variant_id" value={variantId} />
        <input type="hidden" name="slot" value={slot} />
        <input
          type="text"
          name="alt"
          placeholder="What it shows, for a screen reader"
          maxLength={120}
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
        />

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-surface-2">
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-3.5" aria-hidden />
          )}
          Choose a file
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
            className="sr-only"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
        </label>
      </form>

      {uploadState.status === "error" && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {uploadState.message}
        </p>
      )}

      {image && (
        <form action={clear} className="mt-2">
          <input type="hidden" name="variant_id" value={variantId} />
          <input type="hidden" name="slot" value={slot} />
          <button
            type="submit"
            disabled={clearing}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-danger disabled:opacity-60"
          >
            <Trash2 className="size-3" aria-hidden />
            Take it off
          </button>
        </form>
      )}
    </div>
  );
}
