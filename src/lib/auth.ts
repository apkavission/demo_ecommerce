import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_KEY } from "@/lib/supabase/constants";

/**
 * Who is running the panel.
 *
 * ---------------------------------------------------------------------------
 * **There is no account list in this application, and there must not be one.**
 *
 * The estate has exactly one: `company.profiles` in the company website, with a
 * role from `company.roles` and an `app_access` array saying which of the six
 * applications each account may reach. This schema reads its own row of that
 * through `demo_shop.me`, a view that returns the caller and nobody else.
 *
 * A second list here would mean adding a colleague twice, and removing them
 * once — which is the failure that matters, because the one you forget is the
 * one that keeps working.
 *
 * ---------------------------------------------------------------------------
 * **Two levels, because the owner asked for a dashboard that differs by role.**
 *
 *   **admin** — the content: services, doctors, reviews, questions, and the
 *   appointments and messages that come in. The day-to-day.
 *   **super admin** — everything above, plus the two things that decide what
 *   this demo *is*: which businesses exist, and who has been sent a link to
 *   which one.
 *
 * The split is not cosmetic. Issuing a share link is handing somebody outside
 * the company a view of our work, and cloning a variant changes what every
 * future prospect sees. Both belong with whoever is accountable for the estate,
 * which is the same person `is_owner` already identifies everywhere else.
 */

export interface AdminSession {
  id: string;
  name: string;
  roleKey: string | null;
  roleLabel: string;
  isSuperAdmin: boolean;
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("me")
    .select("id, full_name, role_key, role_label, is_owner, app_access, is_active")
    .maybeSingle();

  if (error) {
    console.error("[auth] could not read the account:", error.message);
    return null;
  }

  /*
    Three conditions, and all three are needed.

    An inactive account, one whose role has been deleted, or one without
    this application in its access list is not an administrator here — and the last is
    the one that does the work: it is how one login reaches the company website
    and not this, or both, decided in one place.
  */
  if (!data || !data.is_active) return null;
  if (!(data.app_access ?? []).includes(APP_KEY)) return null;

  return {
    /* The view can return a null id only if the row vanished between the auth
       call and this query, which the guard above already covers — but the
       generated type says nullable because a view's columns always are, so the
       fallback is the honest way to satisfy it. */
    id: data.id ?? user.id,
    name: data.full_name || "there",
    roleKey: data.role_key,
    roleLabel: data.role_label ?? data.role_key ?? "No role",
    isSuperAdmin: Boolean(data.is_owner),
  };
});

/**
 * May this account change prices and content?
 *
 * **Asked of the database rather than worked out from the role label**, because
 * `demo_shop.is_manager()` is the same function the row policies use. Two
 * answers to one question is how a panel ends up showing a button that the
 * database then refuses — and the refusal arrives as zero rows changed, which
 * looks exactly like success.
 *
 * Three tiers exist in this demo and only this one:
 *
 *   staff    — orders and messages. Reads the catalogue, changes no price.
 *   manager  — the catalogue, the codes, the content.
 *   super    — which shops exist, and who has been sent a link to which.
 */
export const isManager = cache(async (): Promise<boolean> => {
  const session = await getAdminSession();
  if (!session) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_manager");

  if (error) {
    console.error("[auth] is_manager failed:", error.message);
    return false;
  }

  return Boolean(data);
});

/** Signed in and allowed here, or sent to the sign-in screen. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * A super admin, or nothing.
 *
 * `notFound()` rather than a refusal message, for the screens that only they
 * have: a page somebody may not open should answer as though it does not exist.
 * A refusal that explains itself has told them the screen is there.
 */
export async function requireSuperAdmin(): Promise<AdminSession> {
  const session = await requireAdmin();

  if (!session.isSuperAdmin) {
    const { notFound } = await import("next/navigation");
    notFound();
  }

  return session;
}
