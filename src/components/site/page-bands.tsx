import Image from "next/image";
import type { PageSection } from "@/lib/pages";

/**
 * A page, as bands down the screen.
 *
 * ---------------------------------------------------------------------------
 * **Four layouts, not thirty.** A demo's job is to show a prospect what their
 * site would look like, and a builder with thirty section types is a builder
 * nobody finishes a page in. Four cover every page these businesses actually
 * write: words, words beside a picture either way round, and a picture with
 * words over it.
 *
 * ---------------------------------------------------------------------------
 * **Pictures are contained, never cropped to fill.** The standing rule in this
 * estate: what somebody uploaded is what appears. A band whose picture is cut
 * off at the top is a band somebody approved and then found trimmed.
 *
 * The banner is the one place a picture fills its frame, because that is what a
 * banner is — and even there it is given a fixed aspect and the whole picture
 * is fitted inside it rather than cropped to the viewport.
 */
export function PageBands({ sections }: { sections: PageSection[] }) {
  if (sections.length === 0) return null;

  return (
    <div className="mt-12 space-y-16 md:space-y-24">
      {sections.map((section) => (
        <Band key={section.id} section={section} />
      ))}
    </div>
  );
}

function Words({ section }: { section: PageSection }) {
  return (
    <div className="min-w-0">
      {section.heading && (
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {section.heading}
        </h2>
      )}
      {section.body && (
        <div className="measure mt-4 space-y-4 text-muted">
          {section.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Picture({
  section,
  className,
}: {
  section: PageSection;
  className?: string;
}) {
  if (!section.image) return null;

  return (
    <div className={className}>
      <Image
        src={section.image.url}
        alt={section.image.alt}
        width={1200}
        height={900}
        unoptimized
        className="h-auto w-full rounded-[var(--radius-card)] object-contain"
      />
    </div>
  );
}

function Band({ section }: { section: PageSection }) {
  if (section.layout === "banner" && section.image) {
    return (
      <section className="container-page">
        <div className="relative overflow-hidden rounded-[var(--radius-card)]">
          <Image
            src={section.image.url}
            alt={section.image.alt}
            width={1600}
            height={700}
            unoptimized
            className="h-auto w-full object-contain"
          />

          {(section.heading || section.body) && (
            <div className="absolute inset-0 flex items-end">
              {/*
                A wash behind the words rather than over the picture.

                Text laid straight onto a photograph is unreadable on about half
                of them, and which half is not knowable here — the picture is
                whatever somebody uploaded this morning.
              */}
              <div className="w-full bg-gradient-to-t from-black/75 to-transparent p-6 md:p-10">
                {section.heading && (
                  <h2 className="font-display text-2xl font-semibold text-white md:text-4xl">
                    {section.heading}
                  </h2>
                )}
                {section.body && (
                  <p className="measure mt-2 whitespace-pre-wrap text-sm text-white/85 md:text-base">
                    {section.body}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if ((section.layout === "image_right" || section.layout === "image_left") && section.image) {
    return (
      <section className="container-page">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <Picture
            section={section}
            className={section.layout === "image_left" ? "md:order-first" : "md:order-last"}
          />
          <Words section={section} />
        </div>
      </section>
    );
  }

  return (
    <section className="container-page">
      <Words section={section} />
      {section.image && <Picture section={section} className="mt-8" />}
    </section>
  );
}
