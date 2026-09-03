import Image from "next/image";
import type { Variant } from "@/lib/variants";

/**
 * A business's mark, or its name set as type.
 *
 * ---------------------------------------------------------------------------
 * **Both logos are rendered, and CSS chooses.**
 *
 * A theme toggle changes the page without a request, so picking the file on the
 * server would give whoever toggles the wrong mark until they reload. Two
 * images and `dark:` costs one extra download of a small file and is right in
 * every case — including the reader whose system flips to dark at sunset while
 * the page is open.
 *
 * ---------------------------------------------------------------------------
 * **The name is printed beside the mark only when the mark does not say it.**
 *
 * A lockup with the name repeated next to it is the commonest way a site with a
 * perfectly good logo looks amateur. `logoShowsName` is the field the branding
 * screen sets for exactly this.
 *
 * ---------------------------------------------------------------------------
 * **`object-contain`, never `object-cover`.** The standing rule in this estate
 * is that an uploaded image is never cut. A logo cropped to fill a header is a
 * logo somebody approved and then found trimmed.
 */
export function SiteLogo({ variant }: { variant: Variant }) {
  const { light, dark } = variant.logo;
  const hasMark = Boolean(light || dark);

  if (!hasMark) {
    return (
      <span className="font-display text-lg font-semibold tracking-tight">
        {variant.businessName}
      </span>
    );
  }

  /* One file given and not the other: it is shown in both modes rather than
     disappearing in one. Imperfect and visible beats correct and absent. */
  const forLight = light ?? dark;
  const forDark = dark ?? light;

  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={forLight as string}
        alt={variant.logoShowsName ? variant.businessName : ""}
        width={180}
        height={40}
        unoptimized
        priority
        className="h-8 w-auto object-contain dark:hidden"
      />
      <Image
        src={forDark as string}
        alt={variant.logoShowsName ? variant.businessName : ""}
        width={180}
        height={40}
        unoptimized
        priority
        className="hidden h-8 w-auto object-contain dark:block"
      />

      {!variant.logoShowsName && (
        <span className="font-display text-lg font-semibold tracking-tight">
          {variant.businessName}
        </span>
      )}
    </span>
  );
}
