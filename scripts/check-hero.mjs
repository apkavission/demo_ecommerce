/**
 * Does the banner hero actually render, and is the headline readable on it?
 *
 * ---------------------------------------------------------------------------
 * **Why this cannot be checked by looking at the demo.** No business in this
 * estate has a banner — every `media` table is empty — so the hero on screen is
 * always the third of its three states, the wash. The state the owner asked for
 * is the one nothing exercises, which is exactly the kind of path that ships
 * broken: `variants.theme` carried a typeface for a fortnight that nothing read.
 *
 * So this makes a banner, puts it on, photographs it, and takes it off again —
 * the file deleted from the bucket, the media row deleted, the column set back
 * to null. The last check is that the business was left as it was found.
 *
 * **The banner it makes is not a photograph.** It is a wide gradient built from
 * that business's own palette, which is honest about what it is: something to
 * prove the layer, the scrim and the type work. A stock photograph would prove
 * the same thing and leave a lie in the picture library.
 *
 *     npm run dev
 *     npm run check:hero
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3800";
const OUT = process.argv[2] ?? resolve(PROJECT, "test-results/hero");

const SCHEMA = /DB_SCHEMA = "([a-z_]+)"/.exec(
  readFileSync(resolve(PROJECT, "src/lib/supabase/constants.ts"), "utf8"),
)?.[1];

if (!SCHEMA) throw new Error("DB_SCHEMA is not in src/lib/supabase/constants.ts");

mkdirSync(OUT, { recursive: true });

const say = (...args) => console.log(...args);
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  say(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

function env(key) {
  const file = resolve(PROJECT, ".env.local");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
}

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  db: { schema: SCHEMA },
  auth: { persistSession: false },
});

const { data: variant } = await db
  .from("variants")
  .select("id, slug, business_name, theme, hero_image_id, hero_video_url")
  .eq("is_active", true)
  .order("sort_order")
  .limit(1)
  .maybeSingle();

if (!variant) {
  say(`Could not read ${SCHEMA}.variants. Nothing has been changed.`);
  process.exit(2);
}

/* What the two columns held before anything was touched. */
const before = {
  hero_image_id: variant.hero_image_id,
  hero_video_url: variant.hero_video_url,
};

say(`   ${variant.business_name}  /${variant.slug}`);
say(`   hero before: ${JSON.stringify(before)}`);

const browser = await chromium.launch();

let mediaId = null;
let storageKey = null;
let linkId = null;

