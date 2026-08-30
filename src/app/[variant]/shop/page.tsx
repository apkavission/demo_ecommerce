import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/site/product";
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

  return (
    <div className="container-page py-14">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {chosen ? chosen.name : "Everything"}
        </h1>
        <p className="measure mt-2 text-muted">
          {chosen?.summary ??
            `${live.length} ${live.length === 1 ? "thing" : "things"} in the shop, and every price is what you pay.`}
        </p>
      </header>

      {withStock.length > 0 && (
        <nav aria-label="Collections" className="mt-8 flex flex-wrap gap-2">
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
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              base={base}
              symbol={variant.currencySymbol}
              optionCount={options.get(product.id)?.length ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
