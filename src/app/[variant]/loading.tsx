import { BrandLoader } from "@/components/brand/brand-loader";

/**
 * The wait, on every page of the store.
 *
 * One boundary at the variant rather than one per page: every public route is
 * a child of this segment, so this is the closest `loading.tsx` above any of
 * them and Next shows it for all of them — the shop, a product, the cart, the
 * checkout and an order.
 *
 * Before this the store had no loading state at all, so a click sat on the old
 * page with nothing on screen to say it had been heard.
 */
export default function Loading() {
  return <BrandLoader overlay showLabel />;
}
