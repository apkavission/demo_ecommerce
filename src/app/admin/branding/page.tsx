import { redirect } from "next/navigation";

/**
 * The Brand screen, folded into Website.
 *
 * The logo, the share card and the words in a search result are now one section
 * of `/admin/website`, beside the name they belong with — a business's mark and
 * a business's name were two screens for no reason other than the order they
 * were built in.
 *
 * This file stays as a redirect rather than being deleted, because the address
 * is in the panel's own history, in bookmarks and in the notes written while
 * the screen was being built. A 404 for a screen that moved is a bug report
 * somebody has to answer.
 */
export default function BrandingMoved() {
  redirect("/admin/website");
}