try {
  /* ------------------------------------------------------- make a banner -- */
  const maker = await browser.newPage();
  const palette = variant.theme?.light ?? {};

  const png = await maker.evaluate(
    ({ accent, ink, soft }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 2000;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");

      const wash = ctx.createLinearGradient(0, 900, 2000, 0);
      wash.addColorStop(0, ink);
      wash.addColorStop(0.55, accent);
      wash.addColorStop(1, soft);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, 2000, 900);

      /* Something with edges in it, so "the picture is there" is visible in a
         screenshot rather than a guess about a flat fill. */
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 28; i += 1) {
        ctx.beginPath();
        ctx.arc(120 + i * 70, 780 - i * 22, Math.max(8, 140 - i * 3), 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas.toDataURL("image/png");
    },
    {
      accent: palette.accent ?? "#0f766e",
      ink: palette.text ?? "#0b1220",
      soft: palette.accentSoft ?? "#e6f2f1",
    },
  );

  await maker.close();

  const bytes = Buffer.from(png.split(",")[1], "base64");
  storageKey = `${SCHEMA}/${variant.id}/hero-check-${Date.now().toString(36)}.png`;

  const { error: uploaded } = await db.storage
    .from("demo-media")
    .upload(storageKey, bytes, { contentType: "image/png", upsert: false });

  if (uploaded) throw new Error(`upload failed: ${uploaded.message}`);

  const { data: media, error: recorded } = await db
    .from("media")
    .insert({
      storage_key: storageKey,
      filename: "hero-check.png",
      alt: "A check ran here and should have deleted this",
      mime_type: "image/png",
    })
    .select("id")
    .single();

  if (recorded) throw new Error(`media row failed: ${recorded.message}`);
  mediaId = media.id;

  const { error: linked } = await db
    .from("variants")
    .update({ hero_image_id: mediaId })
    .eq("id", variant.id);

  if (linked) throw new Error(`could not put the banner on: ${linked.message}`);

  check("a banner can be put on a business", true, `${(bytes.length / 1024) | 0}KB`);

  /* --------------------------------------------------------- and look at it */
  const token = (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, "");
  const { data: link, error: minted } = await db
    .from("share_links")
    .insert({
      variant_id: variant.id,
      token,
      label: "Hero check — safe to delete",
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    .select("id")
    .single();

  if (minted) throw new Error(`could not mint a link: ${minted.message}`);
  linkId = link.id;

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/s/${token}`, { waitUntil: "load", timeout: 60_000 });
  await page.goto(`${BASE}/${variant.slug}`, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const band = await page.evaluate(() => {
    const section = document.querySelector("section.hero-media");
    if (!section) return null;

    const picture = section.querySelector("img.hero-layer");
    const scrim = section.querySelector(".hero-scrim");
    const heading = section.querySelector("h1");

    return {
      hasBand: true,
      overlay: section.getAttribute("data-overlay"),
      pictureLoaded: picture instanceof HTMLImageElement ? picture.naturalWidth : 0,
      pictureCovers: picture ? getComputedStyle(picture).objectFit : null,
      hasScrim: Boolean(scrim),
      headingColour: heading ? getComputedStyle(heading).color : null,
      headingSize: heading ? Math.round(parseFloat(getComputedStyle(heading).fontSize)) : 0,
      /* The band has to be tall enough to read as a banner rather than as a
         strip with a picture behind it. */
      bandHeight: Math.round(section.getBoundingClientRect().height),
    };
  });

  check("the band switches to its media form", Boolean(band?.hasBand), `overlay: ${band?.overlay}`);
  check(
    "the banner is actually loaded, not a broken image",
    (band?.pictureLoaded ?? 0) > 1000,
    `${band?.pictureLoaded}px wide as delivered`,
  );
  check("and it covers the band rather than stretching", band?.pictureCovers === "cover");
  check("a scrim is drawn between the banner and the words", band?.hasScrim === true);
  check(
    "the headline is set in light ink over it",
    band?.headingColour === "rgb(245, 247, 250)",
    `${band?.headingColour}`,
  );
  check("the band is tall enough to read as a banner", (band?.bandHeight ?? 0) > 420, `${band?.bandHeight}px`);

  await page.screenshot({ path: `${OUT}/01-banner.png` });

  /* Centred and strong, which is the arrangement most likely to be chosen for
     a photograph — and the one that has to be looked at rather than assumed. */
  const { data: row } = await db.from("variants").select("copy").eq("id", variant.id).maybeSingle();
  await db
    .from("variants")
    .update({
      copy: { ...(row?.copy ?? {}), hero: { overlay: "strong", align: "centre" } },
    })
    .eq("id", variant.id);

  await page.goto(`${BASE}/${variant.slug}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(1200);

  const centred = await page.evaluate(() => {
    const section = document.querySelector("section.hero-media");
    const inner = section?.querySelector("div.container-page");
    return {
      overlay: section?.getAttribute("data-overlay"),
      centred: inner ? getComputedStyle(inner).textAlign : null,
    };
  });

  check("the arrangement is the one the panel chose", centred.overlay === "strong", `overlay: ${centred.overlay}`);
  check("and centred means centred", centred.centred === "center", `text-align: ${centred.centred}`);

  await page.screenshot({ path: `${OUT}/02-strong-centred.png` });
  await context.close();
} catch (error) {
  say(`\n  the run stopped: ${error.message.split("\n")[0]}`);
  process.exitCode = 1;
} finally {
  /* ------------------------------------------------------------ clean up -- */
  await db.from("variants").update(before).eq("id", variant.id);

  if (mediaId) await db.from("media").delete().eq("id", mediaId);
  if (storageKey) await db.storage.from("demo-media").remove([storageKey]);
  if (linkId) await db.from("share_links").delete().eq("id", linkId);

  const { data: after } = await db
    .from("variants")
    .select("hero_image_id, hero_video_url, copy")
    .eq("id", variant.id)
    .maybeSingle();

  const { data: leftovers } = await db
    .from("media")
    .select("id")
    .eq("filename", "hero-check.png");

  check(
    "the business is left exactly as it was found",
    after?.hero_image_id === before.hero_image_id &&
      after?.hero_video_url === before.hero_video_url &&
      (leftovers?.length ?? 0) === 0,
    `hero is ${JSON.stringify({
      image: after?.hero_image_id,
      video: after?.hero_video_url,
    })}, ${leftovers?.length ?? 0} pictures left behind`,
  );

  /*
    The arrangement is put back too, and separately, because it lives in
    `copy` — which this check edited to look at "strong and centred". Reading
    the column, dropping the key and writing it back is how the other five
    things in there survive.
  */
  const copy = { ...(after?.copy ?? {}) };
  delete copy.hero;
  await db.from("variants").update({ copy }).eq("id", variant.id);

  await browser.close();
}

const failed = results.filter((result) => !result.pass);
say(`\n${results.length - failed.length} of ${results.length} checks passed.`);
say(`screenshots: ${OUT}`);
process.exit(failed.length === 0 ? 0 : 1);
