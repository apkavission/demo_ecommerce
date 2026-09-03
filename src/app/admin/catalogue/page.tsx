import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddProduct, ProductRowEditor } from "@/components/admin/editors";
import { isManager, requireAdmin } from "@/lib/auth";
import { getCollections, getProducts, listVariants } from "@/lib/variants";

export const metadata: Metadata = { title: "Catalogue" };

type Props = { searchParams: Promise<{ shop?: string }> };

/**
 * What each shop sells.
 *
 * **A manager's screen.** Somebody packing orders can read the catalogue
 * everywhere else in the panel and cannot reach this — a pricing mistake made
 * while packing is a mistake nobody is looking for.
 *
 * **One shop at a time, chosen by a link.** Three shops of stock in one list is
 * a list nobody can scan, and `?shop=fashion` is an address somebody can send to
 * a colleague. A dropdown holding the same state in JavaScript is neither.
 */
export default async function CataloguePage({ searchParams }: Props) {
  await requireAdmin();

  if (!(await isManager())) notFound();

  const { shop } = await searchParams;

  const variants = await listVariants();
  const current = variants.find((entry) => entry.slug === shop) ?? variants[0];

  if (!current) {
    return (
      <div className="container-page py-10">
        <p className="rounded-[var(--radius-card)] border border-dashed border-border p-12 text-center text-sm text-muted">
          No shops exist yet. A super admin adds the first one.
        </p>
      </div>
    );
  }

  const [products, collections] = await Promise.all([
    getProducts(current.id),
    getCollections(current.id),
  ]);

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Catalogue</h1>
          <p className="mt-2 text-muted">
            {products.length} in {current.businessName}. Empty stock means
            uncounted; zero means sold out on the site right now.
          </p>
        </div>

        <AddProduct variantId={current.id} collections={collections} />
      </header>

      {variants.length > 1 && (
        <nav aria-label="Shops" className="mt-8 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <a
              key={variant.id}
              href={`/admin/catalogue?shop=${variant.slug}`}
              aria-current={variant.id === current.id ? "page" : undefined}
              className={
                variant.id === current.id
                  ? "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg"
                  : "rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
              }
            >
              {variant.businessName}
            </a>
          ))}
        </nav>
      )}

      <ul className="mt-8 card px-6">
        {products.map((product) => (
          <ProductRowEditor
            key={product.id}
            product={product}
            collections={collections}
            symbol={current.currencySymbol}
          />
        ))}
      </ul>

      {products.length === 0 && (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-12 text-center text-sm text-muted">
          Nothing in this shop yet.
        </p>
      )}
    </div>
  );
}
