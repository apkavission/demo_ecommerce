/**
 * Does the Website screen actually work — in a browser, against the real
 * database — and does a theme change reach the public site?
 *
 * ---------------------------------------------------------------------------
 * **Why a script and not a Playwright spec.** The suite runs as a visitor
 * holding a share link; this needs the owner, signed in. It starts from the
 * session the company website's own suite saves — the cookies there are scoped
 * to `localhost` without a port, so one signed-in session serves all nine
 * applications — and signs in itself when that session has expired, which it
 * had when this was first run: eight days old and dead, and the check reported
 * the Website screen as a sign-in form. That reads like "the screen is broken"
 * and means "this session is old", so a stale session is not a failure here.
 *
 * ---------------------------------------------------------------------------
 * **It writes to the real database, and puts everything back.** Every value it
 * touches is read first and written again at the end, and the last check is
 * that the demo was left as it was found. A check that leaves a client's demo
 * in a colour nobody chose is worse than no check.
 *
 * Run it with the demo's dev server up:
 *
 *     npm run dev            # in one terminal
 *     npm run check:website  # in another
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3800";

/**
 * The schema this demo reads, taken from the application rather than typed.
 *
 * ---------------------------------------------------------------------------
 * **This was a real failure, not a precaution.** When this check was ported to
 * the other five demos the schema was written into each copy from the folder
 * name — `demo_restaurant`, `demo_realestate` — and neither of those exists.
 * The real names are `demo_resto` and `demo_estate`.
 *
 * Nothing said so. The service client happily connected to a schema with no
 * tables in it, so the link could not be minted and the site answered with the
 * expired screen; the check reported **"the site opens through its share link:
 * FAIL"** and **"the row could not be written back"** — two working features
 * called broken, and a demo left in a colour nobody chose because the restore
 * was the thing that failed.
 *
 * `src/lib/supabase/constants.ts` is where `DB_SCHEMA` lives, and its own
 * comment says it is the value a fork gets wrong. So it is read from there, and
 * a mismatch is now impossible rather than merely unlikely.
 */
function schemaName() {
  const file = resolve(PROJECT, "src/lib/supabase/constants.ts");
  const match = /DB_SCHEMA = "([a-z_]+)"/.exec(readFileSync(file, "utf8"));

  if (!match) throw new Error("DB_SCHEMA is not in src/lib/supabase/constants.ts");

  return match[1];
}

const SCHEMA = schemaName();

/*
  Resolved relative to this repository rather than typed as an absolute path.

  Four estate scripts opened `c:/Users/kumar/portal/.env.local` by absolute
  path and died on ENOENT on the second computer they were run on, reading like
  broken scripts rather than wrong paths. STATUS.md §5 records it. The estate
  sits beside this project, whatever the clone is called.
*/
const SESSION =
  process.env.CHECK_SESSION ??
  [
    resolve(PROJECT, "../services/e2e/.auth/owner.json"),
    resolve(PROJECT, "../company/e2e/.auth/owner.json"),
  ].find(existsSync);

const SHOTS = process.argv[2] ?? resolve(PROJECT, "test-results/website");

/** Where a session this run had to make for itself is kept. Git-ignored. */
const FRESH_SESSION = resolve(PROJECT, "e2e/.auth/owner.json");

mkdirSync(SHOTS, { recursive: true });

