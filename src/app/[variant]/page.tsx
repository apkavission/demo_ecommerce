import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, ChevronDown, Clock, FileText, MapPin, Phone, RotateCcw, ShieldCheck, Sparkles, Star, Truck, UserRound } from "lucide-react";
import { Hero } from "@/components/site/hero";
import { Spotlight } from "@/components/site/motion";
import { ProductCard } from "@/components/site/product";
import { SectionHead, Stat } from "@/components/site/ui";
import { clientEnv } from "@/lib/env";
import { businessJsonLd, faqJsonLd, structuredData } from "@/lib/seo";
import {
  getCollections,
  getFaqs,
  getOptionsFor,
  getProducts,
  getTestimonials,
  getVariant,
} from "@/lib/variants";
import { formatMoney } from "@/lib/money";

/**
 * The icons a promise may be drawn with, by the key its row stores.
 *
 * Imported by name here, which is the reason `PROMISE_ICONS` in `lib/copy.ts`
 * is a fixed list rather than a text field: a bundler cannot include a
 * component named by a database row at request time. An unknown key never
 * reaches this map, because the reader has already replaced it.
 */
const ICONS = {
  person: UserRound,
  estimate: FileText,
  shield: ShieldCheck,
  calendar: CalendarCheck,
  phone: Phone,
  clock: Clock,
  pin: MapPin,
  spark: Sparkles,
} as const;

type Props = { params: Promise<{ variant: string }> };

