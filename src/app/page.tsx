import { redirect } from "next/navigation";
import { getDefaultVariant } from "@/lib/variants";

/**
 * The bare address goes to whichever shop is marked default.
 *
 * A redirect rather than rendering the default here, because every variant must
 * have its own address: a link somebody sends has to open the business they were
 * looking at, and `/` showing the clothing shop would be an address that means
 * something different depending on when it was opened.
 */
export default async function Root() {
  const variant = await getDefaultVariant();

  if (!variant) {
    /* No variants at all — the migrations have not been run, or every one is
       switched off. The expired screen says what to do about it in words rather
       than throwing a stack trace at a prospect. */
    redirect("/expired");
  }

  redirect(`/${variant.slug}`);
}
