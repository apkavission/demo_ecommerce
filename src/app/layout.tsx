import type { Metadata } from "next";
import {
  DM_Sans,
  DM_Serif_Display,
  Fraunces,
  Inter,
  Lato,
  Manrope,
  Playfair_Display,
  Sora,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { BusyProvider } from "@/components/brand/busy-overlay";

/**
 * Every family a business may be set in, built here and chosen per request.
 *
 * `next/font` self-hosts from a literal call at build time, so the whole list
 * has to exist in the bundle before a database row can name one of them. The
 * row stores a key into `lib/fonts.ts`; `themeCss()` points `--font-heading`
 * and `--font-body` at the pair that key names.
 *
 * **Nine families in the CSS is not nine downloads.** Each `@font-face` is
 * declared, and a browser fetches a face only when something on the page is set
 * in it — which, on any one variant, is two of them.
 *
 * Written out one by one because they must be: `next/font` reads its options at
 * compile time, so a loop over a list of names does not compile.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
/* Lato has no variable axis, so the weights it is used at are named. */
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});
/* A display face at one weight, which is all it ships. */
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const FONT_VARIABLES = [
  inter.variable,
  sora.variable,
  fraunces.variable,
  playfair.variable,
  lato.variable,
  grotesk.variable,
  dmSerif.variable,
  dmSans.variable,
  manrope.variable,
].join(" ");

export const metadata: Metadata = {
  /*
    Named for the company that built it, not just for the demo.

    A tab reading "Clinic demo" tells a prospect nothing about who made it —
    and a demo is a sales document. The template puts every inner page under
    the same name, so a client browsing five pages of a demo sees Rahvian
    on every one of them.
  */
  title: {
    default: "Store demo · Rahvian",
    template: "%s · Store demo · Rahvian",
  },
  /*
    No demo is ever indexed.

    These are invented shops with invented stock and invented prices. A search
    result for "Kora Label" leading somebody to a shop that cannot actually
    send them a shirt is the one failure this application could cause in the
    world, and it costs one line to prevent.
  */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The document, and the one script that runs before it paints.
 *
 * The theme choice is applied by a blocking inline script rather than by React,
 * because React runs after the first paint: a person who chose dark would see a
 * white page flash first, every single time. Three lines of blocking script is
 * the correct trade against that.
 *
 * The variant's own palette arrives lower down, in `[variant]/layout.tsx` — this
 * only decides light or dark.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={FONT_VARIABLES}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem("demo-shop-theme");if(c==="dark"||c==="light"){document.documentElement.setAttribute("data-theme",c)}}catch(e){}})();`,
          }}
        />
      </head>
      <body><BusyProvider>{children}</BusyProvider></body>
    </html>
  );
}
