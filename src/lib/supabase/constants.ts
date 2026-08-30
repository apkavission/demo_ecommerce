/**
 * The schema this application reads.
 *
 * Its own, and nobody else's. Where the tracker and the panel deliberately share
 * `portal` — because they are two views of one company's work — a demo shares
 * nothing with anything. `demo_crm` holds three invented clinics, and a
 * migration here cannot reach any real data because there is none within reach.
 *
 * The one exception is deliberate and one-directional: `demo_crm.is_admin()`
 * reads `company.profiles` to answer "may this account open the panel", so the
 * estate has one account list rather than six. It reads two columns of one row
 * and fails towards "not an admin".
 */
export const DB_SCHEMA = "demo_shop" as const;

/**
 * What this application is called in an account's `app_access` list.
 *
 * **It lives here, beside `DB_SCHEMA`, because those two must agree and the
 * fork that copies this file is where they stop agreeing.** Four demo panels
 * were forked from the clinic and every one of them kept asking for `clinic`
 * access in `auth.ts` -- a string in the middle of a file nobody re-reads. An
 * account with the right access for its own demo could not open it, and an
 * account with the clinic's could open all of them.
 *
 * One value, one place, next to the other value it has to match.
 */
export const APP_KEY = "shop" as const;


/** The cookie prefix Supabase writes. Used to tell "has a session" cheaply. */
export const AUTH_COOKIE_PREFIX = "sb-";

/**
 * The cookie a share link leaves behind.
 *
 * Holds the variant the link opened and nothing else — no token, no expiry, no
 * claim the browser could edit. Every request re-checks the link against the
 * database, so this cookie is a hint about *which* link, never a grant.
 */
export const SHARE_COOKIE = "demo-ecommerce-share";
