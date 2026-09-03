"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { BrandSpinner } from "@/components/brand/brand-loader";
import {
  addPageToMenu,
  deletePage,
  deleteSection,
  moveSection,
  savePage,
  saveSection,
} from "@/lib/actions/pages";
import { RESERVED_SLUGS, type AdminPageRow } from "@/lib/pages";
import { idleState } from "@/lib/form-state";
import { useBusyWhile } from "@/components/forms/use-busy-while";
import { cn } from "@/lib/utils";

/**
 * A page, and the bands that make it.
 *
 * ---------------------------------------------------------------------------
 * **The address is shown as it will be, while it is being typed.** A slug is
 * derived from the title unless somebody overrides it, and the derivation
 * happens in two places — here for the preview, and on the server for the
 * value that is stored. They must agree, so the rule is the same three lines
 * in both, and it is deliberately a dull rule: lowercase, letters and digits,
 * everything else becomes a hyphen.
 *
 * ---------------------------------------------------------------------------
 * **A reserved address is refused before the save, not after.** Every demo has
 * six or seven pages of its own, and a page saved at one of those slugs would
 * be stored, published, listed here and never rendered — the router answers
 * with the file. Saying so while somebody types is the difference between a
 * rule and a trap.
 */

const FIELD =
  "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const LABEL = "block text-xs font-medium text-muted";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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

function TwoPress({
  action,
  pending,
  children,
  hidden,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  children: React.ReactNode;
  hidden: React.ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={action} className="inline">
      {hidden}
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
        {armed ? "Really?" : children}
      </button>
    </form>
  );
}

/* ============================================================ the page == */

