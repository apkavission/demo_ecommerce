import { BrandLoader } from "@/components/brand/brand-loader";

/** A page that is being fetched. One boundary for every address a business made. */
export default function Loading() {
  return <BrandLoader overlay showLabel />;
}
