import { BrandLoader } from "@/components/brand/brand-loader";

/** The panel's wait. One boundary above every admin screen. */
export default function Loading() {
  return <BrandLoader overlay showLabel />;
}
