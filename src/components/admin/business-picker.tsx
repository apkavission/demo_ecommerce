import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Which business is being edited.
 *
 * **The choice lives in the address, not in a store.** A panel screen is
 * something people leave open in a tab, send to a colleague, and come back to
 * tomorrow — all of which give back the wrong business if the choice was kept
 * in memory. It also means the back button does what it looks like it does.
 *
 * Repeated at the top of every content screen rather than moved into the
 * layout, because the layout does not know which screen wants it: brand and
 * share links pick a business differently, and a picker that appears above a
 * screen it does not steer is worse than none.
 */
export function BusinessPicker({
  basePath,
  variants,
  current,
}: {
  basePath: string;
  variants: { slug: string; name: string }[];
  current: string;
}) {
  if (variants.length <= 1) return null;

  return (
    <nav aria-label="Business" className="mt-8 flex flex-wrap gap-2">
      {variants.map((entry) => (
        <Link
          key={entry.slug}
          /* Concatenated rather than interpolated: nothing here needs a
             template literal, and one inside a generated file is one more
             layer of escaping to get wrong. */
          href={basePath + "?variant=" + entry.slug}
          aria-current={entry.slug === current ? "page" : undefined}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            entry.slug === current
              ? "border-accent bg-accent-soft font-semibold text-accent"
              : "border-border text-muted hover:bg-surface-2 hover:text-text",
          )}
        >
          {entry.name}
        </Link>
      ))}
    </nav>
  );
}
