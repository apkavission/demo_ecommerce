"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, Upload } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import {
  deleteMedia,
  deleteRow,
  describeMedia,
  markRead,
  moveNavItem,
  saveFaq,
  saveNavItem,
  saveTestimonial,
  uploadMedia,
} from "@/lib/actions/content";
import { idleState } from "@/lib/form-state";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { cn } from "@/lib/utils";

/**
 * The rest of a site, edited a row at a time.
 *
 * ---------------------------------------------------------------------------
 * **A row that saves itself, rather than a page that saves forty.** Content is
 * corrected one line at a time — a question worded badly, a quote with a typo —
 * and one Save covering the whole screen makes every correction a chance to
 * change something nobody meant to.
 *
 * ---------------------------------------------------------------------------
 * **Every button says what it is doing while it does it.** A form that looks
 * identical for the second it is saving is a form people press twice.
 */

const FIELD =
  "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const LABEL = "block text-xs font-medium text-muted";

function Message({ state }: { state: { status: string; message?: string } }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-sm",
        state.status === "error" ? "text-red-600 dark:text-red-400" : "text-muted",
      )}
    >
      {state.message}
    </p>
  );
}

function Save({ pending, children = "Save" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending && <BrandSpinner className="size-4" />}
      {pending ? "Saving…" : children}
    </button>
  );
}

/**
 * Taking a row away.
 *
 * **Two presses, without a dialog.** A confirm box is dismissed by reflex; a
 * button that changes into "Really?" and back after a moment is not, and it
 * does not steal the keyboard from somebody halfway through a sentence.
 */
function Remove({ table, id }: { table: string; id: string }) {
  const [state, action, pending] = useActionState(deleteRow, idleState);
  const [armed, setArmed] = useState(false);

  useBusyWhile(pending, "Removing");

  return (
    <form action={action} className="inline">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button
        type={armed ? "submit" : "button"}
        onClick={() => {
          if (armed) return;
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
        }}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
          armed
            ? "bg-red-600 font-semibold text-white"
            : "text-muted hover:bg-surface-2 hover:text-red-600",
        )}
      >
        {pending ? <BrandSpinner className="size-3" /> : <Trash2 className="size-3.5" aria-hidden />}
        {armed ? "Really?" : "Remove"}
      </button>
      {state.status === "error" && (
        <span role="alert" className="ml-2 text-xs text-red-600">
          {state.message}
        </span>
      )}
    </form>
  );
}

/** Draft or published, said in words rather than in a colour alone. */
function StatusField({ value }: { value: string }) {
  return (
    <label className="text-sm">
      <span className={LABEL}>Shown on the site</span>
      <select name="status" defaultValue={value} className={cn(FIELD, "mt-1")}>
        <option value="published">Yes — published</option>
        <option value="draft">Not yet — draft</option>
      </select>
    </label>
  );
}

/* ======================================================= enquiries ====== */

/**
 * One enquiry, marked as seen.
 *
 * Here rather than in the inbox component, because the shop demo has no such
 * file — its panel grew around orders instead. One component every demo has
 * beats one that five of them have and the sixth reimplements.
 */
export function MarkRead({ id }: { id: string }) {
  const [state, action, pending] = useActionState(markRead, idleState);
  useBusyWhile(pending, "Marking");

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {pending ? <BrandSpinner className="size-3.5" /> : <Check className="size-3.5" aria-hidden />}
        {pending ? "Marking…" : "Mark read"}
      </button>
      {state.status === "error" && state.message && (
        <span role="alert" className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.message}
        </span>
      )}
    </form>
  );
}

/* ==================================================== testimonials ====== */

