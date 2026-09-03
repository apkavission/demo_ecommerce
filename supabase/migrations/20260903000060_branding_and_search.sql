-- ===========================================================================
-- A business decides its own mark and its own words in a search result.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > logo bhi lagane ke bhi dena jo admin me bhi laga sake, with text ya
--   > without text … demos me bhi sab kuch dynamic, admin panel se hi sab kuch
--   > hoga jaise services wale me
--
-- `variants` has carried `logo_light_id`, `logo_dark_id` and `og_image_id`
-- since it was written and every one of them is null, because there was no
-- screen to set them from and no bucket to hold a file. Both now exist.
--
-- ---------------------------------------------------------------------------
-- **What the schema was actually missing.**
--
-- Not the logo — that column was there. It was *how to use it*: a mark on its
-- own beside a separate wordmark is a different design from a lockup that
-- already contains the name, and drawing the business name beside a logo that
-- already says it is the commonest way a header looks amateur. One column
-- answers it.
--
-- ---------------------------------------------------------------------------
-- **The search fields fall back rather than being required.**
--
-- A variant with no meta title uses its business name and tagline, which are
-- always there. A demo built in an afternoon must never render a blank
-- `<title>` because somebody did not reach the SEO screen.
-- ===========================================================================

alter table demo_shop.variants
  add column if not exists logo_shows_name boolean not null default false,
  add column if not exists meta_title text,
  add column if not exists meta_description text;

comment on column demo_shop.variants.logo_shows_name is
  'True when the uploaded logo already contains the business name, so the header must not print it again beside the mark.';

comment on column demo_shop.variants.meta_title is
  'What a search result says. Null falls back to the business name — a demo must never render a blank title because nobody reached this screen.';

comment on column demo_shop.variants.meta_description is
  'The sentence under a search result. Null falls back to the tagline.';

-- ---------------------------------------------------------------------------
-- Media, which nothing could write to.
-- ---------------------------------------------------------------------------

/*
  The table existed with a select policy and nothing else, so a picture could be
  read and never added. These match the bucket's rules: an estate owner writes,
  everybody reads — which is right for files whose entire purpose is to be
  served to visitors.
*/
drop policy if exists media_admin_write on demo_shop.media;

create policy media_admin_write on demo_shop.media
  for all
  using (demo_shop.is_super_admin())
  with check (demo_shop.is_super_admin());

grant select, insert, update, delete on demo_shop.media to authenticated;

/**
 * A picture and how to reach it, in one row.
 *
 * The public URL is composed here rather than stored, so moving the bucket is
 * one change in one place instead of a column to migrate. `storage_key` is what
 * is kept, because that is what identifies the object.
 */
create or replace view demo_shop.media_public as
  select
    m.id,
    m.storage_key,
    m.filename,
    m.alt,
    m.width,
    m.height,
    m.mime_type,
    m.created_at
  from demo_shop.media m;

comment on view demo_shop.media_public is
  'Media with everything a page needs. The address is composed by the application from storage_key, so the bucket can move without a migration.';

grant select on demo_shop.media_public to anon, authenticated;
