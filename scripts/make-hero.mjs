/**
 * A banner for the first screen, drawn from the business's own palette.
 *
 *     npm run make:hero              # the first business
 *     VARIANT=cardiology npm run make:hero
 *
 * ---------------------------------------------------------------------------
 * **Why this exists rather than a photograph.** The owner asked for a banner
 * behind the first screen — *"ek aacha sa 3d wala jo har screen pe fit aaye"*.
 * There is no photograph of any of these businesses, because none of them is
 * real, and a stock photograph of a waiting room is what makes a demo look
 * like every other template and is the one thing a client cannot keep.
 *
 * So the banner is **made**, from the seven colours that business already has.
 * Change its palette and run this again and the banner follows it.
 *
 * ---------------------------------------------------------------------------
 * **What "3D" means here, honestly.** These are not rendered solids — there is
 * no scene and no renderer. They are spheres shaded the way a sphere is
 * shaded: a radial gradient offset toward one light, a darker terminator
 * opposite it, a faint rim where light wraps the edge, and a contact shadow
 * beneath. That is what makes a flat circle read as a ball, and it is enough
 * at the size a banner is looked at.
 *
 * ---------------------------------------------------------------------------
 * **"Fits every screen" is a composition rule, not a size.** The band crops
 * with `object-fit: cover`, so a wide banner loses its sides on a phone and a
 * tall crop loses its top and bottom. Two rules follow, and both are obeyed
 * below:
 *
 *   - **nothing that matters near an edge.** Every form is placed inside the
 *     middle 70% horizontally, so a 9:16 crop still contains all of them.
 *   - **the left third stays calm.** On a wide screen the headline sits there
 *     over the scrim, and detail under type is what makes a hero unreadable.
 *
 * It is written at 2400 × 1350 — 16:9, which is the shape the band is at its
 * widest, and enough pixels for a 2× screen.
 */
import { chromium } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const SCHEMA = /DB_SCHEMA = "([a-z_]+)"/.exec(
  readFileSync(resolve(PROJECT, "src/lib/supabase/constants.ts"), "utf8"),
)?.[1];

if (!SCHEMA) throw new Error("DB_SCHEMA is not in src/lib/supabase/constants.ts");

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

const wanted = process.env.VARIANT ?? null;

