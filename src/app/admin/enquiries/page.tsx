import type { Metadata } from "next";
import Link from "next/link";
import { getMessagesForAdmin } from "@/lib/admin-content";
import { MarkRead } from "@/components/admin/content-editors";
import { requireAdmin } from "@/lib/auth";
import { listVariants } from "@/lib/variants";
import { BusinessPicker } from "@/components/admin/business-picker";

export const metadata: Metadata = { title: "Enquiries" };

type Props = { searchParams: Promise<{ variant?: string }> };

export default async function Page({ searchParams }: Props) {
  await requireAdmin();

  const { variant: wanted } = await searchParams;
  const variants = await listVariants();
  const variant = variants.find((entry) => entry.slug === wanted) ?? variants[0];

  if (!variant) {
    return (
      <div className="container-page py-10">
        <p className="rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-muted">
          There are no businesses yet.
        </p>
      </div>
    );
  }

  const messages = await getMessagesForAdmin(variant.id);
  const unread = messages.filter((message) => !message.isRead).length;

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Enquiries</h1>
        <p className="measure mt-2 text-muted">Everything sent through the forms on the site. Unanswered ones sit at the top, whatever day they arrived.</p>
      </header>

      <BusinessPicker
        basePath="/admin/enquiries"
        variants={variants.map((entry) => ({ slug: entry.slug, name: entry.name }))}
        current={variant.slug}
      />

      <p className="mt-4 text-sm text-muted">
        Editing <strong className="font-semibold text-text">{variant.businessName}</strong>.{" "}
        <Link href={`/${variant.slug}`} target="_blank" className="text-accent hover:underline">
          Open the site
        </Link>
      </p>

      {unread > 0 && (
        <p className="mt-6 inline-flex rounded-full bg-accent-soft px-4 py-1.5 text-sm font-semibold text-accent">
          {unread} not read yet
        </p>
      )}

      <div className="mt-8 space-y-3">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`card p-5 ${message.isRead ? "" : "border-accent/40"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{message.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {[message.email, message.phone].filter(Boolean).join(" · ") || "No way back given"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <time
                  dateTime={message.createdAt}
                  className="text-xs text-muted"
                  suppressHydrationWarning
                >
                  {new Date(message.createdAt).toLocaleString()}
                </time>
                {!message.isRead && <MarkRead id={message.id} />}
              </div>
            </div>

            <p className="measure mt-3 whitespace-pre-wrap text-sm">{message.body}</p>
          </article>
        ))}
      </div>

      {messages.length === 0 && (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-sm text-muted">
          Nothing has come in yet.
        </p>
      )}
    </div>
  );
}