const say = (...args) => console.log(...args);
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  say(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * The owner's own credentials, from the estate — read, never printed.
 *
 * `ADMIN_EMAIL` and `ADMIN_PASSWORD` have been in the company website's
 * `.env.example` since the beginning for exactly this, they are filled in on
 * this machine, and the estate has one account list — so the clinic's own
 * sign-in form accepts them.
 *
 * **Read and never written down**: not into a report, not into a failure
 * message, and not into a screenshot — the sign-in page is never photographed
 * with the field filled.
 */
function estateCredentials() {
  for (const name of ["../services/.env.local", "../company/.env.local", ".env.local"]) {
    const file = resolve(PROJECT, name);
    if (!existsSync(file)) continue;

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    const read = (key) => {
      const line = lines.find((entry) => entry.startsWith(key + "="));
      return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
    };

    const email = read("ADMIN_EMAIL");
    const password = read("ADMIN_PASSWORD");
    if (email && password) return { email, password, from: name };
  }

  return null;
}

/**
 * A way in to the public site, for as long as this check runs.
 *
 * ---------------------------------------------------------------------------
 * **Every demo is link-only, and the owner is not exempt.** Typing a business's
 * address gets the expired screen whoever is asking — that is the gate, and
 * `check:leak` in the company website is what proves it. So reading the palette
 * off the site means holding a link for that business, exactly as `share.setup.ts`
 * mints one for the browser suite.
 *
 * **Minted for an hour and deleted at the end**, labelled so anybody who finds
 * the row in the panel knows what it is. A check that leaves a live door open
 * on a client's demo has done more harm than the bug it was looking for.
 */
const LINK_LABEL = "Website check — safe to delete";

function serviceClient() {
  const file = resolve(PROJECT, ".env.local");
  if (!existsSync(file)) return null;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const read = (key) => {
    const line = lines.find((entry) => entry.startsWith(key + "="));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  };

  const url = read("NEXT_PUBLIC_SUPABASE_URL");
  const key = read("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;

  return { url, key };
}

let mintedLinkId = null;

async function mintLink(slug) {
  const client = await db();

  if (!client) {
    say("  no service key in .env.local, so the site cannot be opened — skipping that half");
    return null;
  }

  const { data: variant } = await client
    .from("variants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!variant) return null;

  /* Long and random, the same shape the estate screen issues. */
  const token = (globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()).replace(/-/g, "");

  const { data: row, error } = await client
    .from("share_links")
    .insert({
      variant_id: variant.id,
      token,
      label: LINK_LABEL,
      /* An hour: longer than this check, short enough that a crashed run leaves
         a door that shuts itself. */
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    say(`  could not mint a share link: ${error.message}`);
    return null;
  }

  mintedLinkId = row.id;
  return token;
}

/** The schema client, or nothing. */
async function db() {
  const credentials = serviceClient();
  if (!credentials) return null;

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(credentials.url, credentials.key, {
    db: { schema: SCHEMA },
    auth: { persistSession: false },
  });
}

/** The `theme` column exactly as it stands, so it can be written back exactly. */
async function readTheme(slug) {
  const client = await db();
  if (!client) return null;

  const { data } = await client.from("variants").select("theme").eq("slug", slug).maybeSingle();
  return data?.theme ?? null;
}

/** Put a theme back, and read it again rather than assume the write landed. */
async function restoreTheme(slug, theme) {
  const client = await db();
  if (!client || !theme) return null;

  const { error } = await client.from("variants").update({ theme }).eq("slug", slug);
  if (error) {
    say(`  could not write the theme back: ${error.message}`);
    return null;
  }

  return readTheme(slug);
}

/** Take the door away again. */
async function revokeLink() {
  if (!mintedLinkId) return;

  const client = await db();
  if (!client) return;

  await client.from("share_links").delete().eq("id", mintedLinkId);
  say("  the share link this check made has been deleted");
}

/** Sign in on this demo's own login form, and keep the session for next time. */
async function signIn(context, page) {
  const credentials = estateCredentials();

  if (!credentials) {
    say(
      "No owner session, and no ADMIN_EMAIL / ADMIN_PASSWORD in the estate's " +
        ".env.local. Fill those in, or point CHECK_SESSION at a fresh session.",
    );
    return false;
  }

  say(`  signing in as the estate's owner (credentials from ${credentials.from})`);

  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  /* The dashboard, not merely "not the login screen": a failed sign-in
     re-renders the same form, and a URL check alone would pass on it. */
  try {
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
  } catch {
    say("  sign-in did not leave the login screen — the password may be wrong.");
    return false;
  }

  mkdirSync(dirname(FRESH_SESSION), { recursive: true });
  await context.storageState({ path: FRESH_SESSION });
  say("  signed in; session saved for the next run");

  return true;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  /* A session that exists but has expired is still worth starting from: the
     cheap path is that it works, and `signIn()` is the fallback. */
  storageState: SESSION && existsSync(SESSION) ? SESSION : undefined,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();

page.on("console", (m) => {
  if (m.type() === "error") say("  [browser error]", m.text().slice(0, 200));
});

/* ------------------------------------------------------------- the screen */

await page.goto(`${BASE}/admin/website`, { waitUntil: "networkidle" });

let heading = (await page.locator("h1").first().textContent())?.trim();

if (heading !== "Website") {
  /* No session, or an expired one. Not a failure — see `estateCredentials()`. */
  if (!(await signIn(context, page))) {
    await browser.close();
    process.exit(2);
  }

  await page.goto(`${BASE}/admin/website`, { waitUntil: "networkidle" });
  heading = (await page.locator("h1").first().textContent())?.trim();
}

check("the screen opens for the owner", heading === "Website", `h1 = ${heading}`);

if (heading !== "Website") {
  say("The screen did not open. Body was:");
  say((await page.locator("body").innerText()).slice(0, 400));
  await browser.close();
  process.exit(2);
}

const business = await page.locator("p:has-text('Editing') strong").first().textContent();
say(`  editing: ${business}`);

/*
  Which business, and what its theme is right now — read before anything is
  touched, and read from the database rather than off the form.

  The restore at the end writes this object back verbatim. Reading it from the
  inputs instead would put back what the form *displayed*, which is the same
  thing only for as long as the form is right — and the form is the thing under
  test.
*/
const slug =
  new URL(page.url()).searchParams.get("variant") ??
  (
    await page
      .locator('nav[aria-label="Business"] a[aria-current="page"]')
      .getAttribute("href")
  )?.split("=")[1] ??
  "";

const beforeTheme = await readTheme(slug);
say(`  business: /${slug}   schema: ${SCHEMA}`);

/*
  Stop here rather than half-run.

  Everything after this point writes: it saves a theme, mints a share link and
  writes the theme back. Without a readable row there is nothing to write back
  *to*, and carrying on is how a demo gets left in a colour nobody chose. So
  this is the one failure that exits instead of being recorded.
*/
if (!beforeTheme) {
  say("");
  say(`Could not read ${SCHEMA}.variants for "${slug}".`);
  say("Nothing has been changed.");
  say("Check SUPABASE_SERVICE_ROLE_KEY in .env.local, and that the schema");
  say("is in the Supabase project's exposed-schema list.");
  await browser.close();
  process.exit(2);
}

await page.screenshot({ path: `${SHOTS}/01-identity.png`, fullPage: true });

/* ------------------------------------------- the sections are all reachable */

for (const [file, label] of [
  ["02-theme", "Theme"],
  ["03-logo", "Logo & search"],
  ["04-contact", "Contact"],
  ["05-labels", "Buttons & extras"],
]) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${file}.png`, fullPage: true });
}

/* ---------------------------------------------------- the theme, end to end */

await page.getByRole("button", { name: "Theme", exact: true }).click();
await page.waitForTimeout(200);

const FIELDS = [
  "light_accent", "light_accent_fg", "light_accent_soft", "light_bg",
  "light_surface", "light_text", "light_muted",
  "dark_accent", "dark_accent_fg", "dark_accent_soft", "dark_bg",
  "dark_surface", "dark_text", "dark_muted",
];

const before = {};
for (const field of FIELDS) before[field] = await page.locator(`input#${field}`).inputValue();
const fontBefore = await page.locator('input[name="font_pair"]:checked').getAttribute("value");
const radiusBefore = await page.locator('select[name="radius"]').inputValue();
const modeBefore = await page.locator('select[name="default_mode"]').inputValue();
const toggleBefore = await page.locator('input[name="allow_mode_toggle"]').isChecked();

say(
  `  before: accent ${before.light_accent}, type ${fontBefore}, corners ${radiusBefore}, ` +
    `opens ${modeBefore}, toggle ${toggleBefore ? "on" : "off"}`,
);

check(
  "the fourteen colours are filled in from the database",
  FIELDS.every((f) => /^#[0-9a-fA-F]{3,8}$/.test(before[f])),
  FIELDS.map((f) => before[f]).join(" "),
);

/* Pick a preset that is definitely not the current one. */
const target = before.light_accent.toLowerCase() === "#b81f5e" ? "Forest" : "Rose";
await page.getByRole("button", { name: new RegExp(`^${target}`) }).click();
await page.waitForTimeout(200);

const afterClick = await page.locator("input#light_accent").inputValue();
check(
  "a preset writes all fourteen pickers at once",
  afterClick.toLowerCase() !== before.light_accent.toLowerCase(),
  `${before.light_accent} → ${afterClick}`,
);

const previewBg = await page
  .locator("section:has(h2:text('How it looks')) div[style*='background']")
  .first()
  .getAttribute("style");
check("the preview redraws before anything is saved", Boolean(previewBg), previewBg?.slice(0, 60));

await page.screenshot({ path: `${SHOTS}/06-theme-preset-applied.png`, fullPage: true });

/* Contrast is reported, not assumed. */
const ratios = await page.locator("section:has(h2:text('Light mode')) p:has-text(':1')").allInnerTexts();
check("every pair's contrast is printed", ratios.length >= 5, ratios.join(" | "));

/* Save it. */
await page.getByRole("button", { name: "Save the theme" }).click();
await page.waitForSelector("[role=status]:has-text('Saved')", { timeout: 20000 });
check("the theme saves", true, (await page.locator("[role=status]:has-text('Saved')").first().innerText()).trim());

/* ------------------------------------------- and the public site follows it */

/*
  The site is opened through a share link, because that is the only way it
  opens at all.

  Since 2026-09-03 every demo is link-only: typing a business's address gets
  the expired screen, and **being signed in as the owner does not change that**
  — the door exempts nobody, which is the behaviour `check:leak` proves. The
  first run of this check read the palette off `/expired`, found the stylesheet
  fallback from `globals.css` instead of the business's own accent, and reported
  a working feature as broken. A check that calls correct behaviour a failure is
  the expensive way round, and it is the third time in this estate.
*/
const token = await mintLink(slug);
const site = await context.newPage();

if (token) {
  await site.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
} else {
  await site.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
}

check(
  "the site opens through its share link",
  new URL(site.url()).pathname === `/${slug}`,
  `landed on ${new URL(site.url()).pathname}`,
);

const liveAccent = await site.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
);
check(
  "the saved accent is the site's accent",
  liveAccent.toLowerCase() === afterClick.toLowerCase(),
  `site says ${liveAccent}, panel saved ${afterClick}`,
);

const liveFont = await site.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--font-heading").trim(),
);
check("the typeface reaches the page at all", liveFont.length > 0, liveFont);

const headingFamily = await site.evaluate(() => {
  const h1 = document.querySelector("h1");
  return h1 ? getComputedStyle(h1).fontFamily : "";
});
check("the heading is set in it", headingFamily.length > 0, headingFamily.slice(0, 80));

await site.screenshot({ path: `${SHOTS}/07-site-light.png`, fullPage: false });

/*
  The `dark:` bug, checked rather than assumed fixed.

  Tailwind's own `dark:` is `prefers-color-scheme` and nothing else, while these
  sites also decide light or dark with `data-theme` on the root. The two had no
  connection: on a machine set to light, pressing the toggle gave the dark
  palette *and* the light logo, because `site-logo.tsx` swaps the two files with
  `dark:hidden` / `dark:block` — and its own comment claimed a toggle "cannot
  show the wrong one". The browser this check runs in is set to light, which is
  exactly the machine the bug needed.
*/
const lightBg = await site.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
);

await site.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
await site.waitForTimeout(200);

const darkChecks = await site.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  /* The sun is the icon shown in light mode and hidden by `dark:hidden`. */
  const sun = document.querySelector("button[aria-label*='Switch'] svg");
  return {
    bg: root.getPropertyValue("--bg").trim(),
    sunHidden: sun ? getComputedStyle(sun).display === "none" : null,
  };
});

check(
  "an explicit dark choice swaps the palette",
  darkChecks.bg.length > 0 && darkChecks.bg.toLowerCase() !== lightBg.toLowerCase(),
  `--bg went ${lightBg} → ${darkChecks.bg}`,
);
check(
  "and `dark:` classes follow it, so the logo and icon swap too",
  darkChecks.sunHidden === true,
  darkChecks.sunHidden === null
    ? "this business has the toggle switched off, so there is no icon to check"
    : `the light-mode icon is hidden: ${darkChecks.sunHidden}`,
);

await site.screenshot({ path: `${SHOTS}/08-site-dark.png`, fullPage: false });

/* --------------------------------------------------------------- put it back */

/*
  Written straight to the database rather than typed back into the form.

  **A cleanup that runs through the screen it is testing cannot be relied on to
  clean up.** The first version of this did exactly that: it refilled the
  fourteen inputs and pressed Save, and when the second submit did not settle
  the script died on a timeout — leaving a client's demo in a colour nobody
  chose, which is the one outcome this check must never produce. The browser
  half proves the screen works; the restore's job is only to be certain.

  It is also the honest comparison: the row is read back afterwards, so "left as
  it was found" is a fact about the database rather than about an input's value
  attribute.
*/
const restored = await restoreTheme(slug, beforeTheme);

check(
  "the demo is left exactly as it was found",
  restored !== null && JSON.stringify(restored) === JSON.stringify(beforeTheme),
  restored === null
    ? "the row could not be written back — put the theme back by hand"
    : `accent ${restored.light?.accent}, type ${restored.headingFont}, corners ${restored.radius}`,
);

/* -------------------------------------------------------------------- done */

await revokeLink();
await browser.close();

const failed = results.filter((r) => !r.pass);
say(`\n${results.length - failed.length} of ${results.length} checks passed.`);
say(`screenshots: ${SHOTS}`);
process.exit(failed.length === 0 ? 0 : 1);
