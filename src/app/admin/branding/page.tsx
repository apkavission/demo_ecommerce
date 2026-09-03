import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { BrandEditor } from "@/components/admin/brand-editor";

export const metadata: Metadata = { title: "Brand" };

/**
 * A business's mark, and what a search result says about it.
 *
 * ---------------------------------------------------------------------------
 * **Every field here was already in the schema and had never been reachable.**
 * `logo_light_id`, `logo_dark_id` and `og_image_id` have been on `variants`
 * since it was written, all null, because there was no screen and no bucket.
 *
 * ---------------------------------------------------------------------------
 * **Two logos, not one.** A mark drawn for a white page disappears on a dark
 * one, and a demo can be read in either — the site has a theme toggle. Giving
 * one file and hoping is how a logo vanishes for half the people who open it.
 *
 * ---------------------------------------------------------------------------
 * **A super admin's screen**, because this is what every future prospect sees
 * rather than this week's content.
 */
export default async function BrandPage() {
  await requireSuperAdmin();

  const businesses = await getBranding();

  return (
    <div className="container-page py-10">
      <header>
        <h1 className="font-display display-2 font-semibold">Brand</h1>
        <p className="measure mt-2 text-muted">
          Each business carries its own mark and its own words in a search
          result. Nothing here is required — anything left empty falls back to
          the business name, so a demo built this afternoon still looks finished.
        </p>
      </header>

      {businesses.length === 0 ? (
        <p className="mt-10 rounded-[var(--radius-card)] border border-dashed border-border p-8 text-sm text-muted">
          No businesses yet.
        </p>
      ) : (
        <ul className="mt-10 space-y-6">
          {businesses.map((business) => (
            <li key={business.id}>
              <BrandEditor business={business} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
