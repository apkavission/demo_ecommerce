/**
 * Does the motion ever hide anything?
 *
 * ---------------------------------------------------------------------------
 * **The one way animation breaks a page.** A reveal that starts hidden and
 * depends on something to finish it — a script, a scroll timeline the browser
 * does not have, a stylesheet that arrived late — leaves the content invisible.
 * Nobody notices in the browser it was built in, and it is total: not "looks
 * wrong", but "the section is not there". It is worst for exactly the people
 * most likely to be using assistive technology or an older browser.
 *
 * So this is not a check that the animation is pretty. It is a check that
 * every band is **readable in all four states**: freshly loaded, scrolled to,
 * with reduced motion asked for, and with the reveal switched off entirely.
 *
 * ---------------------------------------------------------------------------
 * **All seven routes, not the front page.** Until 2026-09-12 this asked its
 * questions of `/` alone, which was the only page with any motion on it. The
 * six pages behind the menu now carry the same band, the same reveals and the
 * same counters — and a reveal that hides a heading is exactly as total on
 * `/services` as it is on the home page, with nobody watching that one.
 *
 * **And two kinds of hiding, not one.** Opacity was the only way a band could
 * be invisible when this was written. It is not any more: a heading rises out
 * of a clipped box, so the wrapper is fully opaque while the words inside it
 * are translated out of sight. A check that asks about opacity alone passes a
 * page whose every section heading is missing — which is precisely what
 * happened the first time the clipped reveal was built, and it was caught by
 * looking at a picture rather than by this file.
 *
 * Run it with the dev server up:
 *
 *     npm run dev
 *     npm run check:motion
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3800";
const OUT = process.argv[2] ?? resolve(PROJECT, "test-results/motion");

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
  .select("id, slug, business_name")
  .eq("is_active", true)
  .order("sort_order")
  .limit(1)
  .maybeSingle();

if (!variant) {
  say(`Could not read ${SCHEMA}.variants.`);
  process.exit(2);
}

const token = (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, "");
const { data: link, error } = await db
  .from("share_links")
  .insert({
    variant_id: variant.id,
    token,
    label: "Motion check — safe to delete",
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  })
  .select("id")
  .single();

if (error) throw new Error(`Could not mint a link: ${error.message}`);

say(`   ${variant.business_name}  /${variant.slug}`);

/** Every public route, because every one of them now animates. */
const ROUTES = [
  ["home", ""],
  ["shop", "/shop"],
  ["people", "/people"],
  ["reviews", "/reviews"],
  ["questions", "/questions"],
  ["contact", "/contact"],
  ["cart", "/cart"],
];

/**
 * Anything on the page that is animated, and the state it must end in.
 *
 * Asked for by class rather than by section, because the classes are what the
 * stylesheet animates — a band that gains one later is covered without this
 * file being touched.
 */
const ANIMATED = ".enter, [data-reveal]";

/** And the elements that are moved rather than faded: the words inside a
    clipped box. Their wrapper is opaque, so opacity cannot see them. */
const MOVED = '[data-reveal="mask"] > *, .mask-rise > *';

/**
 * Every animated element that is **on screen** and not readable.
 *
 * ---------------------------------------------------------------------------
 * **The viewport filter is the whole correctness of this check**, and the first
 * version did not have it: it asked about every animated element on the page,
 * found the six service cards at `opacity: 0`, and called that a failure. They
 * were four screens down, waiting for the scroll that reveals them — which is
 * the feature working. A check that calls correct behaviour a failure is the
 * expensive way round, and this estate has now done it four times.
 *
 * So the question is the one that matters to a reader: is anything I can see
 * invisible? Combined with the scroll pass below — which asks the same question
 * again at every scroll position — it covers both halves without calling the
 * wait a fault.
 *
 * **Two ways of being invisible.** Faded out, which is opacity; and moved out
 * of a box that clips, which is a transform on a child of something opaque. A
 * heading translated by its own height is as absent as one at zero opacity, and
 * asking only the first question is how eight section headings stayed hidden on
 * a page that this check called clean.
 */
