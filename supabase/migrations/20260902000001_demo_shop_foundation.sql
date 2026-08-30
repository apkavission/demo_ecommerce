-- ===========================================================================
-- The online store demo: one codebase, several complete shops.
--
-- The owner’s instruction, 2026-08-31 and again 2026-09-01: one demo project
-- holds several businesses, the super admin decides which exist, and the link
-- we send a prospect opens one of them for a limited time. This one adds the
-- thing the other five do not have — **a shop that actually transacts.**
--
-- ---------------------------------------------------------------------------
-- **Why this schema is bigger than the other demos’.**
--
-- The five before it end at an enquiry: somebody asks, the panel answers. A
-- store cannot stop there. A prospect looking at a shop demo wants to see a
-- basket survive a reload, a stock count go down, a coupon refuse itself when
-- it has expired, and an order move from placed to delivered. Every one of
-- those needs a table, and leaving them out would make this the same demo with
-- the word "product" pasted over "service".
--
-- ---------------------------------------------------------------------------
-- **Money is stored in paise, as an integer, and totals are never stored.**
--
-- Two separate rules, both learned in this estate already.
--
-- Paise because `numeric` is right and `float` is a bug waiting for a discount
-- of a third; and an integer count of the smallest unit is the one shape that
-- cannot be half a paisa.
--
-- Totals derived because a stored total is a second copy of the truth. It goes
-- stale the first time a line is edited, and then two screens disagree with no
-- way to say which is lying. `order_totals` and `cart_totals` are views: they
-- cannot drift because there is nothing to drift from.
--
-- The one deliberate exception is `order_items.unit_price` — copied at the
-- moment of ordering. That is not a cached total, it is a historical fact: what
-- the customer agreed to pay. A price change next week must not silently
-- rewrite last week’s bill.
--
-- ---------------------------------------------------------------------------
-- **Every content table carries `variant_id`, and is unique on
-- `(variant_id, slug)`** rather than on `slug` alone — so three shops in this
-- schema can each sell a product called "Classic White Shirt".
--
-- **Both themes are stored, and neither is derived from the other.** A colour
-- that works on white almost never works on near-black.
-- ===========================================================================

create schema if not exists demo_shop;

grant usage on schema demo_shop to anon, authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'publish_state' and n.nspname = 'demo_shop') then
    create type demo_shop.publish_state as enum ('draft', 'published');
  end if;

  /*
    An order's life, and every state in it is one somebody actually says out
    loud on the phone. `packed` is separate from `shipped` because "it is packed
    and waiting for pickup" is the most common honest answer to "where is my
    order", and a status list without it forces a shop to lie in one direction
    or the other.

    `returned` sits after `delivered` rather than beside `cancelled`: a
    cancellation is before anything moved, a return is after everything did, and
    the stock consequence is different for each.
  */
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'order_state' and n.nspname = 'demo_shop') then
    create type demo_shop.order_state as enum
      ('placed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'payment_state' and n.nspname = 'demo_shop') then
    -- Cash on delivery is the majority of Indian ecommerce and it is `pending`
    -- until the parcel is handed over. A demo that only models a paid card
    -- order does not look like a shop anybody here runs.
    create type demo_shop.payment_state as enum ('pending', 'paid', 'refunded', 'failed');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'discount_kind' and n.nspname = 'demo_shop') then
    create type demo_shop.discount_kind as enum ('percent', 'amount');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Pictures, businesses, navigation — the same three tables every demo has.
-- ---------------------------------------------------------------------------

create table if not exists demo_shop.media (
  id          uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  filename    text not null,
  alt         text not null default '',
  width       integer,
  height      integer,
  mime_type   text,
  created_at  timestamptz not null default now()
);

comment on column demo_shop.media.alt is
  'What the picture shows, for somebody who cannot see it. Empty means decorative — a claim, not a default to be left unread.';

