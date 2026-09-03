import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { getMediaForAdmin } from "@/lib/admin-content";
import { MediaTile, MediaUpload } from "@/components/admin/content-editors";

export const metadata: Metadata = { title: "Pictures" };

/**
 * Every picture in this demo, in one place.
 *
 * **Shared across the businesses rather than divided between them.** A demo's
 * three variants are the same company shown three ways, and a library split
 * three times is three copies of the same logo.
 */
export default async function MediaPage() {
  await requireSuperAdmin();

  const media = await getMediaForAdmin();

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Pictures</h1>
        <p className="measure mt-2 text-muted">
          Everything uploaded for this demo. A picture in use somewhere cannot be
          removed until it is taken off there — the site would be left pointing
          at nothing.
        </p>
      </header>

      <div className="mt-8">
        <MediaUpload />
      </div>

      {media.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center text-sm text-muted">
          Nothing uploaded yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
            <MediaTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
