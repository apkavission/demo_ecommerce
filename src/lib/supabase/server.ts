import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { clientEnv } from "@/lib/env";
import { DB_SCHEMA, SHARE_COOKIE } from "@/lib/supabase/constants";

/**
 * The invitation, carried to the database.
 *
 * ---------------------------------------------------------------------------
 * **Row security asks for this now.** Until it did, every `*_public_read`
 * policy in this schema asked only whether a row was finished — never who was
 * asking — so a request holding nothing but the publishable key could read
 * every business's published content. The gate was real, but it lived entirely
 * in `proxy.ts`, and `proxy.ts` is not what answers a request to PostgREST.
 *
 * **A header rather than a cookie.** Supabase's cookies belong to the auth
 * session and are parsed as such; an extra one would be ignored. PostgREST
 * publishes the request's headers as `request.headers`, which is what
 * `visitor_token()` reads.
 *
 * **Absent is a valid answer.** No cookie means no header, which means the
 * database sees a visitor with no invitation — correct for somebody who has
 * arrived without a link, and for the panel, where `is_admin()` answers
 * instead.
 */
function shareToken(store: Awaited<ReturnType<typeof cookies>>) {
  return store.get(SHARE_COOKIE)?.value ?? null;
}

/**
 * The client for a signed-in request.
 *
 * Reads and writes the session cookie, so every query it makes runs **as that
 * person** and row-level security decides what comes back. This is the client
 * almost everything should use: it is the layer that cannot be forgotten,
 * because the database applies it whether or not the code remembered to.
 *
 * Cookie writes are wrapped because a Server Component is not allowed to set
 * one. That is not an error to fix here — the refresh happens in `proxy.ts`,
 * which runs before rendering and can write. Swallowing it keeps a read-only
 * render from crashing on a token that was refreshed a moment ago anyway.
 */
export async function createClient() {
  const store = await cookies();
  const token = shareToken(store);

  return createServerClient<Database, typeof DB_SCHEMA>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: DB_SCHEMA },
      global: { headers: token ? { "x-share-token": token } : {} },
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options);
            }
          } catch {
            // A Server Component render. See the note above.
          }
        },
      },
    },
  );
}
