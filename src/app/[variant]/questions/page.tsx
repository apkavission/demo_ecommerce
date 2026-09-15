import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFaqs, getVariant } from "@/lib/variants";
import { PageBand } from "@/components/site/ui";

type Props = { params: Promise<{ variant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);
  return { title: variant ? "Questions" : "Not found" };
}

/**
 * The questions people ring to ask.
 *
 * **Written as answers, not as marketing.** "When will it arrive?" answered
 * with "we pride ourselves on fast delivery" is not an answer; "order before
 * four and it arrives the same evening, by nine" is. The second one is also the
 * one that gets somebody to order.
 *
 * Plain `<details>` rather than a JavaScript accordion: it opens without
 * hydration, it is searchable by the browser's own find-in-page, and a screen
 * reader announces it correctly without any work.
 */
export default async function QuestionsPage({ params }: Props) {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);
  if (!variant) notFound();

  const faqs = await getFaqs(variant.id);
  /* This page's own title and opening line, from the business. */
  const page = variant.copy.pages.questions;
  const base = `/${variant.slug}`;

  return (
    <>
      <PageBand
        eyebrow={variant.industryLabel}
        heading={page.heading}
        intro={page.intro}
        facts={faqs.length > 0 ? [{ label: "Answered here", value: String(faqs.length) }] : undefined}
      >
        <Link href={`${base}/contact`} className="btn-ghost">
          Ask us something
        </Link>
      </PageBand>

      <div className="container-page py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1fr_1.5fr]">
          <div />

        {faqs.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-muted">
            Nothing here yet.
          </p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <details key={faq.id} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {faq.question}
                  <span
                    aria-hidden
                    className="shrink-0 text-2xl leading-none text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <p className="measure mt-3 leading-relaxed text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
