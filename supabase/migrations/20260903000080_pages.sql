-- ===========================================================================
-- A business writes its own pages.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > demos wale me … sab kuch chaiye seo, marketing and content dynamic and
--   > pages banane
--
-- Every demo ships with the same six or seven pages, one file each. A business
-- that wants an eighth — "Our story", "Insurance we accept", "Careers" — could
-- not have one, and there was nowhere to put it if they had.
--
-- ---------------------------------------------------------------------------
-- **Sections as rows, not as a blob of JSON.**
--
-- The company website stores a page's sections as JSON because it has a builder
-- with thirty section types and a schema per type. Nothing here needs that, and
-- a JSON column would give up everything the rest of these schemas rely on:
-- ordering by a column, a foreign key to the picture, and a policy that can see
-- inside the row. Sections are rows, ordered like every other list in this
-- database.
--
-- ---------------------------------------------------------------------------
-- **A slug is unique per business, not per demo.** The three businesses in a
-- demo are three different companies as far as anybody reading them is
-- concerned, and each may perfectly well have an "about" page.
-- ===========================================================================

create table if not exists demo_shop.pages (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references demo_shop.variants(id) on delete cascade,

  /*
    The address, and the reason the application checks it against its own route
    folders before saving. Next resolves a static segment before a dynamic one,
    so a page saved as "contact" would be written, published, listed in the
    panel — and never rendered, because /contact is a file. The database cannot
    know that; the panel can, and does.
  */
  slug text not null,
  title text not null,
  summary text,

  status demo_shop.publish_state not null default 'draft',

  meta_title text,
  meta_description text,

  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  unique (variant_id, slug)
);

comment on table demo_shop.pages is
  'Pages a business adds for itself, beyond the ones every demo ships with. Rendered by [variant]/[slug].';

create index if not exists pages_variant_idx on demo_shop.pages (variant_id, sort_order);

create table if not exists demo_shop.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references demo_shop.pages(id) on delete cascade,

  heading text,
  body text,

  /* Set null rather than cascade: removing a picture must not silently remove
     the paragraph beside it. */
  image_id uuid references demo_shop.media(id) on delete set null,

  /*
    How the section is laid out. Checked here as well as in the application,
    because a value the renderer has no branch for renders as nothing at all —
    a blank stripe in the middle of a page, with no error anywhere.
  */
  layout text not null default 'text'
    check (layout in ('text', 'image_right', 'image_left', 'banner')),

  sort_order integer not null default 0
);

comment on table demo_shop.page_sections is
  'One band of a page. Rows rather than JSON, so they order, join to a picture and answer to a policy like everything else here.';

create index if not exists page_sections_page_idx on demo_shop.page_sections (page_id, sort_order);

-- ---------------------------------------------------------------------------
-- Who may read them
-- ---------------------------------------------------------------------------

alter table demo_shop.pages enable row level security;
alter table demo_shop.page_sections enable row level security;

drop policy if exists pages_public_read on demo_shop.pages;

/* Published, and belonging to a business this request is allowed to see —
   the same question every other public read in this schema now asks. */
create policy pages_public_read on demo_shop.pages
  for select
  using (status = 'published' and demo_shop.may_see(variant_id));

drop policy if exists pages_admin_all on demo_shop.pages;

create policy pages_admin_all on demo_shop.pages
  for all
  using (demo_shop.is_admin())
  with check (demo_shop.is_admin());

drop policy if exists page_sections_public_read on demo_shop.page_sections;

/* A section is as visible as the page it is on, and no more. Asked through the
   page rather than repeated here, so there is one answer to change. */
create policy page_sections_public_read on demo_shop.page_sections
  for select
  using (
    exists (
      select 1 from demo_shop.pages p
       where p.id = page_id
         and p.status = 'published'
         and demo_shop.may_see(p.variant_id)
    )
  );

drop policy if exists page_sections_admin_all on demo_shop.page_sections;

create policy page_sections_admin_all on demo_shop.page_sections
  for all
  using (demo_shop.is_admin())
  with check (demo_shop.is_admin());

grant select on demo_shop.pages, demo_shop.page_sections to anon, authenticated;
grant insert, update, delete on demo_shop.pages, demo_shop.page_sections to authenticated;