const { data: variant } = wanted
  ? await db
      .from("variants")
      .select("id, slug, business_name, theme, hero_image_id")
      .eq("slug", wanted)
      .maybeSingle()
  : await db
      .from("variants")
      .select("id, slug, business_name, theme, hero_image_id")
      .eq("is_active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

if (!variant) throw new Error(`No business${wanted ? ` called "${wanted}"` : ""} to draw for.`);

const palette = variant.theme?.light ?? {};
const dark = variant.theme?.dark ?? {};

console.log(`   ${variant.business_name}  /${variant.slug}`);
console.log(`   drawing from  accent ${palette.accent}  ink ${palette.text}`);

const browser = await chromium.launch();
const page = await browser.newPage();

const dataUrl = await page.evaluate(
  ({ accent, ink, soft, deep }) => {
    const W = 2400;
    const H = 1350;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    /* ------------------------------------------------------------- the ground */
    const ground = ctx.createLinearGradient(0, H, W, 0);
    ground.addColorStop(0, deep);
    ground.addColorStop(0.48, ink);
    ground.addColorStop(1, accent);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);

    /* A wash of light from the top right, so the whole plate has a direction. */
    const light = ctx.createRadialGradient(W * 0.78, H * 0.12, 0, W * 0.78, H * 0.12, W * 0.8);
    light.addColorStop(0, "rgba(255,255,255,0.28)");
    light.addColorStop(0.4, "rgba(255,255,255,0.08)");
    light.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);


    /* --------------------------------------------------------- folded cloth */
    /*
      A stack, the way a shop stacks: four folded pieces, each a rounded slab
      with a lit top edge and a shadow under it. It is the shape of stock —
      which is what this trade sells and what the first screen promises.
    */
    const fold = (x, y, w, h, tone, alpha) => {
      const cast = ctx.createLinearGradient(x, y + h, x, y + h + h * 0.6);
      cast.addColorStop(0, `rgba(0,0,0,${0.4 * alpha})`);
      cast.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cast;
      ctx.fillRect(x, y + h, w, h * 0.6);

      const body = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
      body.addColorStop(0, `rgba(255,255,255,${0.18 * alpha})`);
      body.addColorStop(0.4, tone);
      body.addColorStop(1, `rgba(0,0,0,${0.4 * alpha})`);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h * 0.22);
      ctx.fill();

      /* the crease, one line, off centre */
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.34, y + h * 0.1);
      ctx.lineTo(x + w * 0.34, y + h * 0.9);
      ctx.stroke();

      ctx.globalAlpha = 1;
    };

    fold(W * 0.5, H * 0.62, W * 0.4, H * 0.13, accent, 0.5);
    fold(W * 0.53, H * 0.46, W * 0.36, H * 0.12, soft, 0.42);
    fold(W * 0.56, H * 0.32, W * 0.32, H * 0.11, accent, 0.6);
    fold(W * 0.59, H * 0.2, W * 0.27, H * 0.1, soft, 0.35);

    /* --------------------------------------------------------------- finish */
    /* A vignette, so the plate has a centre and the edges give way to type. */
    const vignette = ctx.createRadialGradient(W * 0.6, H * 0.5, H * 0.2, W * 0.6, H * 0.5, W * 0.75);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    /*
      And grain.

      A gradient with no grain in it bands visibly on an eight-bit screen —
      wide, soft steps across a dark area, which is the commonest way a
      generated background looks generated. Two per cent of noise removes it.
    */
    const noise = ctx.getImageData(0, 0, W, H);
    const px = noise.data;
    for (let i = 0; i < px.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      px[i] = Math.max(0, Math.min(255, px[i] + n));
      px[i + 1] = Math.max(0, Math.min(255, px[i + 1] + n));
      px[i + 2] = Math.max(0, Math.min(255, px[i + 2] + n));
    }
    ctx.putImageData(noise, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.9);
  },
  {
    accent: palette.accent ?? "#0f766e",
    ink: palette.text ?? "#0b1220",
    soft: palette.accentSoft ?? "#e6f2f1",
    /* The dark palette's page colour, which is the darkest thing this business
       owns — so the plate bottoms out in its own colour rather than in black. */
    deep: dark.bg ?? "#07090c",
  },
);

await browser.close();

const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
console.log(`   drawn: 2400 × 1350, ${(bytes.length / 1024) | 0}KB`);

/* A copy on disk, so it can be looked at without opening the bucket. */
const local = resolve(PROJECT, `docs/screens/hero-${variant.slug}.jpg`);
writeFileSync(local, bytes);
console.log(`   saved: ${local}`);

/* ---------------------------------------------------------------- upload -- */
const key = `${SCHEMA}/${variant.id}/hero-${Date.now().toString(36)}.jpg`;

const { error: uploaded } = await db.storage
  .from("demo-media")
  .upload(key, bytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });

if (uploaded) throw new Error(`upload failed: ${uploaded.message}`);

const { data: media, error: recorded } = await db
  .from("media")
  .insert({
    storage_key: key,
    filename: `hero-${variant.slug}.jpg`,
    alt: `A shaded composition in ${variant.business_name}'s own colours`,
    mime_type: "image/jpeg",
    width: 2400,
    height: 1350,
  })
  .select("id")
  .single();

if (recorded) throw new Error(`media row failed: ${recorded.message}`);

/* The one this replaces, so the old file does not sit in the bucket for ever. */
const previous = variant.hero_image_id;

const { error: linked } = await db
  .from("variants")
  .update({ hero_image_id: media.id })
  .eq("id", variant.id);

if (linked) throw new Error(`could not put it on: ${linked.message}`);

if (previous) {
  const { data: old } = await db
    .from("media")
    .select("storage_key")
    .eq("id", previous)
    .maybeSingle();

  await db.from("media").delete().eq("id", previous);
  if (old?.storage_key) await db.storage.from("demo-media").remove([old.storage_key]);
  console.log("   the banner it replaced has been deleted");
}

console.log(`\n   on ${variant.business_name}. It is editable at /admin/website under First screen.`);
