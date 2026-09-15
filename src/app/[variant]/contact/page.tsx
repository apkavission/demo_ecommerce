import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { ContactForm } from "@/components/site/forms";
import { PageBand } from "@/components/site/ui";
import { getVariant } from "@/lib/variants";

export const metadata: Metadata = { title: "Contact" };

type Props = { params: Promise<{ variant: string }> };

/**
 * Getting hold of the shop.
 *
 * **The phone number comes first and the form second.** Somebody with a problem
 * about an order that has already been placed wants a person, not a textarea,
 * and putting the form at the top of this page is a small way of saying we would
 * rather they did not ring.
 */
export default async function ContactPage({ params }: Props) {
  const { variant: slug } = await params;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  /* This page's own title and opening line, from the business. */
  const page = variant.copy.pages.contact;

  const contact = variant.contact;

  return (
    <>
      <PageBand
        eyebrow={variant.industryLabel}
        heading={page.heading}
        intro={page.intro}
      />

      <div className="container-page py-14">

      <div className="mt-10 grid gap-12 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-5">
          {contact.phone && (
            <p className="flex items-start gap-3 text-sm">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block text-muted">Phone</span>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="hover:underline"
                >
                  {contact.phone}
                </a>
              </span>
            </p>
          )}

          {contact.email && (
            <p className="flex items-start gap-3 text-sm">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block text-muted">Email</span>
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </span>
            </p>
          )}

          {contact.address && (
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block text-muted">Where we are</span>
                {contact.address}
              </span>
            </p>
          )}

          {contact.hours && (
            <p className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block text-muted">When</span>
                {contact.hours}
              </span>
            </p>
          )}

          <p className="rounded-lg bg-surface-2 px-4 py-3 text-xs text-muted">
            Every one of these is invented. Nothing dials, and nothing arrives.
          </p>
        </aside>

        <div className="max-w-xl">
          <ContactForm variant={variant.slug} />
        </div>
      </div>
      </div>
    </>
  );
}
