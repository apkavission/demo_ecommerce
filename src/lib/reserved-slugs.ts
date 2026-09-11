/**
 * The addresses this demo already uses.
 *
 * ---------------------------------------------------------------------------
 * **In its own file because the panel needs it in a browser.** Next resolves a
 * static segment before a dynamic one, so a page saved as one of these would be
 * written, published, listed in the panel — and never rendered, because a file
 * answers first. Both ends check it: the editor greys the address as it is
 * typed, and the action refuses it on save.
 *
 * It lived in `lib/pages.ts`, which imports `server-only` — and importing a
 * value out of that module into a client component **fails the production
 * build**, while `next dev`, `tsc --noEmit` and `eslint` all stay silent:
 *
 *     Error: 'server-only' cannot be imported from a Client Component module
 *       ./src/lib/supabase/server.ts
 *       ./src/lib/pages.ts
 *       ./src/components/admin/page-editor.tsx
 *
 * A type crosses that line for free, because it is erased. A `const` does not.
 * That is why this is six words in a file of its own rather than a line in the
 * file it belongs to.
 *
 * Read off the route folders rather than typed out, so a demo that gains a
 * route does not quietly start shadowing somebody's page.
 */
export const RESERVED_SLUGS = ["cart", "checkout", "contact", "order", "people", "questions", "reviews", "shop"] as const;