const hidden = () => `
  (() => {
    /* How much of it a reader can actually see. An element whose top edge has
       only just crossed the bottom of the screen is at the start of its reveal
       and is *meant* to be faint -- that is the effect, not a fault. Eighty
       pixels is about two lines of text. */
    const seenEnough = (el) => {
      const box = el.getBoundingClientRect();
      return Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0) >= 80;
    };

    const label = (el) => (el.textContent || "").trim().slice(0, 40);

    const faded = Array.from(document.querySelectorAll('${ANIMATED}'))
      /* Dimmed on purpose — a sold-out card — is not a reveal that failed. */
      .filter((el) => !el.hasAttribute("data-dimmed"))
      .filter(seenEnough)
      .map((el) => ({ text: label(el), why: "opacity " + getComputedStyle(el).opacity,
                      bad: Number(getComputedStyle(el).opacity) < 0.99 }))
      .filter((entry) => entry.bad);

    /* A matrix with a translation in it. \`matrix(a,b,c,d,tx,ty)\` -- anything
       past a pixel or two of ty is a line still outside its box. */
    const moved = Array.from(document.querySelectorAll('${MOVED}'))
      .filter((el) => el.parentElement && seenEnough(el.parentElement))
      .map((el) => {
        const transform = getComputedStyle(el).transform;
        const parts = /matrix\\(([^)]+)\\)/.exec(transform);
        const ty = parts ? Math.abs(Number(parts[1].split(",")[5])) : 0;
        return { text: label(el), why: "moved " + Math.round(ty) + "px", bad: ty > 2 };
      })
      .filter((entry) => entry.bad);

    return faded.concat(moved);
  })()
`;

/** The wait the camera needs too: before the webfonts land, \`scrollHeight\` is
    about \`innerHeight\`, and a walk decides it is already at the bottom. */
async function settle(page) {
  await page
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
}

/**
 * Walk the page to the bottom.
 *
 * Written as "am I at the bottom yet" rather than as a fixed loop over
 * `scrollHeight`, because the height read once at the start is the height
 * before the webfonts arrive — a fraction of the final one. The fixed loop
 * exited after a single turn and this check passed anyway, because by then the
 * only bands on screen were the two it had reached.
 */
async function walk(page) {
  await page.evaluate(async () => {
    const pause = () => new Promise((done) => setTimeout(done, 120));

    for (let turn = 0; turn < 80; turn += 1) {
      const root = document.documentElement;
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) break;
      window.scrollBy(0, window.innerHeight * 0.7);
      await pause();
    }

    /* Long enough for the last one to finish: a 760ms transition plus up to
       450ms of stagger on the final card in a row. Measuring before that
       reports a band at 0.98 and calls a working reveal a failure. */
    await new Promise((done) => setTimeout(done, 1400));
  });
}

const browser = await chromium.launch();

