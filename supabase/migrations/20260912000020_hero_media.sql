-- ===========================================================================
-- A banner or a video at the top of the page.
--
-- The owner asked for it in these words:
--
--     sab demo me sabse uppar jo h banner ya video wala laga
--     wo jada aacha lagta h hero section
--
-- Two columns rather than one, because they are not the same thing and a
-- business will have one or the other:
--
--   **hero_image_id** points at a row in this schema's own `media`, so a
--   banner is uploaded once, carries its alt text, appears in the picture
--   library, and answers to the same policies as every other picture. A bare
--   URL column would have none of that.
--
--   **hero_video_url** is a URL and not a media row, because a video is not
--   stored here. A ten-megabyte MP4 in the same bucket as the logos is a bill
--   and a slow first paint; what belongs in a column is the address of a file
--   somebody else is already serving properly.
--
-- **Neither is required, and a business with neither still has a hero.** The
-- band falls back to a wash built from that business's own palette, so a demo
-- built this afternoon looks finished — and the moment a banner is uploaded it
-- appears without anything being deployed.
--
-- How the band is arranged -- how dark the scrim is, whether the words sit left
-- or centred -- lives in `variants.copy` under `hero`, because those are
-- presentation choices on the same page as the headings, not files.
--
-- No policy change: both are columns on `variants`, and the policies on that
-- table already decide who may read and write a row. `on delete set null` so
-- deleting a picture from the library cannot leave a hero pointing at nothing.
-- ===========================================================================

alter table demo_shop.variants
  add column if not exists hero_image_id uuid
    references demo_shop.media(id) on delete set null,
  add column if not exists hero_video_url text;

comment on column demo_shop.variants.hero_image_id is
  'The banner behind the first screen. A media row, so it carries alt text and '
  'appears in the picture library.';

comment on column demo_shop.variants.hero_video_url is
  'A video for the first screen, served from wherever it already lives. Not a '
  'media row: video does not belong in the logo bucket.';