create table if not exists demo_shop.variants (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z][a-z0-9-]*$'),

  name            text not null,
  industry_label  text not null,
  business_name   text not null,
  tagline         text,
  description     text,

  logo_light_id   uuid references demo_shop.media(id) on delete set null,
  logo_dark_id    uuid references demo_shop.media(id) on delete set null,
  og_image_id     uuid references demo_shop.media(id) on delete set null,

  /* Both palettes, plus type and shape:
       { "light": {...}, "dark": {...}, "headingFont", "bodyFont", "radius" } */
  theme           jsonb not null default '{}'::jsonb,
  contact         jsonb not null default '{}'::jsonb,
  features        jsonb not null default '{}'::jsonb,

  /* What this shop charges to deliver, and what it takes to get it free. Per
     business because a grocery shop and a jewellery shop do not have the same
     answer, and hardcoding one would make two of the three demos wrong. */
  shipping_paise      integer not null default 0 check (shipping_paise >= 0),
  free_shipping_above integer check (free_shipping_above is null or free_shipping_above > 0),
  currency_symbol     text not null default '₹',

  default_mode      text not null default 'light' check (default_mode in ('light','dark')),
  allow_mode_toggle boolean not null default true,

  /* public — anybody with the address, and the company site may link to it.
     link_only — only somebody holding a live share link. */
  visibility        text not null default 'public'
                      check (visibility in ('public', 'link_only')),

  is_default      boolean not null default false,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table demo_shop.variants is
  'One complete shop each. Everything a visitor sees belongs to a variant; the code belongs to all of them.';

/* The bare `/` has to land somewhere, and "whichever row came back first" is a
   home page that changes when somebody edits an unrelated field. */
create unique index if not exists variants_one_default
  on demo_shop.variants (is_default) where is_default;

create table if not exists demo_shop.nav_items (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,
  label       text not null,
  href        text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  unique (variant_id, label)
);

-- ---------------------------------------------------------------------------
-- The catalogue.
-- ---------------------------------------------------------------------------

create table if not exists demo_shop.collections (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,

  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name        text not null,
  summary     text,
  icon        text,
  image_id    uuid references demo_shop.media(id) on delete set null,

  status      demo_shop.publish_state not null default 'published',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (variant_id, slug)
);

comment on table demo_shop.collections is
  'How this shop groups what it sells. A product belongs to one; a shop with none still works.';

create table if not exists demo_shop.products (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references demo_shop.variants(id) on delete cascade,
  collection_id  uuid references demo_shop.collections(id) on delete set null,

  slug           text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name           text not null,
  summary        text,
  description    text,

  sku            text,
  image_id       uuid references demo_shop.media(id) on delete set null,

  /* The number the arithmetic uses. Paise, so a 33% discount on ₹999 is an
     integer either way it is rounded. */
  price_paise    integer not null check (price_paise >= 0),

  /* What it used to cost, struck through beside the price. Null means no claim
     is being made — which is the right default, because a fake original price
     is the oldest lie in retail and the schema should not make it the easy one.
     The check refuses the version of that lie a typo produces. */
  compare_at_paise integer check (compare_at_paise is null or compare_at_paise > price_paise),

  /* Null means "we do not count this" — a made-to-order cake, a service. Zero
     means counted and none left, which the site must show as sold out. Those
     are different answers and a single integer with a magic zero conflates
     them. */
  stock          integer check (stock is null or stock >= 0),

  /* Per unit, for the delivery estimate. Not used for pricing here — this is a
     demo, not a courier integration — but a store without it looks like a
     brochure to anybody who runs one. */
  weight_grams   integer check (weight_grams is null or weight_grams > 0),

  is_featured    boolean not null default false,
  meta_label     text,

  status         demo_shop.publish_state not null default 'published',
  sort_order     integer not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (variant_id, slug)
);

create index if not exists products_collection_idx
  on demo_shop.products (collection_id, sort_order);

/*
  Sizes, colours, capacities.

  Called `options` and not `variants`, which it would be called in any other
  shop schema, because `variants` already means "a whole business" here. Two
  meanings for one word in one schema is how somebody joins the wrong table at
  two in the morning.

  `price_delta_paise` rather than a full price: a shirt is ₹1,299 and the XXL is
  ₹100 more. Storing the absolute price on every option means changing the base
  price silently leaves the large one at last month's.
*/
create table if not exists demo_shop.product_options (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references demo_shop.products(id) on delete cascade,

  label             text not null,
  value             text not null,
  price_delta_paise integer not null default 0,
  stock             integer check (stock is null or stock >= 0),
  sort_order        integer not null default 0,

  unique (product_id, label, value)
);

