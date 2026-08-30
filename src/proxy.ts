import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA, SHARE_COOKIE } from "@/lib/supabase/constants";

/**
 * Who gets in, and to what.
 *
 * Three jobs, in this order, and the order is not arbitrary:
 *
 *   1. **Redeem a share link.** `/s/<token>` sets the cookie and sends the
 *      visitor to the variant that link opens.
 *   2. **Decide whether this variant may be seen.** Public variants: anybody.
 *      Link-only ones: only a browser holding a live link for *that* variant.
 *   3. **Refresh the admin session**, for the panel.
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
 *
 * ---------------------------------------------------------------------------
 * **A share link never reaches the admin.**
 *
 * The panel is behind a real sign-in, so a prospect could not use it anyway —
 * but they should not find the door. Any request for `/admin` from a browser
 * holding a share cookie is sent back to the demo it was given.
 */

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

const RESERVED = new Set(["admin", "api", "s", "expired", "_next", "favicon.ico"]);

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
      const url = request.nextUrl.clone();
      url.pathname = "/expired";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Counted once, here, rather than on every page they then read.
    await supabase.rpc("note_share_visit", { p_token: token });

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
        The database could not answer. Let the request through to the page,
        which will fail to find the variant and say so — rather than showing
        "this link has expired" to somebody whose link is fine, which would send
        them to us with a problem that does not exist.
      */
      console.error("[proxy] can_view failed:", error.message);
      return NextResponse.next();
    }

    const verdict = data?.[0]?.verdict;
    const allowed = data?.[0]?.allowed_slug;

    if (verdict === "wrong_link" && allowed) {
      const url = request.nextUrl.clone();
      url.pathname = `/${allowed}`;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (verdict === "needs_link") {
      const url = request.nextUrl.clone();
      url.pathname = "/expired";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
