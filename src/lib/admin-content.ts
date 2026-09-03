import "server-only";

import { createClient } from "@/lib/supabase/server";
import { clientEnv } from "@/lib/env";

/**
 * What the panel reads.
 *
 * ---------------------------------------------------------------------------
 * **Separate from `variants.ts` on purpose.** Every query there ends in
 * `.eq("status", "published")`, because it answers for the public site. A
 * panel built on those would show only the rows that are already finished, and
 * an editing screen that cannot see a draft is an editing screen that cannot
 * be used to write one.
 *
 * ---------------------------------------------------------------------------
 * **Nothing here is cached.** `variants.ts` wraps its queries in `cache()`
 * because a page renders the same business several times in one pass. A panel
 * shows a list once and must show it as it is *now* — a stale row after a save
 * is read as a save that did not work.
 */

/** A picture's public address, composed rather than stored. */
const BUCKET = "demo-media";

export function mediaUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;

  return `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageKey}`;
}

export interface TestimonialAdminRow {
  id: string;
  author: string;
  roleLabel: string | null;
  quote: string;
  rating: number | null;
  status: string;
  sortOrder: number;
}

export interface FaqAdminRow {
  id: string;
  question: string;
  answer: string;
  status: string;
  sortOrder: number;
}

export interface NavAdminRow {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MessageAdminRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface MediaAdminRow {
  id: string;
  storageKey: string;
  url: string;
  filename: string;
  alt: string;
  mimeType: string | null;
  createdAt: string;
  /** Where it is used, so nothing is deleted out from under a page. */
  usedBy: string[];
}

/* -------------------------------------------------------------------------- */

export async function getTestimonialsForAdmin(variantId: string): Promise<TestimonialAdminRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("id, author, role_label, quote, rating, status, sort_order")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) {
    console.error("[panel] testimonials:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    author: row.author,
    roleLabel: row.role_label,
    quote: row.quote,
    rating: row.rating,
    status: row.status,
    sortOrder: row.sort_order,
  }));
}

export async function getFaqsForAdmin(variantId: string): Promise<FaqAdminRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, status, sort_order")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) {
    console.error("[panel] faqs:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    status: row.status,
    sortOrder: row.sort_order,
  }));
}

export async function getNavForAdmin(variantId: string): Promise<NavAdminRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nav_items")
    .select("id, label, href, sort_order, is_active")
    .eq("variant_id", variantId)
    .order("sort_order");

  if (error) {
    console.error("[panel] nav:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    href: row.href,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

export async function getMessagesForAdmin(variantId: string): Promise<MessageAdminRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("id, name, email, phone, body, is_read, created_at")
    .eq("variant_id", variantId)
    /* Unread first, then newest. The list is a queue, not an archive: what has
       not been answered belongs at the top whatever day it arrived. */
    .order("is_read")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[panel] messages:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

/**
 * Every picture, and what would break if it went.
 *
 * The three logo columns on `variants` point at these rows, and the database
 * will refuse a delete that would strand one. Rather than let somebody meet
 * that as a foreign-key error, the screen is told which businesses use a file
 * and hides the delete.
 */
export async function getMediaForAdmin(): Promise<MediaAdminRow[]> {
  const supabase = await createClient();

  const [{ data, error }, uses] = await Promise.all([
    supabase
      .from("media")
      .select("id, storage_key, filename, alt, mime_type, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("variants").select("business_name, logo_light_id, logo_dark_id, og_image_id"),
  ]);

  if (error) {
    console.error("[panel] media:", error.message);
    return [];
  }

  const usedBy = new Map<string, string[]>();

  for (const variant of uses.data ?? []) {
    for (const id of [variant.logo_light_id, variant.logo_dark_id, variant.og_image_id]) {
      if (!id) continue;
      if (!usedBy.has(id)) usedBy.set(id, []);
      const list = usedBy.get(id);
      if (list && !list.includes(variant.business_name)) list.push(variant.business_name);
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    storageKey: row.storage_key,
    url: mediaUrl(row.storage_key) as string,
    filename: row.filename,
    alt: row.alt,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    usedBy: usedBy.get(row.id) ?? [],
  }));
}