export function TestimonialEditor({
  variantId,
  testimonial,
}: {
  variantId: string;
  testimonial?: {
    id: string;
    author: string;
    roleLabel: string | null;
    quote: string;
    rating: number | null;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState(saveTestimonial, idleState);
  useBusyWhile(pending, testimonial ? "Saving" : "Adding");

  const isNew = !testimonial;

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="variant_id" value={variantId} />
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <span className={LABEL}>Who said it</span>
          <input
            name="author"
            defaultValue={testimonial?.author ?? ""}
            required
            maxLength={160}
            className={cn(FIELD, "mt-1")}
          />
        </label>

        <label className="text-sm">
          <span className={LABEL}>What they are to you</span>
          <input
            name="role_label"
            defaultValue={testimonial?.roleLabel ?? ""}
            placeholder="Parent, patient, guest…"
            maxLength={160}
            className={cn(FIELD, "mt-1")}
          />
        </label>

        <label className="text-sm">
          <span className={LABEL}>Stars</span>
          <select
            name="rating"
            defaultValue={testimonial?.rating ? String(testimonial.rating) : ""}
            className={cn(FIELD, "mt-1")}
          >
            <option value="">Not said</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className={LABEL}>Their words</span>
        <textarea
          name="quote"
          defaultValue={testimonial?.quote ?? ""}
          required
          rows={3}
          maxLength={1200}
          className={cn(FIELD, "mt-1 resize-y")}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-56">
          <StatusField value={testimonial?.status ?? "published"} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Message state={state} />
          <Save pending={pending}>{isNew ? "Add" : "Save"}</Save>
          {testimonial && <Remove table="testimonials" id={testimonial.id} />}
        </div>
      </div>
    </form>
  );
}

/* ============================================================ faqs ====== */

export function FaqEditor({
  variantId,
  faq,
}: {
  variantId: string;
  faq?: { id: string; question: string; answer: string; status: string };
}) {
  const [state, action, pending] = useActionState(saveFaq, idleState);
  useBusyWhile(pending, faq ? "Saving" : "Adding");

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="variant_id" value={variantId} />
      {faq && <input type="hidden" name="id" value={faq.id} />}

      <label className="block text-sm">
        <span className={LABEL}>The question, as somebody would ask it</span>
        <input
          name="question"
          defaultValue={faq?.question ?? ""}
          required
          maxLength={300}
          className={cn(FIELD, "mt-1")}
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className={LABEL}>The answer</span>
        <textarea
          name="answer"
          defaultValue={faq?.answer ?? ""}
          required
          rows={3}
          maxLength={2000}
          className={cn(FIELD, "mt-1 resize-y")}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-56">
          <StatusField value={faq?.status ?? "published"} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Message state={state} />
          <Save pending={pending}>{faq ? "Save" : "Add"}</Save>
          {faq && <Remove table="faqs" id={faq.id} />}
        </div>
      </div>
    </form>
  );
}

/* ======================================================== the menu ====== */

function MoveButton({ id, direction }: { id: string; direction: "up" | "down" }) {
  const [, action, pending] = useActionState(moveNavItem, idleState);
  useBusyWhile(pending, "Moving");

  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={pending}
        aria-label={direction === "up" ? "Move up" : "Move down"}
        className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-60"
      >
        {pending ? <BrandSpinner className="size-3.5" /> : <Icon className="size-4" aria-hidden />}
      </button>
    </form>
  );
}

export function NavEditor({
  variantId,
  item,
  canMove,
}: {
  variantId: string;
  item?: { id: string; label: string; href: string; isActive: boolean };
  canMove?: boolean;
}) {
  const [state, action, pending] = useActionState(saveNavItem, idleState);
  useBusyWhile(pending, item ? "Saving" : "Adding");

  return (
    <div className="card flex flex-wrap items-end gap-4 p-4">
      {canMove && item && (
        <div className="flex gap-1.5 pb-1">
          <MoveButton id={item.id} direction="up" />
          <MoveButton id={item.id} direction="down" />
        </div>
      )}

      <form action={action} className="flex flex-1 flex-wrap items-end gap-4">
        <input type="hidden" name="variant_id" value={variantId} />
        {item && <input type="hidden" name="id" value={item.id} />}

        <label className="min-w-40 flex-1 text-sm">
          <span className={LABEL}>What it says</span>
          <input
            name="label"
            defaultValue={item?.label ?? ""}
            required
            maxLength={60}
            className={cn(FIELD, "mt-1")}
          />
        </label>

        <label className="min-w-48 flex-1 text-sm">
          <span className={LABEL}>Where it goes</span>
          <input
            name="href"
            defaultValue={item?.href ?? "/"}
            required
            maxLength={200}
            placeholder="/about"
            className={cn(FIELD, "mt-1 font-mono text-xs")}
          />
        </label>

        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={item?.isActive ?? true}
            className="size-4 rounded border-border"
          />
          Shown
        </label>

        <div className="flex items-center gap-3 pb-1">
          <Save pending={pending}>{item ? "Save" : "Add"}</Save>
          {item && <Remove table="nav_items" id={item.id} />}
        </div>
      </form>

      <div className="w-full">
        <Message state={state} />
      </div>
    </div>
  );
}

