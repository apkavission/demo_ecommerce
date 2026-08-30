import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import { SiteNav, ThemeToggle, VariantSwitcher } from "@/components/site/chrome";
import { themeCss } from "@/lib/theme";
import { getNav, getVariant, listVariants } from "@/lib/variants";
import { cartCount } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

type Props = {
  children: React.ReactNode;
  params: Promise<{ variant: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = await getVariant(slug);

  if (!variant) return { title: "Not found" };

  return {
    title: {
      default: `${variant.businessName} — ${variant.tagline ?? variant.industryLabel}`,
      template: `%s — ${variant.businessName}`,
    },
    description: variant.description ?? undefined,
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
 * demonstration built by Apka Vission, with invented stock and invented prices.
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

      <div className="flex min-h-dvh flex-col">
        {/* ------------------------------------------------------------- */}
        <div className="border-b border-border bg-accent-soft">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2 text-xs">
            <p className="text-muted">
              <span className="font-semibold text-text">Demonstration shop.</span>{" "}
              Built by Apka Vission. Every product, price and person here is
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
        <header className="relative border-b border-border bg-surface">
          <div className="container-page flex h-16 items-center gap-4">
            <Link href={base} className="font-display text-lg font-semibold tracking-tight">
              {variant.businessName}
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
        <footer className="mt-20 border-t border-border bg-surface">
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
              A demonstration built by Apka Saathi Private Limited. Not a real
              shop — nothing ordered here is ever dispatched, and no payment is
              ever taken.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