export function PageEditor({
  variantId,
  variantSlug,
  page,
  pictures,
}: {
  variantId: string;
  variantSlug: string;
  page?: AdminPageRow;
  pictures: { id: string; url: string; filename: string }[];
}) {
  const [state, action, pending] = useActionState(savePage, idleState);
  const [removeState, remove, removing] = useActionState(deletePage, idleState);

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");

  useBusyWhile(pending, page ? "Saving" : "Making the page");
  useBusyWhile(removing, "Removing");

  const address = slugify(slug || title);
  const clash = (RESERVED_SLUGS as readonly string[]).includes(address);

  return (
    <section className="card p-6">
      <form action={action}>
        <input type="hidden" name="variant_id" value={variantId} />
        {page && <input type="hidden" name="id" value={page.id} />}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className={LABEL}>What the page is called</span>
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              placeholder="Our story"
              className={cn(FIELD, "mt-1")}
            />
          </label>

          <label className="text-sm">
            <span className={LABEL}>Its address</span>
            <input
              name="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={60}
              placeholder={slugify(title) || "our-story"}
              className={cn(FIELD, "mt-1 font-mono text-xs")}
            />
            <span
              className={cn(
                "mt-1 block text-xs",
                clash ? "font-medium text-red-600 dark:text-red-400" : "text-muted",
              )}
            >
              {clash
                ? "This demo already has a page at that address. Choose another."
                : address
                  ? "/" + variantSlug + "/" + address
                  : "Taken from the name unless you set one."}
            </span>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className={LABEL}>The line under the heading</span>
          <input
            name="summary"
            defaultValue={page?.summary ?? ""}
            maxLength={400}
            className={cn(FIELD, "mt-1")}
          />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className={LABEL}>Shown on the site</span>
            <select
              name="status"
              defaultValue={page?.status ?? "draft"}
              className={cn(FIELD, "mt-1")}
            >
              <option value="published">Yes — published</option>
              <option value="draft">Not yet — draft</option>
            </select>
          </label>

          <label className="text-sm">
            <span className={LABEL}>Title in a search result</span>
            <input
              name="meta_title"
              defaultValue={page?.metaTitle ?? ""}
              maxLength={70}
              placeholder={title || "The page's name"}
              className={cn(FIELD, "mt-1")}
            />
          </label>

          <label className="text-sm">
            <span className={LABEL}>The sentence underneath</span>
            <input
              name="meta_description"
              defaultValue={page?.metaDescription ?? ""}
              maxLength={180}
              className={cn(FIELD, "mt-1")}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Save pending={pending || clash}>{page ? "Save" : "Make the page"}</Save>
          <Message state={state} />

          {page && page.status === "published" && (
            <Link
              href={"/" + variantSlug + "/" + page.slug}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Open it
            </Link>
          )}

          {page && <InMenu page={page} />}

          {page && (
            <span className="ml-auto">
              <TwoPress
                action={remove}
                pending={removing}
                hidden={<input type="hidden" name="id" value={page.id} />}
              >
                Remove the page
              </TwoPress>
            </span>
          )}
        </div>

        <Message state={removeState} />
      </form>

      {/* ------------------------------------------------------------ bands */}

      {page && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold">
            What is on it
            <span className="ml-2 font-normal text-muted">{page.sections.length}</span>
          </h3>

          <div className="mt-4 space-y-3">
            {page.sections.map((section) => (
              <SectionEditor
                key={section.id}
                pageId={page.id}
                section={section}
                pictures={pictures}
                canMove={page.sections.length > 1}
              />
            ))}
          </div>

          <div className="mt-4">
            <AddBand>
              <SectionEditor pageId={page.id} pictures={pictures} />
            </AddBand>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Whether the site's menu points at this page, and one press if it does not.
 *
 * A page that is published and unlinked is not obviously broken — it is worse
 * than that, it is invisible. Saying so on the page's own row, next to the link
 * that opens it, is the only place somebody would look.
 */
function InMenu({ page }: { page: AdminPageRow }) {
  const [state, action, pending] = useActionState(addPageToMenu, idleState);
  useBusyWhile(pending, "Adding to the menu");

  if (page.inMenu) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <Check className="size-3.5" aria-hidden />
        In the menu
      </span>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={page.id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        {pending ? <BrandSpinner className="size-3.5" /> : <Link2 className="size-3.5" aria-hidden />}
        {pending ? "Adding…" : "Add to the menu"}
      </button>
      <Message state={state} />
    </form>
  );
}

/* =========================================================== one band == */

function MoveButton({ id, direction }: { id: string; direction: "up" | "down" }) {
  const [, action, pending] = useActionState(moveSection, idleState);
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

const LAYOUTS = [
  { value: "text", label: "Words across the page" },
  { value: "image_right", label: "Words, picture on the right" },
  { value: "image_left", label: "Picture on the left, words" },
  { value: "banner", label: "Picture with the words over it" },
] as const;

function SectionEditor({
  pageId,
  section,
  pictures,
  canMove,
}: {
  pageId: string;
  section?: {
    id: string;
    heading: string | null;
    body: string | null;
    layout: string;
    image: { url: string; alt: string } | null;
  };
  pictures: { id: string; url: string; filename: string }[];
  canMove?: boolean;
}) {
  const [state, action, pending] = useActionState(saveSection, idleState);
  const [removeState, remove, removing] = useActionState(deleteSection, idleState);
  const [layout, setLayout] = useState(section?.layout ?? "text");

  useBusyWhile(pending, section ? "Saving" : "Adding");
  useBusyWhile(removing, "Removing");

  const wantsPicture = layout !== "text";

  return (
    <div className="rounded-[var(--radius-card)] border border-border p-4">
      <div className="flex items-start gap-3">
        {canMove && section && (
          <div className="flex flex-col gap-1.5">
            <MoveButton id={section.id} direction="up" />
            <MoveButton id={section.id} direction="down" />
          </div>
        )}

        <form action={action} className="min-w-0 flex-1">
          <input type="hidden" name="page_id" value={pageId} />
          {section && <input type="hidden" name="id" value={section.id} />}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className={LABEL}>Heading</span>
              <input
                name="heading"
                defaultValue={section?.heading ?? ""}
                maxLength={160}
                className={cn(FIELD, "mt-1")}
              />
            </label>

            <label className="text-sm">
              <span className={LABEL}>How it sits</span>
              <select
                name="layout"
                value={layout}
                onChange={(event) => setLayout(event.target.value)}
                className={cn(FIELD, "mt-1")}
              >
                {LAYOUTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className={LABEL}>The words</span>
            <textarea
              name="body"
              defaultValue={section?.body ?? ""}
              rows={4}
              maxLength={4000}
              className={cn(FIELD, "mt-1 resize-y")}
            />
            <span className="mt-1 block text-xs text-muted">
              A blank line starts a new paragraph.
            </span>
          </label>

          {wantsPicture && (
            <label className="mt-3 block text-sm">
              <span className={LABEL}>The picture</span>
              <select
                name="image_id"
                defaultValue={pictures.find((p) => p.url === section?.image?.url)?.id ?? ""}
                className={cn(FIELD, "mt-1")}
              >
                <option value="">None yet</option>
                {pictures.map((picture) => (
                  <option key={picture.id} value={picture.id}>
                    {picture.filename}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                Uploaded on the Pictures screen. Without one, this band shows its
                words alone.
              </span>
            </label>
          )}

          {section?.image && (
            <div className="mt-3 grid h-28 place-items-center overflow-hidden rounded-lg bg-surface-2 p-2">
              <Image
                src={section.image.url}
                alt={section.image.alt}
                width={320}
                height={112}
                unoptimized
                className="max-h-full w-auto object-contain"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Save pending={pending}>{section ? "Save" : "Add"}</Save>
            <Message state={state} />

            {section && (
              <span className="ml-auto">
                <TwoPress
                  action={remove}
                  pending={removing}
                  hidden={<input type="hidden" name="id" value={section.id} />}
                >
                  Remove
                </TwoPress>
              </span>
            )}
          </div>

          <Message state={removeState} />
        </form>
      </div>
    </div>
  );
}

/** Folded away until it is wanted. */
export function AddBand({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-5 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-4" aria-hidden />
        Add a band
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

/** A page that is not there yet. */
export function AddPage({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-5 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-4" aria-hidden />
        Make a page
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
