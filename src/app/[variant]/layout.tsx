import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import { SiteNav, ThemeToggle, VariantSwitcher } from "@/components/site/chrome";
import { ScrollProgress } from "@/components/site/motion";
import { themeCss } from "@/lib/theme";
import { getNav, getVariant, listVariants } from "@/lib/variants";
import { cartCount } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { SiteLogo } from "@/components/site/site-logo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ variant: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);

  if (!variant) return { title: "Not found" };

  /*
    Every one of these falls back rather than being required.

    A business set up this afternoon has a business name and usually a tagline,
    and nothing else. It must still produce a full, sensible `<title>` and a
    real share card — a demo that renders a blank title because nobody reached
    the SEO screen is worse than one with no SEO screen at all.
  */
  const title = variant.metaTitle?.trim() || `${variant.businessName} — ${variant.tagline ?? variant.industryLabel}`;

  const description =
    variant.metaDescription?.trim() || variant.description || variant.tagline || undefined;

  return {
    title: {
      default: title,
      /* The template keeps the name on every inner page, whatever the owner
         wrote for the front one. */
      template: `%s — ${variant.businessName}`,
    },
    description,

    openGraph: {
      title,
      description,
      siteName: variant.businessName,
      type: "website",
      images: variant.ogImage ? [{ url: variant.ogImage, width: 1200, height: 630 }] : undefined,
    },

    twitter: {
      card: variant.ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: variant.ogImage ? [variant.ogImage] : undefined,
    },

    /*
      Never indexed, whatever the visibility says.

      `link_only` and `public` decide who may open a page that is handed to
      them. Neither is an invitation to a crawler: these are demonstrations
      carrying a prospect's name, and a demo that outranks the business it was
      built for is a problem that takes months to undo. The fields above are
      not wasted by this — they are the browser tab, the WhatsApp card, the
      LinkedIn preview, and they are the exact fields the real site inherits
      on the day one of these becomes it.
    */
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * One shop, wrapped around every page of it.
 *
 * ---------------------------------------------------------------------------
 * **The palette arrives as a stylesheet, not as inline styles.**
 *
 * A `<style>` block scoped to `:root` reaches everything, including anything
 * rendered at the end of `<body>` — a dialog, a dropdown, a toast. Inline
 * variables on a wrapper `<div>` would not, and the first symptom is a menu
 * opening in the previous shop's colours, which is the kind of bug that gets
 * noticed in front of a client.
 *
 * **The demo banner is always there and says what this is.** A prospect looking
 * at Kora Label should never be in any doubt that they are looking at a
 * demonstration built by Rahvian, with invented stock and invented prices.
 * Removing that line to make the demo more convincing would be the wrong kind of
 * convincing — and on a shop, where somebody could try to place a real order, it
 * matters more than on the other five.
 *
 * ---------------------------------------------------------------------------
 * **The delivery line in the header is not decoration.**
 *
 * "Free delivery over ₹1,999" is the single most-read sentence on a small shop,
 * and it comes from the variant rather than from the markup — the grocery shop
 * and the clothing shop have different answers, and hardcoding one would make
 * two of the three demos wrong in the place people look first.
 */
export default async function VariantLayout({ children, params }: Props) {
  const { variant: slug } = await params;

  const [variant, variants] = await Promise.all([getVariant(slug), listVariants()]);
  if (!variant) notFound();

  const [nav, basket] = await Promise.all([getNav(variant.id), cartCount(variant.id)]);

  const base = `/${variant.slug}`;
  const contact = variant.contact;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss(variant.theme) }} />

      {/*
        The reveal, triggered by scrolling rather than driven by it.

        **Why a script and not CSS.** `animation-timeline: view()` ties an
        animation's *progress* to the scroll position, which gives two failures
        and no way to have neither: a short range finishes while the band is
        still arriving, so the movement is over before the reader gets there,
        and a long range leaves a band that is half in view drawn at half its
        opacity, so a page nobody has scrolled looks half-painted. What is
        wanted is a trigger: the band appears, and then a movement plays at its
        own speed.

        **Why inline rather than a component.** It has to add `js-reveal`
        before the first paint. A client component hydrates after it, so every
        band would be drawn, then hidden, then revealed — a flicker on load.

        ------------------------------------------------------------------
        **It warns in development, and moving it does not help.** Under a
        processor throttled six times, React reports on every inner route: *"a
        tree hydrated but some attributes of the server rendered HTML didn't
        match the client properties"*, naming `data-revealed`. The observer sets
        it before React has adopted those elements.

        The obvious fix was tried and reverted: an effect in a client component
        cannot win this either. The layout hydrates before the page segment
        under it, so its effect still runs first and the warning is identical —
        and waiting for `window.load` does not help, because on a slow machine
        hydration is still going when `load` fires. What the move *did* cost was
        the animation itself: started that late, the four-second failsafe wins
        on a slow machine and the page simply appears with no entrance at all,
        which is the machine the entrance was worth having on.

        Making it genuinely React's to write means turning fifty-three bands
        across six demos into client components and shipping React for every
        card on every page — a large, real cost against a warning that a
        production build does not print, on a mechanism the production build
        passes 53 of 53 motion checks on. So it stays here, and this paragraph
        exists so nobody spends the afternoon on it twice.

        ------------------------------------------------------------------
        **Three things it refuses to do.** It does nothing when reduced motion
        is asked for, so the class is never added and every band is simply
        visible. It removes the class if it finds no bands. And it gives up
        after four seconds — because an observer that never fires must not be
        able to leave a page blank, which is the one failure this mechanism has
        to be safe against.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
try{
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var root = document.documentElement;
  root.classList.add("js-reveal");

  var giveUp = setTimeout(function(){ root.classList.remove("js-reveal"); }, 4000);

  var start = function(){
    var bands = document.querySelectorAll("[data-reveal]");
    if (!bands.length) { clearTimeout(giveUp); root.classList.remove("js-reveal"); return; }

    var seen = new IntersectionObserver(function(entries, self){
      clearTimeout(giveUp);
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "");
        self.unobserve(entry.target);
      });
    }, {
      /*
        Two per cent, not eight.

        The margin exists so a band reveals once it is properly in view rather
        than the instant its top edge appears. At eight per cent of a 1000px
        screen it held back anything with less than eighty pixels showing — and
        eighty pixels is exactly what the motion check calls "a reader can see
        this". The two disagreed, and on the school's fee page that meant a card
        a reader could read was sitting at opacity 0 while the check, correctly,
        called it invisible. Two per cent keeps the intent and closes the gap.
      */
      rootMargin: "0px 0px -2% 0px",
      threshold: 0.06,
    });

    bands.forEach(function(band){ seen.observe(band); });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}catch(e){ document.documentElement.classList.remove("js-reveal"); }
})();`,
        }}
      />

      {/*
        The ground, under everything, drawn once.

        Two elements rather than one: the aura carries the pools of accent and
        the ruled grid, the grain sits over it unmasked. Both are `fixed`, so
        neither can widen the document — which is what the six-width
        sideways-scroll suite measures.
      */}
      <div className="aura" aria-hidden />
      <div className="grain" aria-hidden />

      {/* How far down the page the reader has got. Decorative, and absent for
          anybody who asked for stillness. */}
      <ScrollProgress />

      {/* `relative` and above the aura, or the ground would paint over the
          page rather than under it. */}
      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* ------------------------------------------------------------- */}
        <div className="border-b border-border bg-accent-soft">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2 text-xs">
            <p className="text-muted">
              <span className="font-semibold text-text">Demonstration shop.</span>{" "}
              Built by Rahvian. Every product, price and person here is
              invented, and no order placed is ever dispatched.
            </p>

            <VariantSwitcher
              current={variant}
              variants={variants.map((entry) => ({
                slug: entry.slug,
                name: entry.name,
                industryLabel: entry.industryLabel,
              }))}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/*
          Pinned, and translucent over whatever scrolls under it.

          The booking button and the telephone live in this bar, and somebody
          decides to use them two screens down. A header that has scrolled away
          by then costs the enquiry. The blur has a solid fallback in the same
          rule: a translucent bar without it is body text sliding under a header.
        */}
        <header className="site-header sticky top-0 z-50 border-b border-border">
          <div className="container-page flex h-16 items-center gap-4">
            <Link href={base} className="tracking-tight">
              <SiteLogo variant={variant} />
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <SiteNav
                base={base}
                items={nav.map((item) => ({ label: item.label, href: item.href }))}
                cta={{ label: "Shop", href: "/shop" }}
              />

              {/*
                The basket count is rendered on the server, which is why the
                header is not cached. A number that is one behind is worse than
                no number: somebody adds a shirt, the header still says two, and
                they add it again.
              */}
              <Link
                href={`${base}/cart`}
                className="relative inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-2"
              >
                <ShoppingBag className="size-4" aria-hidden />
                <span className="hidden sm:inline">Basket</span>
                {basket > 0 && (
                  <span
                    className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent-fg"
                    aria-label={`${basket} in the basket`}
                  >
                    {basket}
                  </span>
                )}
              </Link>

              <ThemeToggle allowed={variant.allowModeToggle} />
            </div>
          </div>

          {variant.freeShippingAbove !== null && (
            <p className="border-t border-border bg-surface-2 py-1.5 text-center text-xs text-muted">
              Delivery {formatMoney(variant.shippingPaise, variant.currencySymbol)} · free
              over {formatMoney(variant.freeShippingAbove, variant.currencySymbol)}
            </p>
          )}
        </header>

        <main className="flex-1">{children}</main>

        {/* ------------------------------------------------------------- */}
        <footer className="mt-10 border-t border-border bg-surface">
          <div className="container-page grid gap-10 py-14 md:grid-cols-3">
            <div>
              <p className="font-display text-lg font-semibold">{variant.businessName}</p>
              {variant.tagline && (
                <p className="measure mt-2 text-sm text-muted">{variant.tagline}</p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {contact.phone && (
                <p className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-accent" aria-hidden />
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:underline">
                    {contact.phone}
                  </a>
                </p>
              )}
              {contact.email && (
                <p className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-accent" aria-hidden />
                  <a href={`mailto:${contact.email}`} className="hover:underline">
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.address && (
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                  {contact.address}
                </p>
              )}
            </div>

            {contact.hours && (
              <div className="text-sm">
                <p className="font-medium">When we are open</p>
                <p className="mt-2 text-muted">{contact.hours}</p>
              </div>
            )}
          </div>

          <div className="border-t border-border">
            <p className="container-page py-5 text-xs text-muted">
              A demonstration built by Rahvian Technologies Private Limited. Not a real
              shop — nothing ordered here is ever dispatched, and no payment is
              ever taken.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
