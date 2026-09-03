import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqEditor, PublishToggle } from "@/components/admin/editors";
import { isManager, requireAdmin } from "@/lib/auth";
import {
  getCollections,
  getFaqs,
  getPeople,
  getTestimonials,
  listVariants,
} from "@/lib/variants";

export const metadata: Metadata = { title: "Content" };

type Props = { searchParams: Promise<{ shop?: string }> };

/**
 * Everything on the site that is not a product.
 *
 * **Publishing is one press and editing is a form.** The two are separated
 * because taking something off the site is the urgent action — a wrong price, a
 * person who has left — and it should never require opening a form and finding
 * the right field first.
 */
export default async function ContentPage({ searchParams }: Props) {
  await requireAdmin();

  if (!(await isManager())) notFound();

  const { shop } = await searchParams;

  const variants = await listVariants();
  const current = variants.find((entry) => entry.slug === shop) ?? variants[0];

  if (!current) notFound();

  const [collections, people, testimonials, faqs] = await Promise.all([
    getCollections(current.id),
    getPeople(current.id),
    getTestimonials(current.id),
    getFaqs(current.id),
  ]);

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Content</h1>
        <p className="mt-2 text-muted">
          {current.businessName}. Everything here appears on the public site
          within seconds of being saved — there is no publish step and no deploy.
        </p>
      </header>

      {variants.length > 1 && (
        <nav aria-label="Shops" className="mt-8 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <a
              key={variant.id}
              href={`/admin/content?shop=${variant.slug}`}
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

      {/* ---------------------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Collections</h2>
        <ul className="mt-4 divide-y divide-border card px-6">
          {collections.map((collection) => (
            <li key={collection.id} className="flex items-center gap-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{collection.name}</span>
                {collection.summary && (
                  <span className="block text-xs text-muted">{collection.summary}</span>
                )}
              </span>
              <PublishToggle
                table="collections"
                id={collection.id}
                status={collection.status}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">People</h2>
        <ul className="mt-4 divide-y divide-border card px-6">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{person.full_name}</span>
                <span className="block text-xs text-muted">{person.role_label}</span>
              </span>
              <PublishToggle table="team" id={person.id} status={person.status} />
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Reviews</h2>
        <p className="measure mt-1 text-sm text-muted">
          Every one of these is written as an example and says so in the author
          field. On a live shop they are replaced with reviews from real
          customers, with their permission.
        </p>

        <ul className="mt-4 divide-y divide-border card px-6">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id} className="flex items-start gap-4 py-4">
              <span className="min-w-0 flex-1">
                <span className="measure block text-sm">
                  &ldquo;{testimonial.quote}&rdquo;
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {testimonial.author}
                  {testimonial.role_label && ` · ${testimonial.role_label}`}
                </span>
              </span>
              <PublishToggle
                table="testimonials"
                id={testimonial.id}
                status={testimonial.status}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Questions</h2>

        <div className="mt-4 card p-6">
          <h3 className="mb-4 text-sm font-medium text-muted">Add one</h3>
          <FaqEditor variantId={current.id} />
        </div>

        <ul className="mt-4 space-y-4">
          {faqs.map((faq) => (
            <li
              key={faq.id}
              className="card p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{faq.question}</p>
                  <p className="measure mt-1 text-sm text-muted">{faq.answer}</p>
                </div>
                <PublishToggle table="faqs" id={faq.id} status={faq.status} />
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-accent">Change it</summary>
                <div className="mt-4">
                  <FaqEditor variantId={current.id} faq={faq} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
