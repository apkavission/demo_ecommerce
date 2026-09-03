import type { MetadataRoute } from "next";

/**
 * Nothing here is for a search engine.
 *
 * ---------------------------------------------------------------------------
 * **Why a demonstration site refuses every crawler.**
 *
 * These are invented businesses with invented staff and invented prices. A
 * search result for one of them leading a real person to this shop is the
 * single failure this application could cause in the world — somebody ringing a
 * number that belongs to nobody about an appointment that does not exist.
 *
 * ---------------------------------------------------------------------------
 * **This is not the same job as the `noindex` in `layout.tsx`, and both are
 * needed.**
 *
 * The meta tag says "having read this page, do not list it". This says "do not
 * ask for it". Since a demo became something opened by invitation, an uninvited
 * request is not merely wasted — it is a database round trip and an expired
 * screen served to a robot.
 *
 * There was no robots.txt at all until 2026-09-03. A missing one answers 404,
 * which a crawler reads as "no rules here".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