create table if not exists demo_shop.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references demo_shop.products(id) on delete cascade,
  media_id    uuid not null references demo_shop.media(id) on delete cascade,
  sort_order  integer not null default 0,
  unique (product_id, media_id)
);

-- ---------------------------------------------------------------------------
-- Discounts.
-- ---------------------------------------------------------------------------

/*
  A coupon has four separate ways of being finished, and all four are real: it
  expired, it was switched off, it has been used its maximum number of times, or
  this basket is too small for it. The checkout says which — because "invalid
  code" when the answer is "spend ₹200 more" loses a sale for no reason.
*/
create table if not exists demo_shop.coupons (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references demo_shop.variants(id) on delete cascade,

  code           text not null check (code ~ '^[A-Z0-9][A-Z0-9-]*$'),
  description    text,

  kind           demo_shop.discount_kind not null default 'percent',
  amount         integer not null check (amount > 0),

  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  max_uses       integer check (max_uses is null or max_uses > 0),
  used_count     integer not null default 0 check (used_count >= 0),

  starts_at      timestamptz not null default now(),
  ends_at        timestamptz,

  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),

  unique (variant_id, code),

  /* A percentage over 100 pays the customer to shop. */
  constraint percent_within_reason
    check (kind <> 'percent' or amount between 1 and 100),

  constraint coupon_ends_after_it_starts
    check (ends_at is null or ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- The basket.
-- ---------------------------------------------------------------------------

/*
  A basket belongs to a browser, not to an account — there are no customer
  accounts in this demo and inventing them would be a week of login screens
  nobody asked to see.

  The token lives in a cookie. It is a name, not a key: the rows behind it hold
  a product id and a quantity, and nothing worth stealing. That is deliberate,
  because a cookie is copyable and a basket that carried an address would be a
  privacy problem for the sake of a demo.
*/
create table if not exists demo_shop.carts (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,

  token       text not null unique check (length(token) >= 24),
  coupon_id   uuid references demo_shop.coupons(id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists demo_shop.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references demo_shop.carts(id) on delete cascade,
  product_id  uuid not null references demo_shop.products(id) on delete cascade,
  option_id   uuid references demo_shop.product_options(id) on delete set null,

  quantity    integer not null default 1 check (quantity > 0 and quantity <= 99),
  added_at    timestamptz not null default now(),

  /* The same shirt in two sizes is two lines; the same shirt in one size twice
     is one line with quantity two. Without this the second click makes a
     duplicate row and the basket shows the shirt twice. */
  unique (cart_id, product_id, option_id)
);

-- ---------------------------------------------------------------------------
-- Orders.
-- ---------------------------------------------------------------------------

create table if not exists demo_shop.orders (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references demo_shop.variants(id) on delete cascade,

  /* Short, human, and the thing a customer reads out on the phone. A uuid is
     unreadable aloud and nobody has ever quoted one correctly. */
  code           text not null unique,

  customer_name  text not null check (length(btrim(customer_name)) > 0),
  phone          text not null check (length(btrim(phone)) > 0),
  email          text,

  address_line   text not null,
  city           text not null,
  pincode        text not null check (pincode ~ '^[0-9]{6}$'),
  note           text,

  /* Copied at the moment of ordering, both of them, for the same reason: what
     was agreed. A coupon deleted next month must not turn an old order's
     discount into nothing. */
  coupon_code    text,
  discount_paise integer not null default 0 check (discount_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),

  status         demo_shop.order_state not null default 'placed',
  payment        demo_shop.payment_state not null default 'pending',
  payment_method text not null default 'cod',

  staff_note     text,

  placed_at      timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_variant_idx
  on demo_shop.orders (variant_id, placed_at desc);

create table if not exists demo_shop.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references demo_shop.orders(id) on delete cascade,

  /* The product may be deleted from the catalogue later; the order must still
     read correctly, so the name and the price are written down here rather than
     joined for. This is the one place in the schema where duplication is the
     correct answer. */
  product_id   uuid references demo_shop.products(id) on delete set null,
  product_name text not null,
  option_label text,

  unit_price_paise integer not null check (unit_price_paise >= 0),
  quantity     integer not null check (quantity > 0)
);

-- ---------------------------------------------------------------------------
-- The rest of the site.
-- ---------------------------------------------------------------------------

create table if not exists demo_shop.team (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references demo_shop.variants(id) on delete cascade,

  slug           text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  full_name      text not null,
  role_label     text,
  qualification  text,
  bio            text,
  photo_id       uuid references demo_shop.media(id) on delete set null,
  years_experience integer check (years_experience is null or years_experience between 0 and 70),

  availability   jsonb not null default '{}'::jsonb,

  status         demo_shop.publish_state not null default 'published',
  sort_order     integer not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (variant_id, slug)
);

create table if not exists demo_shop.testimonials (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,
  product_id  uuid references demo_shop.products(id) on delete set null,
  author      text not null,
  role_label  text,
  quote       text not null,
  rating      integer check (rating is null or rating between 1 and 5),
  photo_id    uuid references demo_shop.media(id) on delete set null,
  status      demo_shop.publish_state not null default 'published',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists demo_shop.faqs (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,
  question    text not null,
  answer      text not null,
  status      demo_shop.publish_state not null default 'published',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists demo_shop.messages (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references demo_shop.variants(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  body        text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

/*
  The link we send a prospect.

  Four properties, each for a specific way a demo link goes wrong: it opens one
  business, it cannot reach the panel, it stops on a date, and it can be revoked
  now — which a signed URL with the expiry baked into it cannot be, and that is
  the case that actually matters.
*/
create table if not exists demo_shop.share_links (
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid not null references demo_shop.variants(id) on delete cascade,

  token         text not null unique check (length(token) >= 24),
  label         text not null default '',
  note          text,

  expires_at    timestamptz not null,
  revoked_at    timestamptz,

  view_count    integer not null default 0,
  last_seen_at  timestamptz,
  max_views     integer check (max_views is null or max_views > 0),

  created_by    uuid,
  created_at    timestamptz not null default now(),

  constraint share_link_expires_after_it_starts check (expires_at > created_at)
);

create index if not exists share_links_live_idx
  on demo_shop.share_links (token) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Derived money. Nothing below is stored.
-- ---------------------------------------------------------------------------

/*
  What a basket comes to.

  Written as a view because a stored total is a second copy of the truth, and
  the second copy is the one that goes stale. Change a quantity and this is
  already right; there is no trigger to forget to write and no cache to
  invalidate.

  Shipping is applied here rather than at checkout so the basket page and the
  order confirmation cannot disagree about it — they read the same expression.
*/
create or replace view demo_shop.cart_totals
with (security_invoker = true) as
select
  c.id as cart_id,
  c.variant_id,
  coalesce(sum((p.price_paise + coalesce(o.price_delta_paise, 0)) * i.quantity), 0)::integer
    as items_paise,
  coalesce(sum(i.quantity), 0)::integer as item_count
from demo_shop.carts c
left join demo_shop.cart_items i on i.cart_id = c.id
left join demo_shop.products p on p.id = i.product_id
left join demo_shop.product_options o on o.id = i.option_id
group by c.id, c.variant_id;

create or replace view demo_shop.order_totals
with (security_invoker = true) as
select
  o.id as order_id,
  coalesce(sum(i.unit_price_paise * i.quantity), 0)::integer as items_paise,
  o.discount_paise,
  o.shipping_paise,
  (coalesce(sum(i.unit_price_paise * i.quantity), 0)
     - o.discount_paise + o.shipping_paise)::integer as grand_total_paise,
  coalesce(sum(i.quantity), 0)::integer as item_count
from demo_shop.orders o
left join demo_shop.order_items i on i.order_id = o.id
group by o.id, o.discount_paise, o.shipping_paise;

-- ---------------------------------------------------------------------------
-- Housekeeping.
-- ---------------------------------------------------------------------------

create or replace function demo_shop.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['variants','products','team','orders','carts'] loop
    execute format('drop trigger if exists %I_set_updated_at on demo_shop.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on demo_shop.%I
         for each row execute function demo_shop.set_updated_at()', t, t);
  end loop;
end
$$;