/* =========================================================== media ====== */

export function MediaUpload() {
  const [state, action, pending] = useActionState(uploadMedia, idleState);
  useBusyWhile(pending, "Uploading");

  return (
    <form action={action} className="card flex flex-wrap items-end gap-4 p-5">
      <label className="min-w-56 flex-1 text-sm">
        <span className={LABEL}>What it shows, for somebody who cannot see it</span>
        <input
          name="alt"
          maxLength={160}
          placeholder="A dentist's chair in a bright room"
          className={cn(FIELD, "mt-1")}
        />
      </label>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-surface-2">
        {pending ? <BrandSpinner className="size-4" /> : <Upload className="size-4" aria-hidden />}
        {pending ? "Uploading…" : "Choose a picture"}
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
          className="sr-only"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
      </label>

      <div className="w-full">
        <Message state={state} />
      </div>
    </form>
  );
}

export function MediaTile({
  item,
}: {
  item: {
    id: string;
    url: string;
    filename: string;
    alt: string;
    storageKey: string;
    usedBy: string[];
  };
}) {
  const [describeState, describe, describing] = useActionState(describeMedia, idleState);
  const [deleteState, remove, removing] = useActionState(deleteMedia, idleState);
  const [armed, setArmed] = useState(false);

  useBusyWhile(describing, "Saving");
  useBusyWhile(removing, "Removing");

  return (
    <div className="card overflow-hidden">
      {/*
        Contained, never covered.

        A library that crops its own thumbnails is a library where somebody
        picks the wrong picture, because the part that identified it was the
        part cut off.
      */}
      <div className="grid h-40 place-items-center bg-surface-2 p-3">
        <Image
          src={item.url}
          alt={item.alt || item.filename}
          width={320}
          height={160}
          unoptimized
          className="max-h-full w-auto object-contain"
        />
      </div>

      <div className="p-4">
        <p className="truncate text-xs text-muted" title={item.filename}>
          {item.filename}
        </p>

        <form action={describe} className="mt-2 flex gap-2">
          <input type="hidden" name="id" value={item.id} />
          <input
            name="alt"
            defaultValue={item.alt}
            maxLength={160}
            placeholder="What it shows"
            className={cn(FIELD, "text-xs")}
          />
          <button
            type="submit"
            disabled={describing}
            className="shrink-0 rounded-lg border border-border px-3 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            {describing ? <BrandSpinner className="size-3.5" /> : "Save"}
          </button>
        </form>

        <Message state={describeState} />

        <div className="mt-3 flex items-center justify-between gap-2">
          {item.usedBy.length > 0 ? (
            <p className="text-xs text-muted">
              Used by {item.usedBy.join(", ")}
            </p>
          ) : (
            <form action={remove}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="storage_key" value={item.storageKey} />
              <button
                type={armed ? "submit" : "button"}
                onClick={() => {
                  if (armed) return;
                  setArmed(true);
                  setTimeout(() => setArmed(false), 4000);
                }}
                disabled={removing}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-60",
                  armed
                    ? "bg-red-600 font-semibold text-white"
                    : "text-muted hover:bg-surface-2 hover:text-red-600",
                )}
              >
                {removing ? (
                  <BrandSpinner className="size-3" />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                {armed ? "Really?" : "Remove"}
              </button>
            </form>
          )}
        </div>

        <Message state={deleteState} />
      </div>
    </div>
  );
}

/**
 * A row that is not there yet.
 *
 * Folded away until it is wanted, because an empty form permanently open at the
 * bottom of a list of forms is one more thing to scroll past and one more thing
 * to submit by accident.
 */
export function AddNew({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-5 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-4" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <div>
      {children}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-muted hover:text-text"
      >
        Never mind
      </button>
    </div>
  );
}
