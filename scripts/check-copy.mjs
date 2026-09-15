/**
 * Does the Home page screen actually change the home page?
 *
 * ---------------------------------------------------------------------------
 * **Why this is a check and not a unit test.** `copy.test.ts` proves the
 * reader: an empty column gives the written defaults, a malformed one does not
 * crash, a removed promise stays removed. None of that proves the two ends are
 * connected — that a heading typed into `/admin/website` reaches the band on
 * the public page. That connection is the whole feature, and it is exactly the
 * kind of thing this estate has shipped broken before: `variants.theme`
 * carried a typeface for a fortnight that nothing read.
 *
 * So this types a heading and a promise into the panel, saves, opens the site
 * through a share link, and looks for the words. Then it puts the column back
 * to what it found and reads it back to prove it.
 *
 * Run it with the dev server up:
 *
 *     npm run dev
 *     npm run check:copy
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3800";
const OUT = process.argv[2] ?? resolve(PROJECT, "test-results/copy");

/* The schema, read from the application rather than typed. See check-website. */
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

function envFrom(file, key) {
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
}

const LOCAL = resolve(PROJECT, ".env.local");
const ESTATE = resolve(PROJECT, "../services/.env.local");

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(
  envFrom(LOCAL, "NEXT_PUBLIC_SUPABASE_URL"),
  envFrom(LOCAL, "SUPABASE_SERVICE_ROLE_KEY"),
  { db: { schema: SCHEMA }, auth: { persistSession: false } },
);

const { data: variant } = await db
  .from("variants")
  .select("id, slug, business_name, copy")
  .eq("is_active", true)
  .order("sort_order")
  .limit(1)
  .maybeSingle();

if (!variant) {
  say(`Could not read ${SCHEMA}.variants. Nothing has been changed.`);
  process.exit(2);
}

/*
  What the column held before anything was touched.

  Kept so the restore is byte-for-byte rather than a guess, and asserted at the
  end. A check that mutates has to be able to put things back.
*/
const before = variant.copy;
say(`   ${variant.business_name}  /${variant.slug}   (${SCHEMA})`);
say(`   copy before: ${JSON.stringify(before)}`);

