import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Spotlight } from "@/components/site/motion";
import { ProductCard } from "@/components/site/product";
import { PageBand } from "@/components/site/ui";
import { getCollections, getOptionsFor, getProducts, getVariant } from "@/lib/variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

type Props = {
  params: Promise<{ variant: string }>;
  searchParams: Promise<{ in?: string }>;
};

/**
 * Everything the shop sells.
 *
 * **Filtering is a link, not a control.** `?in=shirts` is an address somebody
 * can send, bookmark and go back to; a dropdown holding the same state in
 * JavaScript is none of those things, and the back button does the wrong thing
 * with it.
 *
 * **A collection with nothing in it is not shown.** An empty category is a dead
 * end that makes a shop feel abandoned, and the fix — hide it until something is
 * in it — costs one filter.
 */
export default async function ShopPage({ params, searchParams }: Props) {
  const { variant: slug } = await params;
  const { in: filter } = await searchParams;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  const [products, collections] = await Promise.all([
    getProducts(variant.id),
    getCollections(variant.id),
  ]);

  const live = products.filter((product) => product.status === "published");

  const chosen = collections.find((collection) => collection.slug === filter) ?? null;
  const shown = chosen
    ? live.filter((product) => product.collection_id === chosen.id)
    : live;

  const options = await getOptionsFor(shown.map((product) => product.id));
  const base = `/${variant.slug}`;

  const withStock = collections.filter((collection) =>
    live.some((product) => product.collection_id === collection.id),
  );

  /* This page's own title and opening line, from the business — used when
     nobody has chosen a collection, which is the page's own state. */
  const page = variant.copy.pages.catalogue;

  const inStock = live.filter((product) => product.stock === null || product.stock > 0).length;

  return (
    <>
      <PageBand
        eyebrow={variant.industryLabel}
        heading={chosen ? chosen.name : page.heading}
        intro={chosen?.summary ?? page.intro}
        facts={[
          inStock > 0 ? { label: "In stock", value: String(inStock) } : null,
          withStock.length > 0 ? { label: "Collections", value: String(withStock.length) } : null,
        ].filter(Boolean) as { label: string; value: string }[]}
      />

      <div className="container-page py-14">

      {withStock.length > 0 && (
        <nav aria-label="Collections" className="flex flex-wrap gap-2">
          <Link
            href={`${base}/shop`}
            aria-current={chosen ? undefined : "page"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              chosen
                ? "border border-border hover:bg-surface-2"
                : "bg-accent text-accent-fg",
            )}
          >
            All
          </Link>

          {withStock.map((collection) => (
            <Link
              key={collection.id}
              href={`${base}/shop?in=${collection.slug}`}
              aria-current={chosen?.id === collection.id ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                chosen?.id === collection.id
                  ? "bg-accent text-accent-fg"
                  : "border border-border hover:bg-surface-2",
              )}
            >
              {collection.name}
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 ? (
        <p className="mt-14 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-sm text-muted">
          Nothing here yet.{" "}
          <Link href={`${base}/shop`} className="text-accent hover:underline">
            See everything instead
          </Link>
          .
        </p>
      ) : (
        <Spotlight as="ul" className="mt-10 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              base={base}
              symbol={variant.currencySymbol}
              optionCount={options.get(product.id)?.length ?? 0}
              index={index}
            />
          ))}
        </Spotlight>
      )}
      </div>
    </>
  );
}