/**
 * The shop front.
 *
 * ---------------------------------------------------------------------------
 * **What somebody opening a shop is trying to find out**, in the order they try
 * to find it out: what is in stock, what delivery costs and when it arrives,
 * whether it can be sent back, whether paying is safe, and what is on offer
 * right now. The first screen answers the first four, and the shelf under it
 * answers the fifth by printing the old price beside the new one.
 *
 * That is a different order from every other demo here, and it is why this page
 * is not one of them with the nouns swapped. Nobody books a shop. They put
 * something in a basket, and every objection between the shelf and the basket
 * is a sale lost — so the delivery cost, the free-delivery threshold and the
 * returns window are on the first screen rather than in a footer link.
 *
 * ---------------------------------------------------------------------------
 * **The three promises come from the variant, not from the markup.** The
 * grocery shop delivers this evening and the clothing shop takes fourteen days
 * for returns; a hardcoded row of icons would make two of the three demos
 * quietly wrong in the one place a customer looks for reassurance.
 *
 * **There are no photographs, on purpose.** A shop with stock photography of
 * somebody else's clothes is the fastest way to lose the sale at the door, and
 * it is the first thing a real shop replaces. What stands in for it is the
 * price, the stock, and the business's own colour.
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
  const featured = live.filter((product) => product.is_featured);
  const shown = (featured.length > 0 ? featured : live).slice(0, 6);
  const options = await getOptionsFor(shown.map((product) => product.id));

  /* Every heading, sentence and promise below comes from here. */
  const copy = variant.copy;
  const base = `/${variant.slug}`;
  const symbol = variant.currencySymbol;

  /* In stock, which is the number a shop is actually judged on. */
  const inStock = live.filter((product) => product.stock === null || product.stock > 0).length;

  /* The cheapest thing on the shelf — what "from" means, read off the rows. */
  const cheapest = live.reduce<number | null>(
    (least, product) => (least === null ? product.price_paise : Math.min(least, product.price_paise)),
    null,
  );

  /* Anything whose old price is still printed is on offer, and that is a fact
     about the rows rather than a banner somebody wrote. */
  const reduced = live.filter(
    (product) => product.compare_at_paise !== null && product.compare_at_paise > product.price_paise,
  ).length;

  let chapter = 0;
  const shelfIndex = shown.length > 0 ? (chapter += 1) : 0;
  const collectionsIndex = collections.length > 0 ? (chapter += 1) : 0;
  const reviewsIndex = testimonials.length > 0 ? (chapter += 1) : 0;
  const questionsIndex = faqs.length > 0 ? (chapter += 1) : 0;

  /*
    What a search engine is told about this business.

    One script tag, one graph: the business, what it offers with prices, the
    questions it answers — every field derived from a row, and
    two fields deliberately absent. `lib/seo.ts` says which and why. The page
    stays `noindex`, which is not a contradiction: this is what the real site
    inherits on the day one of these becomes it, and it is what a prospect's own
    SEO person is shown when they ask.
  */
  const site = clientEnv.NEXT_PUBLIC_SITE_URL ?? "";
  const business = businessJsonLd(variant, live, site);

  const jsonLd = structuredData([
    business,
    faqJsonLd(faqs),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* ============================================================ hero == */}
      <Hero
        image={variant.hero.image}
        imageAlt={variant.hero.imageAlt}
        video={variant.hero.video}
        overlay={copy.hero.overlay}
        align={copy.hero.align}
      >
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="micro enter" style={{ "--enter": 0 } as React.CSSProperties}>
              {variant.industryLabel}
            </p>

            <span className="mask-rise mt-5 block">
              <h1
                className="font-display display-hero font-semibold"
                style={{ "--enter": 1 } as React.CSSProperties}
              >
                {variant.tagline ?? variant.businessName}
              </h1>
            </span>

            {variant.description && (
              <p
                className="measure enter mt-6 text-lg leading-relaxed text-muted"
                style={{ "--enter": 2 } as React.CSSProperties}
              >
                {variant.description}
              </p>
            )}

            <div
              className="enter mt-9 flex flex-wrap gap-3"
              style={{ "--enter": 3 } as React.CSSProperties}
            >
              <Link href={`${base}/shop`} className="btn group">
                Everything in stock
                <ArrowRight className="arrow size-4" aria-hidden />
              </Link>

              {collections.length > 0 && (
                <Link href={`${base}/shop?in=${collections[0].slug}`} className="btn-ghost group">
                  {collections[0].name}
                  <ArrowRight className="arrow size-4" aria-hidden />
                </Link>
              )}
            </div>

            <dl
              className="enter mt-10 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7"
              style={{ "--enter": 4 } as React.CSSProperties}
            >
              {inStock > 0 && <Stat label="In stock now" value={inStock} />}
              {collections.length > 0 && <Stat label="Collections" value={collections.length} />}
              {reduced > 0 && <Stat label="Reduced" value={reduced} />}
            </dl>
          </div>

          {/*
            The four objections, answered before the shelf.

            Delivery cost, the threshold that makes it free, the returns window
            and how payment is taken — every one read from the shop's own row,
            because the grocery demo and the clothing demo disagree about all
            four and a hardcoded panel would be wrong for two of them.
          */}
          <aside
            className="tile enter overflow-hidden"
            style={{ "--enter": 2 } as React.CSSProperties}
          >
            <div className="border-b border-border p-6 md:p-7">
              <p className="micro" style={{ "--micro-rule": "1.5rem" } as React.CSSProperties}>
                <Truck className="size-3.5 text-accent" aria-hidden />
                Delivery
              </p>

              <p className="font-display price mt-3 text-4xl font-semibold">
                {variant.shippingPaise > 0
                  ? formatMoney(variant.shippingPaise, symbol)
                  : "Free"}
              </p>

              <p className="mt-2 text-sm text-muted">
                {variant.shippingPaise > 0 ? "on every order" : "on every order, with no threshold"}
                {variant.freeShippingAbove !== null && variant.shippingPaise > 0 && (
                  <>
                    {" "}
                    — free over {formatMoney(variant.freeShippingAbove, symbol)}
                  </>
                )}
              </p>
            </div>

            {cheapest !== null && (
              <div className="border-b border-border p-6 md:p-7">
                <p className="micro" style={{ "--micro-rule": "1.5rem" } as React.CSSProperties}>
                  On the shelf from
                </p>
                <p className="font-display price mt-3 text-3xl font-semibold text-accent">
                  {formatMoney(cheapest, symbol)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {inStock} {inStock === 1 ? "item" : "items"} ready to send
                </p>
              </div>
            )}

            <div className="grid gap-4 p-6 md:p-7">
              <p className="flex items-start gap-3 text-sm">
                <RotateCcw className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="font-medium">Sending it back</span>
                  <span className="block text-muted">
                    Unworn, in its packaging, and we pay the return.
                  </span>
                </span>
              </p>

              <p className="flex items-start gap-3 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="font-medium">Paying</span>
                  <span className="block text-muted">
                    Card and UPI, taken on the payment provider&rsquo;s own page.
                  </span>
                </span>
              </p>
            </div>
          </aside>
        </div>
      </Hero>

      {/* ===================================================== reassurance == */}
      {/* Absent entirely when a business has taken every promise off, rather
          than a tinted band with nothing in it. */}
      {copy.promises.length > 0 && (
        <section className="border-b border-border bg-surface-2">
          <ul className="container-page grid gap-x-8 gap-y-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {copy.promises.map((promise, index) => {
              const Icon = ICONS[promise.icon as keyof typeof ICONS] ?? UserRound;

              return (
                <li
                  key={promise.title}
                  /*
                    Part of the load sequence rather than a scroll reveal: on a
                    tall screen this strip is already on the first screen, and a
                    band that is visible but faded because nobody has scrolled
                    reads as a page that failed to finish loading.
                  */
                  className="enter flex gap-3.5 lg:border-l lg:border-border lg:pl-5 lg:first:border-0 lg:first:pl-0"
                  style={{ "--enter": 5 + index } as React.CSSProperties}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-[color-mix(in_oklab,var(--accent)_22%,transparent)]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{promise.title}</span>
                    {promise.note && (
                      <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                        {promise.note}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}


      {/* ========================================================== shelf == */}
      {shown.length > 0 && (
        <section className="band-open container-page py-18 md:py-24">
          <SectionHead
            index={shelfIndex}
            label="The shelf"
            heading={copy.catalogue.heading}
            intro={copy.catalogue.intro}
            action={{ href: `${base}/shop`, label: `All ${inStock} in stock` }}
          />

          <Spotlight
            as="ul"
            className="mt-12 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {shown.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                base={base}
                symbol={symbol}
                optionCount={options.get(product.id)?.length ?? 0}
                index={index}
              />
            ))}
          </Spotlight>
        </section>
      )}

      {/* ==================================================== collections == */}
      {collections.length > 0 && (
        <section className="border-y border-border bg-surface">
          <div className="container-page py-18 md:py-24">
            <SectionHead
              index={collectionsIndex}
              label="How it is arranged"
              heading={copy.people.heading}
              intro={copy.people.intro}
            />

            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {collections.map((collection, index) => (
                <li
                  key={collection.id}
                  data-reveal="lift"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <Link
                    href={`${base}/shop?in=${collection.slug}`}
                    className="tile spot underline-grow group flex h-full flex-col p-6"
                  >
                    <p className="font-display text-lg font-semibold">{collection.name}</p>
                    {collection.summary && (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                        {collection.summary}
                      </p>
                    )}

                    <span className="mt-5 inline-flex items-center gap-1.5 border-t border-border pt-4 text-sm font-semibold text-accent">
                      See them
                      <ArrowRight className="arrow size-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ========================================================= reviews == */}
      {testimonials.length > 0 && (
        <section className="band-open container-page py-18 md:py-24">
          <SectionHead
            index={reviewsIndex}
            label="Reviews"
            heading={copy.reviews.heading}
            intro={copy.reviews.intro}
          />

          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.slice(0, 6).map((testimonial, index) => (
              <li
                key={testimonial.id}
                data-reveal="lift"
                className="relative isolate flex flex-col rounded-[var(--radius-card)] border border-border bg-accent-soft p-6 pt-9"
                style={{ "--i": index } as React.CSSProperties}
              >
                <span className="quote-glyph font-display" aria-hidden>
                  &rdquo;
                </span>

                <blockquote className="relative flex-1 text-base leading-relaxed">
                  {testimonial.quote}
                </blockquote>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted">{testimonial.role_label}</p>
                  {testimonial.rating && (
                    <p className="flex gap-0.5" aria-label={`${testimonial.rating} out of 5`}>
                      {Array.from({ length: testimonial.rating }).map((_, star) => (
                        <Star key={star} className="size-3.5 fill-accent text-accent" aria-hidden />
                      ))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ======================================================= questions == */}
      {faqs.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="container-page grid gap-12 py-18 md:grid-cols-[1fr_1.4fr] md:py-24">
            <SectionHead
              index={questionsIndex}
              label="Questions"
              heading={copy.questions.heading}
              intro={copy.questions.intro}
            />

            <div className="divide-y divide-border" data-reveal>
              {faqs.map((faq, index) => (
                <details key={faq.id} className="group py-4 first:pt-0" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-baseline gap-4 font-medium">
                    <span className="index-num text-xs">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex-1">{faq.question}</span>
                    <ChevronDown
                      className="size-4 shrink-0 self-center text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="measure mt-3 pl-9 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================= cta == */}
      <section className="container-page py-18 md:py-24">
        <div
          data-reveal="lift"
          className="relative isolate overflow-hidden rounded-[var(--radius-card)] border border-border bg-accent-soft p-8 text-center md:p-14"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(28rem_18rem_at_50%_-10%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_70%)]"
          />

          <h2 className="font-display display-2 font-semibold">{copy.cta.heading || "Have a look round"}</h2>

          <p className="measure mx-auto mt-4 text-muted">
            Nothing is hidden until checkout: the delivery cost is on the basket from the first
            item, and the returns window is the same one printed above.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`${base}/shop`} className="btn group">
              Everything in stock
              <ArrowRight className="arrow size-4" aria-hidden />
            </Link>

            <Link href={`${base}/questions`} className="btn-ghost group">
              Delivery and returns
              <ArrowRight className="arrow size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