/** Words nothing else on the page could contain. */
const stamp = Date.now().toString(36).toUpperCase();
const HEADING = `Band ${stamp}`;
const PROMISE = `Open on Sundays ${stamp}`;
const PAGE_TITLE = `Everything we offer ${stamp}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

let linkId = null;

try {
  /* ------------------------------------------------------------- sign in -- */
  await page.goto(`${BASE}/admin/website`, { waitUntil: "load", timeout: 60_000 });

  if ((await page.locator("h1").first().textContent())?.trim() !== "Website") {
    const email = envFrom(ESTATE, "ADMIN_EMAIL") ?? envFrom(LOCAL, "ADMIN_EMAIL");
    const password = envFrom(ESTATE, "ADMIN_PASSWORD") ?? envFrom(LOCAL, "ADMIN_PASSWORD");

    if (!email || !password) {
      say("No owner session and no ADMIN_EMAIL / ADMIN_PASSWORD. Nothing changed.");
      process.exit(2);
    }

    await page.goto(`${BASE}/admin/login`, { waitUntil: "load" });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
    await page.goto(`${BASE}/admin/website`, { waitUntil: "load" });
  }

  check("the Website screen opens", (await page.locator("h1").first().textContent())?.trim() === "Website");

  /* ---------------------------------------------------------- the screen -- */
  await page.getByRole("button", { name: "Words on the site", exact: true }).click();
  await page.waitForTimeout(300);

  const placeholder = await page.locator('input[name="catalogue_heading"]').getAttribute("placeholder");
  check(
    "an unedited field shows the written default as its placeholder",
    placeholder === "What we would pick",
    `placeholder is "${placeholder}"`,
  );

  const iconOptions = await page.locator('select[name="promise_0_icon"] option').count();
  check("a promise picks its icon from a list the build can draw", iconOptions >= 8, `${iconOptions} icons`);

  await page.screenshot({ path: `${OUT}/01-home-tab.png`, fullPage: true });

  /* ------------------------------------------------------------- type it -- */
  await page.locator('input[name="catalogue_heading"]').fill(HEADING);
  await page.locator('input[name="promise_0_title"]').fill(PROMISE);
  await page.locator('input[name="promise_0_note"]').fill("Someone is here every day.");
  await page.locator('select[name="promise_0_icon"]').selectOption("calendar");
  await page.locator('input[name="page_catalogue_heading"]').fill(PAGE_TITLE);

  await page.getByRole("button", { name: "Save the words" }).click();
  await page.waitForSelector("[role=status]:has-text('Saved')", { timeout: 30_000 });
  check("the words save", true);

  /* --------------------------------------------- and the site follows it -- */
  const token = (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, "");
  const { data: link, error: minted } = await db
    .from("share_links")
    .insert({
      variant_id: variant.id,
      token,
      label: "Copy check — safe to delete",
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    .select("id")
    .single();

  if (minted) throw new Error(`Could not mint a link: ${minted.message}`);
  linkId = link.id;

  const site = await context.newPage();
  await site.goto(`${BASE}/s/${token}`, { waitUntil: "load", timeout: 60_000 });
  await site.goto(`${BASE}/${variant.slug}`, { waitUntil: "load", timeout: 60_000 });

  /*
    Read the page the way a reader arrives at it.

    The bands below the first screen are revealed on scroll, so asking for the
    body text the instant the page loads asks about a page nobody has read yet
    — and this check failed on exactly that after the reveal was added, while
    the save it was testing was working perfectly. The height has to settle
    first, for the reason written in `check-motion.mjs`: before the webfonts
    land the page is a fraction of its final size and a walk decides it is
    already at the bottom.
  */
  await site.evaluate(() => document.fonts.ready);
  await site
    .waitForFunction(
      () => {
        const height = document.documentElement.scrollHeight;
        const settled = window.__height === height;
        window.__height = height;
        return settled && height > window.innerHeight;
      },
      undefined,
      { timeout: 15_000, polling: 250 },
    )
    .catch(() => {});

  await site.evaluate(async () => {
    const settle = () => new Promise((done) => setTimeout(done, 120));
    for (let turn = 0; turn < 80; turn += 1) {
      const root = document.documentElement;
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) break;
      window.scrollBy(0, window.innerHeight * 0.7);
      await settle();
    }
    await new Promise((done) => setTimeout(done, 800));
  });

  const body = await site.locator("body").innerText();

  check("the heading typed in the panel is the heading on the page", body.includes(HEADING));
  check("the promise typed in the panel is on the page", body.includes(PROMISE));
  check(
    "the band it replaced is gone, rather than both showing",
    !body.includes("What we would pick"),
    'no "What we would pick" left on the page',
  );

  await site.screenshot({ path: `${OUT}/02-site.png`, fullPage: false });

  /*
    And the same question of an inner page, because those were static until
    today and are the half of the site a prospect reaches by the menu.
  */
  await site.goto(`${BASE}/${variant.slug}/shop`, { waitUntil: "load", timeout: 60_000 });
  const cataloguePage = await site.locator("h1").first().innerText();

  check(
    "an inner page takes its title from the business too",
    cataloguePage.trim() === PAGE_TITLE,
    `the the shelf page is titled "${cataloguePage.trim()}"`,
  );

  await site.screenshot({ path: `${OUT}/03-shop.png`, fullPage: false });
  await site.close();
} catch (error) {
  say(`\n  the run stopped: ${error.message.split("\n")[0]}`);
  process.exitCode = 1;
} finally {
  /* --------------------------------------------------------- put it back -- */
  const { error: written } = await db
    .from("variants")
    .update({ copy: before })
    .eq("id", variant.id);

  const { data: after } = await db
    .from("variants")
    .select("copy")
    .eq("id", variant.id)
    .maybeSingle();

  check(
    "the business is left exactly as it was found",
    !written && JSON.stringify(after?.copy) === JSON.stringify(before),
    JSON.stringify(after?.copy),
  );

  if (linkId) await db.from("share_links").delete().eq("id", linkId);
  await browser.close();
}

const failed = results.filter((result) => !result.pass);
say(`\n${results.length - failed.length} of ${results.length} checks passed.`);
say(`screenshots: ${OUT}`);
process.exit(failed.length === 0 ? 0 : 1);
