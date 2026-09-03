import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBands } from "@/components/site/page-bands";
import { getPage } from "@/lib/pages";
import { getVariant } from "@/lib/variants";

type Props = { params: Promise<{ variant: string; slug: string }> };

/**
 * Any page a business made for itself.
 *
 * ---------------------------------------------------------------------------
 * **Why this does not shadow the pages that ship with the demo.** Next resolves
 * a static segment before a dynamic one, so `/school/courses` reaches the
 * courses file and never arrives here. The panel refuses those slugs as well,
 * so nobody can save a page that would be written and never rendered.
 *
 * ---------------------------------------------------------------------------
 * **A draft is a 404, not a preview.** Row security returns nothing for one,
 * and this says the same thing the router would say for an address that was
 * never made — which is the truth as far as anybody without the panel is
 * concerned.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: slug, slug: pageSlug } = await params;
  const variant = await getVariant(slug);

  if (!variant) return {};

  const page = await getPage(variant.id, pageSlug);

  if (!page) return {};

  return {
    title: page.metaTitle?.trim() || page.title,
    description: page.metaDescription?.trim() || page.summary || undefined,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function CustomPage({ params }: Props) {
  const { variant: slug, slug: pageSlug } = await params;
  const variant = await getVariant(slug);

  if (!variant) notFound();

  const page = await getPage(variant.id, pageSlug);

  if (!page) notFound();

  return (
    <article className="py-16 md:py-24">
      <header className="container-page">
        <h1 className="font-display display-1 font-semibold tracking-tight">{page.title}</h1>
        {page.summary && <p className="measure mt-4 text-lg text-muted">{page.summary}</p>}
      </header>

      <PageBands sections={page.sections} />
    </article>
  );
}
