import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listVariants } from "@/lib/variants";
import { getPagesForAdmin } from "@/lib/pages";
import { getMediaForAdmin } from "@/lib/admin-content";
import { BusinessPicker } from "@/components/admin/business-picker";
import { AddPage, PageEditor } from "@/components/admin/page-editor";

export const metadata: Metadata = { title: "Pages" };

type Props = { searchParams: Promise<{ variant?: string }> };

/**
 * Pages a business writes for itself.
 *
 * Everything a demo ships with — the menu, the people, the questions — has a
 * screen of its own. This is for the page that was not thought of: "Insurance
 * we accept", "Our story", "Careers". A prospect asks for one of those in the
 * first meeting, every time.
 */
export default async function PagesPage({ searchParams }: Props) {
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

  const [pages, media] = await Promise.all([
    getPagesForAdmin(variant.id),
    getMediaForAdmin(),
  ]);

  const pictures = media.map((item) => ({
    id: item.id,
    url: item.url,
    filename: item.filename,
  }));

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Pages</h1>
        <p className="measure mt-2 text-muted">
          Anything beyond the pages this demo already has. Each one is bands down
          the screen — words, words beside a picture, or a picture with the words
          over it.
        </p>
      </header>

      <BusinessPicker
        basePath="/admin/pages"
        variants={variants.map((entry) => ({ slug: entry.slug, name: entry.name }))}
        current={variant.slug}
      />

      <p className="mt-4 text-sm text-muted">
        Editing <strong className="font-semibold text-text">{variant.businessName}</strong>.{" "}
        <Link href={"/" + variant.slug} target="_blank" className="text-accent hover:underline">
          Open the site
        </Link>
      </p>

      <div className="mt-8 space-y-6">
        {pages.map((page) => (
          <PageEditor
            key={page.id}
            variantId={variant.id}
            variantSlug={variant.slug}
            page={page}
            pictures={pictures}
          />
        ))}
      </div>

      {pages.length === 0 && (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-sm text-muted">
          No pages of its own yet.
        </p>
      )}

      <div className="mt-6">
        <AddPage>
          <PageEditor variantId={variant.id} variantSlug={variant.slug} pictures={pictures} />
        </AddPage>
      </div>
    </div>
  );
}
