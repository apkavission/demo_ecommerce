import type { Metadata } from "next";
import Link from "next/link";
import { getNavForAdmin } from "@/lib/admin-content";
import { AddNew, NavEditor } from "@/components/admin/content-editors";
import { requireAdmin } from "@/lib/auth";
import { listVariants } from "@/lib/variants";
import { BusinessPicker } from "@/components/admin/business-picker";

export const metadata: Metadata = { title: "Menu" };

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

  const items = await getNavForAdmin(variant.id);

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Menu</h1>
        <p className="measure mt-2 text-muted">The links across the top of the site, in the order they appear. Anything unticked stays here but is not shown.</p>
      </header>

      <BusinessPicker
        basePath="/admin/menu"
        variants={variants.map((entry) => ({ slug: entry.slug, name: entry.name }))}
        current={variant.slug}
      />

      <p className="mt-4 text-sm text-muted">
        Editing <strong className="font-semibold text-text">{variant.businessName}</strong>.{" "}
        <Link href={`/${variant.slug}`} target="_blank" className="text-accent hover:underline">
          Open the site
        </Link>
      </p>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <NavEditor
            key={item.id}
            variantId={variant.id}
            item={item}
            canMove={items.length > 1}
          />
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-sm text-muted">
          No menu yet, so the site shows only its own pages.
        </p>
      )}

      <div className="mt-6">
        <AddNew label="Add a link">
          <NavEditor variantId={variant.id} />
        </AddNew>
      </div>
    </div>
  );
}
