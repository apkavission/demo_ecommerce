import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Quote, Star } from "lucide-react";
import { getTestimonials, getVariant } from "@/lib/variants";

type Props = { params: Promise<{ variant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);
  return { title: variant ? "Reviews" : "Not found" };
}

/**
 * What people said — labelled as examples, every time.
 *
 * Inventing a customer's review and presenting it as genuine is the one thing a
 * demonstration must not do, and it is the easiest thing in the world to do by
 * accident: a card with a name, a photograph and five stars reads as real
 * whatever the surrounding page says.
 *
 * So the label is on the page, not only in the small print, and the seeded
 * author is literally "Sample review". A real site replaces both with reviews
 * collected from actual customers, which is a content job rather than a code one.
 */
export default async function ReviewsPage({ params }: Props) {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);
  if (!variant) notFound();

  const testimonials = await getTestimonials(variant.id);

  return (
    <div className="container-page py-14 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          What people said
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Written as examples for this demonstration. On a live site these would
          be reviews collected from real customers, with their permission.
        </p>
      </header>

      {testimonials.length === 0 ? (
        <p className="mt-12 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-muted">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.id}
              className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-7 shadow-[var(--shadow-1)]"
            >
              <Quote className="size-6 text-accent" aria-hidden />

              <blockquote className="mt-4 flex-1 leading-relaxed">
                {testimonial.quote}
              </blockquote>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium">{testimonial.author}</p>
                  {testimonial.role_label && (
                    <p className="text-xs text-muted">{testimonial.role_label}</p>
                  )}
                </div>

                {testimonial.rating && (
                  <p className="flex gap-0.5" aria-label={`${testimonial.rating} out of 5`}>
                    {Array.from({ length: testimonial.rating }).map((_, index) => (
                      <Star
                        key={index}
                        className="size-3.5 fill-accent text-accent"
                        aria-hidden
                      />
                    ))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
