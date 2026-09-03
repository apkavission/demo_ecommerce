import { BrandLoader } from "@/components/brand/brand-loader";

/**
 * The wait, at the very top of the tree.
 *
 * Covers the bare address — which reads the default business and redirects —
 * and the expired screen, which reads a link's state to say why it stopped
 * working. Both are database round trips, and both are the first thing a
 * prospect ever sees from us.
 */
export default function Loading() {
  return <BrandLoader overlay size="lg" />;
}
