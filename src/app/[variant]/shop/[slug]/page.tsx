import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AddToCart } from "@/components/site/product";
import {
  getCollections,
  getOptions,
  getProduct,
  getTestimonials,
  getVariant,
} from "@/lib/variants";
import { discountPercent, formatMoney } from "@/lib/money";

type Props = { params: Promise<{ variant: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: variantSlug, slug } = await params;
  const variant = await getVariant(variantSlug);
  if (!variant) return { title: "Not found" };

  const product = await getProduct(variant.id, slug);
  return {
    title: product?.name ?? "Not found",
    description: product?.summary ?? undefined,
  };
}

/**
 * One product.
 *
 * **The page the other five demos do not have.** A clinic lists its services and
 * that is enough; a shop that cannot open a product is not a shop. This is where
 * the size gets chosen, the stock gets checked and the basket gets filled, and
 * it is the screen a prospect spends the longest looking at.
 *
 * **The description is below the fold and the price is not.** Somebody deciding
 * whether to buy reads the price, the stock and the options; somebody who has
 * already decided reads none of it. Putting four paragraphs above the button
 * serves neither.
 */
export default async function ProductPage({ params }: Props) {
  const { variant: variantSlug, slug } = await params;

  const variant = await getVariant(variantSlug);
  if (!variant) notFound();

  const product = await getProduct(variant.id, slug);
  if (!product || product.status !== "published") notFound();

  const [options, collections, reviews] = await Promise.all([
    getOptions(product.id),
    getCollections(variant.id),
    getTestimonials(variant.id),
  ]);

  const collection = collections.find((entry) => entry.id === product.collection_id);
  const off = discountPercent(product.price_paise, product.compare_at_paise);
  const soldOut = product.stock !== null && product.stock <= 0;
  const base = `/${variant.slug}`;

  const about = reviews.filter((review) => review.product_id === product.id);

  return (
    <div className="container-page py-10">
      <Link
        href={collection ? `${base}/shop?in=${collection.slug}` : `${base}/shop`}
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {collection ? collection.name : "Everything"}
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>

          {product.summary && (
            <p className="measure mt-3 text-lg text-muted">{product.summary}</p>
          )}

          {product.description && (
            <div className="measure mt-8 space-y-4 leading-relaxed">
              {product.description.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}

          <dl className="mt-10 grid gap-x-8 gap-y-3 border-t border-border pt-6 text-sm sm:grid-cols-2">
            {product.sku && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Code</dt>
                <dd className="font-mono text-xs">{product.sku}</dd>
              </div>
            )}
            {product.meta_label && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Specification</dt>
                <dd>{product.meta_label}</dd>
              </div>
            )}
            {product.weight_grams !== null && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Weight</dt>
                <dd>
                  {product.weight_grams >= 1000
                    ? `${(product.weight_grams / 1000).toFixed(product.weight_grams % 1000 === 0 ? 0 : 1)}kg`
                    : `${product.weight_grams}g`}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">In stock</dt>
              <dd>
                {/* Null is "we do not count this", zero is "counted, none left".
                    Two different answers, and a single number would have to lie
                    about one of them. */}
                {product.stock === null
                  ? "Made to order"
                  : product.stock > 0
                    ? `${product.stock}`
                    : "None"}
              </dd>
            </div>
          </dl>

          {about.length > 0 && (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="font-display text-lg font-semibold">About this one</h2>
              <ul className="mt-4 space-y-4">
                {about.map((review) => (
                  <li key={review.id} className="measure text-sm">
                    <p className="leading-relaxed">&ldquo;{review.quote}&rdquo;</p>
                    <p className="mt-1.5 text-xs text-muted">
                      {review.author}
                      {review.role_label && ` · ${review.role_label}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* --------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-3xl font-semibold">
                {formatMoney(product.price_paise, variant.currencySymbol)}
              </span>

              {product.compare_at_paise !== null && (
                <span className="text-muted line-through">
                  {formatMoney(product.compare_at_paise, variant.currencySymbol)}
                </span>
              )}

              {off !== null && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  {off}% off
                </span>
              )}
            </div>

            {soldOut ? (
              <p className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-sm text-muted">
                Sold out. Nothing on this page is a real product, so there is
                nothing to wait for — but this is what a customer would see.
              </p>
            ) : (
              <div className="mt-6">
                <AddToCart
                  variant={variant.slug}
                  product={product}
                  options={options}
                  symbol={variant.currencySymbol}
                />
              </div>
            )}

            <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
              Delivery {formatMoney(variant.shippingPaise, variant.currencySymbol)}
              {variant.freeShippingAbove !== null && (
                <>
                  , free over{" "}
                  {formatMoney(variant.freeShippingAbove, variant.currencySymbol)}
                </>
              )}
              . Cash on delivery.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
