-- ===========================================================================
-- Copy a whole shop.
--
-- **The button that was missing.** Adding a fourth business meant writing SQL
-- by hand, every time, and it was on the not-done list of all five earlier
-- demos with the same one-line explanation: "the clone has to walk every table
-- in dependency order and remap the ids".
--
-- ---------------------------------------------------------------------------
-- **Why it is a database function and not application code.**
--
-- It is one transaction. A product points at a collection, an option points at
-- a product, and a copy done in eight round trips from the application leaves a
-- half-cloned shop behind the first time a connection drops — a variant row
-- with no products, or products pointing at the original’s collections. Half a
-- shop is worse than none, because it looks finished.
--
-- ---------------------------------------------------------------------------
-- **What it deliberately does not copy: orders, baskets, messages, links.**
--
-- Those belong to the business that received them. A new shop opening with
-- somebody else’s orders in its panel is alarming rather than convenient, and a
-- copied share link would hand a second prospect a URL we thought we had given
-- to one person.
--
-- **The copy arrives switched off and link-only.** A new shop appearing live on
-- the public site the instant somebody presses copy is the wrong default: it
-- has the original’s name and prices until it is edited, which is exactly when
-- nobody should be able to find it.
-- ===========================================================================

create or replace function demo_shop.clone_variant(
  p_source uuid,
  p_slug   text,
  p_name   text
)
returns uuid
language plpgsql security definer
set search_path = demo_shop, public
as $$
declare
  new_id uuid;
  mapping jsonb := '{}'::jsonb;
  row_in  record;
  new_collection uuid;
begin
  if not demo_shop.is_super_admin() then
    raise exception 'Only a super admin may copy a shop.';
  end if;

  if exists (select 1 from demo_shop.variants where slug = p_slug) then
    raise exception 'That address is already taken.';
  end if;

  /* The shop itself. Everything about it except its identity, its default flag
     and its visibility, all three of which must not be copied. */
  insert into demo_shop.variants (
    slug, name, industry_label, business_name, tagline, description,
    logo_light_id, logo_dark_id, og_image_id,
    theme, contact, features,
    shipping_paise, free_shipping_above, currency_symbol,
    default_mode, allow_mode_toggle,
    visibility, is_default, is_active, sort_order
  )
  select
    p_slug, p_name, v.industry_label, p_name, v.tagline, v.description,
    v.logo_light_id, v.logo_dark_id, v.og_image_id,
    v.theme, v.contact, v.features,
    v.shipping_paise, v.free_shipping_above, v.currency_symbol,
    v.default_mode, v.allow_mode_toggle,
    'link_only', false, false, v.sort_order + 1
  from demo_shop.variants v
  where v.id = p_source
  returning id into new_id;

  if new_id is null then
    raise exception 'There is no shop to copy.';
  end if;

  insert into demo_shop.nav_items (variant_id, label, href, sort_order, is_active)
  select new_id, label, href, sort_order, is_active
  from demo_shop.nav_items where variant_id = p_source;

  /* Collections first, keeping a note of which new id replaced which old one.
     A jsonb map rather than a temporary table: it is a handful of rows, and a
     temp table inside a security-definer function is a lifetime nobody wants to
     reason about. */
  for row_in in
    select * from demo_shop.collections where variant_id = p_source order by sort_order
  loop
    insert into demo_shop.collections
      (variant_id, slug, name, summary, icon, image_id, status, sort_order)
    values
      (new_id, row_in.slug, row_in.name, row_in.summary, row_in.icon,
       row_in.image_id, row_in.status, row_in.sort_order)
    returning id into new_collection;

    mapping := mapping || jsonb_build_object(row_in.id::text, new_collection::text);
  end loop;

  /* Products, each pointing at the *copied* collection rather than the
     original's. This is the line the whole function exists for. */
  for row_in in
    select * from demo_shop.products where variant_id = p_source order by sort_order
  loop
    declare
      new_product uuid;
    begin
      insert into demo_shop.products (
        variant_id, collection_id, slug, name, summary, description,
        sku, image_id, price_paise, compare_at_paise, stock, weight_grams,
        is_featured, meta_label, status, sort_order
      ) values (
        new_id,
        case when row_in.collection_id is null then null
             else (mapping ->> row_in.collection_id::text)::uuid end,
        row_in.slug, row_in.name, row_in.summary, row_in.description,
        row_in.sku, row_in.image_id, row_in.price_paise, row_in.compare_at_paise,
        row_in.stock, row_in.weight_grams,
        row_in.is_featured, row_in.meta_label, row_in.status, row_in.sort_order
      )
      returning id into new_product;

      insert into demo_shop.product_options
        (product_id, label, value, price_delta_paise, stock, sort_order)
      select new_product, label, value, price_delta_paise, stock, sort_order
      from demo_shop.product_options where product_id = row_in.id;

      insert into demo_shop.product_images (product_id, media_id, sort_order)
      select new_product, media_id, sort_order
      from demo_shop.product_images where product_id = row_in.id;
    end;
  end loop;

  insert into demo_shop.team (
    variant_id, slug, full_name, role_label, qualification, bio,
    photo_id, years_experience, availability, status, sort_order
  )
  select new_id, slug, full_name, role_label, qualification, bio,
         photo_id, years_experience, availability, status, sort_order
  from demo_shop.team where variant_id = p_source;

  /* Testimonials lose their product link. The copied product is a different
     row, and pointing a review at the original's would tie two shops together
     in the one place nobody would look. */
  insert into demo_shop.testimonials
    (variant_id, author, role_label, quote, rating, photo_id, status, sort_order)
  select new_id, author, role_label, quote, rating, photo_id, status, sort_order
  from demo_shop.testimonials where variant_id = p_source;

  insert into demo_shop.faqs (variant_id, question, answer, status, sort_order)
  select new_id, question, answer, status, sort_order
  from demo_shop.faqs where variant_id = p_source;

  /* Coupons are copied switched off. A discount code that starts working in a
     second shop the moment it is created is a margin decision nobody made. */
  insert into demo_shop.coupons (
    variant_id, code, description, kind, amount,
    min_order_paise, max_uses, used_count, starts_at, ends_at, is_active
  )
  select new_id, code, description, kind, amount,
         min_order_paise, max_uses, 0, now(), ends_at, false
  from demo_shop.coupons where variant_id = p_source;

  return new_id;
end;
$$;

grant execute on function demo_shop.clone_variant(uuid, text, text) to authenticated;

comment on function demo_shop.clone_variant(uuid, text, text) is
  'Copy a shop and everything it sells. Orders, baskets, messages and share links stay with the original.';
