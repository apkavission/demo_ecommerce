import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPeople, getVariant } from "@/lib/variants";

export const metadata: Metadata = { title: "Who we are" };

type Props = { params: Promise<{ variant: string }> };

/**
 * The people behind the shop.
 *
 * **No photographs, and the layout does not pretend there should be.** There is
 * a `media` table with nothing in it, and a grid built around empty avatar
 * circles looks broken in a way a text layout does not. A stock photograph of a
 * smiling stranger would be worse than both.
 */
export default async function PeoplePage({ params }: Props) {
  const { variant: slug } = await params;

  const variant = await getVariant(slug);
  if (!variant) notFound();

  const people = (await getPeople(variant.id)).filter(
    (person) => person.status === "published",
  );

  return (
    <div className="container-page py-14">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Who we are
        </h1>
        <p className="measure mt-2 text-muted">
          {variant.businessName} is {people.length}{" "}
          {people.length === 1 ? "person" : "people"}. Every one of them is
          invented, as is everything they are said to have done.
        </p>
      </header>

      <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <li
            key={person.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-6"
          >
            <h2 className="font-display text-lg font-semibold">{person.full_name}</h2>

            {person.role_label && (
              <p className="mt-1 text-sm text-accent">{person.role_label}</p>
            )}

            {person.qualification && (
              <p className="mt-1 text-xs text-muted">{person.qualification}</p>
            )}

            {person.bio && <p className="mt-4 text-sm leading-relaxed">{person.bio}</p>}

            {person.years_experience !== null && (
              <p className="mt-4 text-xs text-muted">
                {person.years_experience} years at it
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
