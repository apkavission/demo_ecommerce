-- ===========================================================================
-- The words on the home page, moved out of the code.
--
-- Every band on the home page carried its heading, its intro sentence and its
-- four promises as literals in `src/app/[variant]/page.tsx`. So a demo could
-- have its own name, colours, typeface, prices and people, and still say
-- "Sterilisation you can watch" to a business that does not sterilise
-- anything. The owner asked for the opposite, in these words:
--
--     best design, layout and theme and full dynamic chaiye
--     har ek chej kuch bhi static mat karna
--
-- One jsonb column rather than a table of rows, and the reason is the shape of
-- the thing: this is not a list somebody adds to, it is a fixed set of slots on
-- one page. A table would need an ordering, a kind, a uniqueness rule and a
-- screen to manage rows -- for six headings and four promises that are decided
-- by the layout, not by the business.
--
-- Shaped like:
--
--   {
--     "services":  { "heading": "...", "intro": "..." },
--     "doctors":   { "heading": "...", "intro": "..." },
--     "reviews":   { "heading": "...", "intro": "..." },
--     "questions": { "heading": "...", "intro": "..." },
--     "cta":       { "heading": "...", "intro": "..." },
--     "promises":  [ { "icon": "user", "title": "...", "note": "..." }, ... ]
--   }
--
-- **An empty object is a finished page, not a broken one.** `lib/copy.ts`
-- supplies a default for every slot, so a business nobody has edited reads
-- exactly as it reads today, and the panel shows those defaults as
-- placeholders. Postgres does not check the shape of jsonb, so that reader is
-- also what turns a half-edited value into a working page rather than a crash
-- in front of a prospect.
--
-- No policy change is needed: `copy` is a column on `variants`, and the four
-- policies on that table already decide who may read and write a row.
-- ===========================================================================

alter table demo_shop.variants
  add column if not exists copy jsonb not null default '{}'::jsonb;

comment on column demo_shop.variants.copy is
  'Home-page headings, intros and promises. Read through lib/copy.ts, which '
  'supplies a default for every slot, so an empty object renders the written '
  'defaults rather than an empty page.';
