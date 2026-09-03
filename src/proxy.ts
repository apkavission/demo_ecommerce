import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA, SHARE_COOKIE } from "@/lib/supabase/constants";

/**
 * Who gets in, and to what.
 *
 * Four jobs, in this order, and the order is not arbitrary:
 *
 *   1. **Redeem a share link.** `/s/<token>` sets the cookie and sends the
 *      visitor to the variant that link opens.
 *   2. **Decide whether this variant may be seen.** Since 2026-09-03 that means
 *      only a browser holding a live link for *that* variant — every business
 *      is link-only unless somebody deliberately opens it to the world.
 *   3. **Count the visit**, at most once every half hour.
 *   4. **Keep a prospect away from the admin**, which is behind a real sign-in
 *      anyway but should not even be findable from a share link.
 *
 * ---------------------------------------------------------------------------
 * **The check is a database call on every demo request, on purpose.**
 *
 * The alternative — trusting a cookie that says "this browser may see dental
 * until December" — cannot be taken back. The case that matters is not a link
 * expiring on schedule; it is the wrong link sent to the wrong person, noticed
 * ten minutes later. A row can be revoked; a cookie already in somebody's
 * browser cannot.
 *
 * The cookie therefore holds the token and nothing else. It is a hint about
 * *which* link to check, never a grant, and nothing in it is trusted.
 */

/**
 * The two cookies beside the share cookie, named from it.
 *
 * Derived rather than declared, because the prefix is the one thing that
 * differs between the six demos and a fork that hand-copies three cookie names
 * will eventually give one demo another's. There is exactly one name here to
 * get wrong, and it is already right.
 */
const SEEN_COOKIE = `${SHARE_COOKIE}-seen`;
const WHY_COOKIE = `${SHARE_COOKIE}-why`;

/** How long one sitting lasts. Matches the window the database enforces. */
const VISIT_WINDOW_MS = 30 * 60 * 1000;

/** The token this browser is carrying, if any. */
function shareToken(request: NextRequest): string | null {
  return request.cookies.get(SHARE_COOKIE)?.value ?? null;
}

function anonClient() {
  /*
    No cookie plumbing here, deliberately.

    This client only calls `can_view`, which is `security definer` and takes the
    token as an argument. Giving it the request's auth cookies would make an
    admin's own session change the answer — and then a link that looks fine to
    whoever is testing it would be dead for the prospect.
  */
  return createServerClient<Database, typeof DB_SCHEMA>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: DB_SCHEMA },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}

/**
 * Has this browser been counted recently?
 *
 * **The cookie is an optimisation, not the rule.** `note_share_visit` refuses to
 * count twice inside half an hour whatever it is told, so a visitor who clears
 * cookies between pages inflates nothing. What this saves is the round trip: a
 * prospect reading six pages makes one call instead of six.
 */
function dueToBeCounted(request: NextRequest): boolean {
  const seen = request.cookies.get(SEEN_COOKIE)?.value;
  if (!seen) return true;

  const at = Number(seen);
  return !Number.isFinite(at) || Date.now() - at > VISIT_WINDOW_MS;
}

/**
 * Record that somebody opened the link, and remember not to record it again.
 *
 * The browser and the referrer go with it. Nothing else does — no address,
 * nothing that follows a person between visits. This is a record of our own
 * sales link being used, not surveillance of somebody we are pitching to.
 */
async function countVisit(
  supabase: ReturnType<typeof anonClient>,
  request: NextRequest,
  token: string,
  response: NextResponse,
): Promise<void> {
  await supabase.rpc("note_share_visit", {
    p_token: token,
    p_user_agent: request.headers.get("user-agent"),
    p_referrer: request.headers.get("referer"),
  });

  response.cookies.set(SEEN_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: VISIT_WINDOW_MS / 1000,
  });
}

