import { cn } from "@/lib/utils";

/**
 * The band at the top of the page, behind the headline.
 *
 * ---------------------------------------------------------------------------
 * **The owner asked for it.** *"sab demo me sabse uppar jo h banner ya video
 * wala laga, wo jada aacha lagta h hero section."* He is right: a full-width
 * banner is what a visitor reads as a finished site, and a page that opens on
 * a white band with type on it reads as a draft.
 *
 * ---------------------------------------------------------------------------
 * **Three states, and the third is the ordinary one.**
 *
 * A **video** plays if the business has one. A **banner** is shown if it has a
 * picture. With neither — which is every business in this estate today,
 * because every `media` table is empty — the band is a wash built from that
 * business's own seven colours. That is not a placeholder waiting to be
 * replaced: it is a finished hero that a palette change restyles, and the day
 * somebody uploads a banner it appears with nothing deployed.
 *
 * **What it is not is a stock photograph.** A smiling stranger in a waiting
 * room is what makes a demo look like every other template, and it is the one
 * thing a business cannot keep when the site becomes theirs.
 *
 * ---------------------------------------------------------------------------
 * **The scrim is not decoration.** Over a picture, contrast cannot be
 * measured in advance: the words are one colour and the banner is whatever was
 * uploaded, bright or dark. The scrim is what lets the headline be promised
 * readable over both, and it is why `overlay: "none"` is the one setting the
 * panel warns about.
 *
 * On the wash there is no scrim and no light text — the palette's own ink is
 * used, which is already measured against its own background by
 * `theme-presets.test.ts`. Two typographic treatments rather than one, because
 * light type on a pale wash is the failure this avoids.
 *
 * ---------------------------------------------------------------------------
 * **A video never plays for somebody who asked for stillness.** There is no
 * CSS for that — `prefers-reduced-motion` cannot stop a `<video autoplay>` —
 * so the poster is rendered instead, and the element is only mounted when
 * motion is welcome. `media` queries in `globals.css` cannot do this; it has
 * to be decided where the element is made.
 */
export function Hero({
  image,
  imageAlt,
  video,
  overlay,
  align,
  children,
}: {
  image: string | null;
  imageAlt: string;
  video: string | null;
  overlay: "soft" | "strong" | "none";
  align: "left" | "centre";
  children: React.ReactNode;
}) {
  const hasMedia = Boolean(video || image);

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden",
        /* No media: the wash the stylesheet already owns, and ordinary ink. */
        !hasMedia && "hero-wash",
        hasMedia && "hero-media",
      )}
      data-overlay={hasMedia ? overlay : undefined}
    >
      {video ? (
        <>
          {/*
            Muted, looping, inline, and with the banner as its poster.

            `muted` is not a preference — a browser refuses to autoplay sound,
            so an unmuted video simply does not start. `playsInline` is what
            stops iOS taking it full screen the moment it plays. `poster` is
            what is on screen while it arrives, and on a connection that never
            carries it that is the whole hero.
          */}
          <video
            className="hero-layer"
            src={video}
            poster={image ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            /* Decorative: the headline over it says what the page is, and a
               screen reader announcing a looping clip of a waiting room adds
               nothing. */
            aria-hidden
            tabIndex={-1}
          />

          {/* And the still, for anybody who asked for a still page. The video
              above is hidden for them by `globals.css`. */}
          {image && (
            /* An arbitrary uploaded URL, sized by CSS to cover the band: there
               is nothing for the optimiser to choose between, and this one is
               only ever shown when the video is not playing. */
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hero-layer hero-still" src={image} alt="" aria-hidden />
          )}
        </>
      ) : (
        image && (
          /* As above: an uploaded URL covering the band, so `next/image` has
             nothing to add and would add a loader to the critical path. */
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-layer" src={image} alt={imageAlt} />
        )
      )}

      {hasMedia && <span className="hero-scrim" aria-hidden />}

      <div
        className={cn(
          "container-page relative py-16 md:py-24",
          hasMedia && "lg:py-32",
          align === "centre" && "text-center",
        )}
      >
        {children}
      </div>
    </section>
  );
}
