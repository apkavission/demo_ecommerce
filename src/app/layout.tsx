import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Sora({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: "Store demo",
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
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${heading.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem("demo-shop-theme");if(c==="dark"||c==="light"){document.documentElement.setAttribute("data-theme",c)}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
