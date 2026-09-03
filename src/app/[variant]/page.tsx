import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { ProductCard } from "@/components/site/product";
import {
  getCollections,
  getFaqs,
  getOptionsFor,
  getProducts,
  getTestimonials,
  getVariant,
} from "@/lib/variants";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ variant: string }> };

/**
 * The shop front.
 *
 * **Featured products first, then how to browse, then the reasons to trust it.**
 * That order is not a design preference — it is what somebody arriving from a
 * link actually does: look at a thing, look for more things, then decide whether
 * this shop is real.
 *
 * The three promises near the bottom come from the variant, not from the markup.
 * The grocery shop delivers this evening and the clothing shop takes fourteen
 * days for returns; a hardcoded row of icons would make two of the three demos
 * quietly wrong in the place a customer looks for reassurance.
 */
export default async function ShopHome({ params }: Props) {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);
  if (!variant) notFound();

  const [products, collections, testimonials, faqs] = await Promise.all([
    getProducts(variant.id),
    getCollections(variant.id),
    getTestimonials(variant.id),
    getFaqs(variant.id),
  ]);

  const live = products.filter((product) => product.status === "published");
  const featured = live.filter((product) => product.is_featured).slice(0, 3);
  const shown = featured.length > 0 ? featured : live.slice(0, 3);
  const options = await getOptionsFor(shown.map((product) => product.id));

  const base = `/${variant.slug}`;

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      <section className="hero-wash">
        <div className="container-page py-20 md:py-28">
          <p className="eyebrow">
            {variant.industryLabel}
          </p>

          <h1 className="font-display display-1 measure mt-4 font-semibold">
            {variant.tagline ?? variant.businessName}
          </h1>

          {variant.description && (
            <p className="measure mt-5 text-lg leading-relaxed text-muted">
              {variant.description}
            </p>
          )}

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={`${base}/shop`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              See everything
              <ArrowRight className="size-4" aria-hidden />
            </Link>

            <Link
              href={`${base}/contact`}
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Ask us something
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {shown.length > 0 && (
        <section className="container-page py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display display-2 rule-accent font-semibold">
              {featured.length > 0 ? "Worth looking at" : "In the shop"}
            </h2>
            <Link href={`${base}/shop`} className="text-sm text-accent hover:underline">
              All {live.length}
            </Link>
          </div>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {collections.length > 0 && (
        <section className="border-y border-border bg-surface">
          <div className="container-page py-16">
            <h2 className="font-display display-2 rule-accent font-semibold">
              What we sell
            </h2>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections
                .filter((collection) => collection.status === "published")
                .map((collection) => (
                  <li key={collection.id}>
                    <Link
                      href={`${base}/shop?in=${collection.slug}`}
                      className="card block h-full p-6"
                    >
                      <h3 className="font-display text-lg font-semibold">
                        {collection.name}
                      </h3>
                      {collection.summary && (
                        <p className="mt-2 text-sm text-muted">{collection.summary}</p>
                      )}
                      <p className="mt-4 text-xs text-accent">
                        {
                          live.filter((product) => product.collection_id === collection.id)
                            .length
                        }{" "}
                        in here
                      </p>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      <section className="container-page py-16">
        <ul className="grid gap-6 sm:grid-cols-3">
          <li className="flex gap-4">
            <Truck className="size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium">Delivery</p>
              <p className="mt-1 text-sm text-muted">
                {formatMoney(variant.shippingPaise, variant.currencySymbol)} a
                delivery
                {variant.freeShippingAbove !== null && (
                  <>
                    , free over{" "}
                    {formatMoney(variant.freeShippingAbove, variant.currencySymbol)}
                  </>
                )}
                .
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <RotateCcw className="size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium">If it is wrong</p>
              <p className="mt-1 text-sm text-muted">
                Tell us and we put it right. The questions page says exactly how.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <ShieldCheck className="size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium">No card details</p>
              <p className="mt-1 text-sm text-muted">
                Cash on delivery. This is a demonstration and takes no payment at
                all.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {testimonials.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="container-page py-16">
            <h2 className="font-display display-2 rule-accent font-semibold">
              What people said
            </h2>

            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {testimonials.slice(0, 3).map((entry) => (
                <li
                  key={entry.id}
                  className="card p-6"
                >
                  <p className="measure text-sm leading-relaxed">
                    &ldquo;{entry.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-xs text-muted">
                    {entry.author}
                    {entry.role_label && ` · ${entry.role_label}`}
                  </p>
                </li>
              ))}
            </ul>

            <Link
              href={`${base}/reviews`}
              className="mt-8 inline-block text-sm text-accent hover:underline"
            >
              All {testimonials.length} reviews
            </Link>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {faqs.length > 0 && (
        <section className="container-page py-16">
          <h2 className="font-display display-2 rule-accent font-semibold">
            Asked often
          </h2>

          <dl className="measure mt-8 space-y-6">
            {faqs.slice(0, 3).map((faq) => (
              <div key={faq.id}>
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`${base}/questions`}
            className="mt-8 inline-block text-sm text-accent hover:underline"
          >
            Every question
          </Link>
        </section>
      )}
    </>
  );
}