/**
 * Send them to the screen that explains, carrying the token so it can.
 *
 * **The token travels in a cookie rather than in the address.** `/expired?t=…`
 * would put a live secret into browser history, into the referrer of every
 * outbound click on that page, and into any log that records paths. This holds
 * it for ten minutes, on that one path, where only the server reads it.
 *
 * It is not a grant: `can_view` never looks at this cookie, and the screen that
 * does can only ever learn what happened to a token the visitor already has.
 */
function toExpired(request: NextRequest, token: string | null): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/expired";
  url.search = "";

  const response = NextResponse.redirect(url);

  if (token) {
    response.cookies.set(WHY_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/expired",
      maxAge: 600,
    });
  }

  return response;
}

/**
 * Paths that are not a business, and must never be gated.
 *
 * `robots.txt` is the one that was missing, and its absence was self-defeating:
 * the proxy answered it with a redirect to the expired screen, so a crawler
 * asking "what am I allowed to fetch here?" was told nothing and carried on
 * fetching. The file exists to say "nothing" — it has to be reachable to say
 * it. `sitemap.xml` is here for the same reason, and `.well-known` because
 * certificate renewal and app association files are fetched by machines that
 * will never hold a share link.
 */
const RESERVED = new Set([
  "admin",
  "api",
  "s",
  "expired",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  ".well-known",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------------------------------------------------------------- 1. redeem */
  if (pathname.startsWith("/s/")) {
    const token = pathname.slice(3).split("/")[0];
    const supabase = anonClient();

    const { data } = await supabase.rpc("can_view", {
      p_slug: "",
      p_token: token,
    });

    const verdict = data?.[0];

    if (!verdict || !verdict.allowed_slug) {
      /* Carrying the token, so the screen can say *which* thing went wrong —
         expired on Friday, closed by hand, or never a link at all. */
      return toExpired(request, token);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${verdict.allowed_slug}`;
    url.search = "";

    const response = NextResponse.redirect(url);

    response.cookies.set(SHARE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      /* Thirty days at most, and the row decides the real answer every time.
         This is only how long the browser bothers to keep the hint. */
      maxAge: 60 * 60 * 24 * 30,
    });

    await countVisit(supabase, request, token, response);

    return response;
  }

  /* ------------------------------------------------------- 2. the demo itself */
  const segment = pathname.split("/")[1] ?? "";
  const token = shareToken(request);

  if (pathname.startsWith("/admin")) {
    /* A prospect holding a share link has no business here, and should not even
       find the sign-in page. */
    if (token) {
      const supabase = anonClient();
      const { data } = await supabase.rpc("can_view", { p_slug: "", p_token: token });
      const home = data?.[0]?.allowed_slug;

      if (home) {
        const url = request.nextUrl.clone();
        url.pathname = `/${home}`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  if (segment && !RESERVED.has(segment)) {
    const supabase = anonClient();

    const { data, error } = await supabase.rpc("can_view", {
      p_slug: segment,
      p_token: token,
    });

    if (error) {
      /*
        The database could not answer, so this request is refused.

        **This used to let the request through**, on the reasoning that showing
        "expired" to somebody whose link is fine sends them to us with a problem
        that does not exist. That reasoning died on 2026-09-03, when every
        business became link-only: letting it through now means a stranger reads
        the demo because our database had a bad minute. A visitor inconvenienced
        for thirty seconds is the cheaper mistake, and the screen tells them to
        try again rather than blaming their link.
      */
      console.error("[proxy] can_view failed:", error.message);
      return toExpired(request, null);
    }

    const verdict = data?.[0]?.verdict;
    const allowed = data?.[0]?.allowed_slug;

    if (verdict === "wrong_link" && allowed) {
      const url = request.nextUrl.clone();
      url.pathname = `/${allowed}`;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (verdict === "needs_link" || verdict === "unknown") {
      return toExpired(request, token);
    }

    /* ------------------------------------------------------------ 3. count it */
    if (token && dueToBeCounted(request)) {
      const response = NextResponse.next();
      await countVisit(supabase, request, token, response);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
