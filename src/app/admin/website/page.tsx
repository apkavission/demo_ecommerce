import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BusinessPicker } from "@/components/admin/business-picker";
import { WebsiteEditor } from "@/components/admin/website-editor";
import { requireSuperAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { listVariants } from "@/lib/variants";

export const metadata: Metadata = { title: "Website" };

type Props = { searchParams: Promise<{ variant?: string }> };

/**
 * What a business *is*, in one screen.
 *
 * ---------------------------------------------------------------------------
 * **Everything on this screen already had a column and no way to reach it.**
 * The name, the headline, fourteen colours, the typeface, the corner radius,
 * the phone number in the footer, which mode the site opens in — all of it was
 * written once by a migration or by `clone_variant` and could only be changed
 * afterwards by somebody writing SQL. A demo whose name is set by a migration
 * is a template with a client's name typed into it.
 *
 * So this screen adds no column and needs no migration. It is the half of the
 * schema that was always meant to be edited.
 *
 * ---------------------------------------------------------------------------
 * **One business at a time**, chosen in the address like every other content
 * screen — a panel screen gets left open in a tab and sent to a colleague, and
 * a choice kept in memory gives both of them the wrong business.
 *
 * **The logo section is the Brand screen**, rendered here rather than copied.
 * `/admin/branding` still works and sends you here, so nothing that links to
 * it breaks.
 */
export default async function WebsitePage({ searchParams }: Props) {
  await requireSuperAdmin();

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

  /* The logo section needs the brand row's composed URLs and alt text, which
     `listVariants` does not carry — it reads the two logos for the header and
     nothing more. */
  const brand = (await getBranding()).find((row) => row.id === variant.id) ?? null;

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display display-2 font-semibold">Website</h1>
        <p className="measure mt-2 text-muted">
          What this business is called, how it looks and how it is reached.
          Everything here is saved to the business, not to the code, so two
          businesses in this demo can look nothing like each other.
        </p>
      </header>

      <BusinessPicker
        basePath="/admin/website"
        variants={variants.map((entry) => ({ slug: entry.slug, name: entry.name }))}
        current={variant.slug}
      />

      <p className="mt-4 text-sm text-muted">
        Editing <strong className="font-semibold text-text">{variant.businessName}</strong>.{" "}
        <Link
          href={`/${variant.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          Open the site
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </p>

      <WebsiteEditor
        business={{
          id: variant.id,
          slug: variant.slug,
          name: variant.name,
          industryLabel: variant.industryLabel,
          businessName: variant.businessName,
          tagline: variant.tagline,
          description: variant.description,
          /* Spread into plain records because the editor is a client component
             and the palette is fourteen controlled inputs rather than a typed
             shape it renders wholesale. */
          theme: {
            light: { ...variant.theme.light },
            dark: { ...variant.theme.dark },
            headingFont: variant.theme.headingFont,
            radius: variant.theme.radius,
          },
          contact: variant.contact,
          features: variant.features,
          copy: variant.copy,
          hero: variant.hero,
          defaultMode: variant.defaultMode,
          allowModeToggle: variant.allowModeToggle,
        }}
        brand={brand}
      />
    </div>
  );
}