try {
  for (const motion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
    });
    const page = await context.newPage();

    /* Redeem the link once per context: the cookie it leaves is what opens the
       business on every route after it. */
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "load", timeout: 60_000 });

    for (const [name, path] of ROUTES) {
      await page.goto(`${BASE}/${variant.slug}${path}`, { waitUntil: "load", timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);

      /* Long enough for a 900ms entrance plus its stagger. */
      await page.waitForTimeout(1600);

      const total = await page.locator(ANIMATED).count();
      check(`[${motion}] ${name} has animated elements at all`, total > 0, `${total} found`);

      const stillHidden = await page.evaluate(hidden());
      check(
        `[${motion}] ${name}: nothing on screen is left invisible`,
        stillHidden.length === 0,
        stillHidden.length
          ? stillHidden.map((entry) => `"${entry.text}" (${entry.why})`).join("; ")
          : `all ${total} are readable`,
      );

      await settle(page);
      await walk(page);

      const afterScroll = await page.evaluate(`
        (() => {
          const label = (el) => (el.textContent || "").trim().slice(0, 40);

          const faded = Array.from(document.querySelectorAll('${ANIMATED}'))
            .filter((el) => !el.hasAttribute("data-dimmed"))
            .map((el) => ({ text: label(el), why: "opacity " + getComputedStyle(el).opacity,
                            bad: Number(getComputedStyle(el).opacity) < 0.99 }))
            .filter((entry) => entry.bad);

          const moved = Array.from(document.querySelectorAll('${MOVED}'))
            .map((el) => {
              const parts = /matrix\\(([^)]+)\\)/.exec(getComputedStyle(el).transform);
              const ty = parts ? Math.abs(Number(parts[1].split(",")[5])) : 0;
              return { text: label(el), why: "moved " + Math.round(ty) + "px", bad: ty > 2 };
            })
            .filter((entry) => entry.bad);

          return faded.concat(moved);
        })()
      `);

      check(
        `[${motion}] ${name}: every band has arrived once the page has been walked`,
        afterScroll.length === 0,
        afterScroll.length
          ? afterScroll.map((entry) => `"${entry.text}" (${entry.why})`).join("; ")
          : "every band arrived",
      );

      if (name === "home") {
        await page.screenshot({ path: `${OUT}/${motion}-foot.png` });
      }
    }

    await context.close();
  }

  /*
    And with the reveal taken away entirely.

    The class the observer adds is what hides a band. Forcing every resting
    state back to its finished one is exactly the "the script never ran" case,
    and it has to name the moved elements as well as the faded ones — a
    stylesheet that only resets opacity leaves every clipped heading out of its
    box, which is the failure this pass exists to catch.
  */
  const bare = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await bare.newPage();

  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `
      html.js-reveal [data-reveal] { opacity: 1 !important; transform: none !important; }
      html.js-reveal [data-reveal="mask"] > * { transform: none !important; }
    `;
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });

  await page.goto(`${BASE}/s/${token}`, { waitUntil: "load", timeout: 60_000 });

  for (const [name, path] of ROUTES) {
    await page.goto(`${BASE}/${variant.slug}${path}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(1200);

    const withoutMotion = await page.evaluate(hidden());
    check(
      `[no animation at all] ${name} is still readable`,
      withoutMotion.length === 0,
      withoutMotion.length
        ? withoutMotion.map((entry) => `"${entry.text}" (${entry.why})`).join("; ")
        : "nothing depends on the animation to be visible",
    );
  }

  /*
    And the point of the whole mechanism: a band below the fold has to be
    *waiting*, not already finished.

    This is what the owner asked for — "animation scroll pe lago na, warna wo
    pahle hi ho jata h" — and it is the thing a scroll-driven animation could
    not do, because a short range had already completed by the time the reader
    arrived. This checks that the last band on the front page is still hidden
    before anybody scrolls, and revealed after.
  */
  const waiting = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const trigger = await waiting.newPage();

  await trigger.goto(`${BASE}/s/${token}`, { waitUntil: "load", timeout: 60_000 });
  await trigger.goto(`${BASE}/${variant.slug}`, { waitUntil: "load", timeout: 60_000 });
  await trigger.waitForTimeout(1600);

  const last = trigger.locator("[data-reveal]").last();
  const before = Number(await last.evaluate((el) => getComputedStyle(el).opacity));

  check(
    "a band below the fold is still waiting before anybody scrolls",
    before < 0.1,
    `the last band is at ${before}`,
  );

  await last.scrollIntoViewIfNeeded();
  await trigger.waitForTimeout(1200);

  const after = Number(await last.evaluate((el) => getComputedStyle(el).opacity));
  check(
    "and it arrives when it is scrolled to",
    after > 0.95,
    `the last band went ${before} -> ${after}`,
  );

  await waiting.close();

  /* The accordion's answer, which is the one thing that is meant to be hidden
     until it is asked for — and must appear when it is. */
  await page.goto(`${BASE}/${variant.slug}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(900);

  const closed = await page
    .locator("details:not([open]) p")
    .first()
    .isVisible()
    .catch(() => false);
  check("a closed question keeps its answer closed", closed === false);

  await page.locator("details:not([open]) summary").first().click();
  await page.waitForTimeout(400);
  const opened = await page.locator("details[open] p").nth(1).isVisible();
  check("and opening it shows the answer", opened);

  await bare.close();
} finally {
  await db.from("share_links").delete().eq("id", link.id);
  await browser.close();
}

const failed = results.filter((result) => !result.pass);
say(`\n${results.length - failed.length} of ${results.length} checks passed.`);
process.exit(failed.length === 0 ? 0 : 1);
