-- ===========================================================================
-- Who may read the store demo, who may change it, and who may only work it.
--
-- **Nothing in this schema is a secret.** It is invented stock for invented
-- shops. The policies exist so a visitor cannot *change* what the next prospect
-- sees, so an order typed into a demo does not appear on a public page, and so
-- the panel can honestly show three different people three different screens.
--
-- ---------------------------------------------------------------------------
-- **Three tiers, not two, and this is the demo that needed them.**
--
-- The other five demos have admin and super admin, which is enough when the
-- only thing anybody does is read enquiries. A shop has a job that is neither:
-- the person who packs orders all day. They must be able to move an order from
-- placed to shipped, and must not be able to change a price — not because they
-- are not trusted, but because a pricing mistake made while packing is a
-- mistake nobody is looking for.
--
--   super admin  which businesses exist, the share links we send prospects
--   manager      the catalogue, the coupons, the content, and orders
--   staff        orders and messages, and reads everything else
--
-- The role list itself is not here. The estate has one, in the company website,
-- and this reads two columns of one row of it and fails towards "not an admin".
--
-- ---------------------------------------------------------------------------
-- **The basket and the checkout do not go through row-level security at all.**
--
-- A basket belongs to a browser, identified by a cookie, and a row policy has
-- no way to see a cookie. Pretending otherwise would mean a lie in a comment
-- and a policy that reads `true`. So baskets are written by the server, with
-- the service role, and an order is placed by one function that holds the
-- stock check, the coupon check and the price snapshot in a single transaction
-- where they cannot half-happen.
-- ===========================================================================

create or replace function demo_shop.is_admin()
returns boolean language sql stable security definer
set search_path = company, public
as $$
  select exists (
    select 1 from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid() and p.is_active and r.is_active
      and 'shop' = any (p.app_access)
  );
$$;

create or replace function demo_shop.is_super_admin()
returns boolean language sql stable security definer
set search_path = company, public
as $$
  select exists (
    select 1 from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid() and p.is_active and r.is_active and r.is_owner
      and 'shop' = any (p.app_access)
  );
$$;

/*
  May this person change what the shop sells and what it charges?

  An owner may, and so may anybody carrying the estate's `admin` role. Everybody
  else with access to this demo can work the orders and read the rest.

  Written as `is_owner or key = 'admin'` rather than as a list of who cannot,
  because a role added to the estate next month should arrive with the smaller
  permission and be raised deliberately — a default that grows on its own is how
  a packer ends up able to reprice the catalogue.
*/
create or replace function demo_shop.is_manager()
returns boolean language sql stable security definer
set search_path = company, public
as $$
  select exists (
    select 1 from company.profiles p
    join company.roles r on r.key = p.role
    where p.id = auth.uid() and p.is_active and r.is_active
      and 'shop' = any (p.app_access)
      and (r.is_owner or r.key = 'admin')
  );
$$;

grant execute on function demo_shop.is_admin() to authenticated;
grant execute on function demo_shop.is_super_admin() to authenticated;
grant execute on function demo_shop.is_manager() to authenticated;

/* The panel's view of who is signed in — the caller's own row and nothing else.
   Runs with owner rights, so the where clause is the access control. */
create or replace view demo_shop.me
with (security_invoker = false) as
  select p.id, p.full_name, p.role as role_key, r.label as role_label,
         r.is_owner, p.app_access, p.is_active
  from company.profiles p
  left join company.roles r on r.key = p.role
  where p.id = auth.uid();

grant select on demo_shop.me to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security on, everywhere, before any grant is given.
-- ---------------------------------------------------------------------------

alter table demo_shop.media           enable row level security;
alter table demo_shop.variants        enable row level security;
alter table demo_shop.nav_items       enable row level security;
alter table demo_shop.collections     enable row level security;
alter table demo_shop.products        enable row level security;
alter table demo_shop.product_options enable row level security;
alter table demo_shop.product_images  enable row level security;
alter table demo_shop.coupons         enable row level security;
alter table demo_shop.carts           enable row level security;
alter table demo_shop.cart_items      enable row level security;
alter table demo_shop.orders          enable row level security;
alter table demo_shop.order_items     enable row level security;
alter table demo_shop.team            enable row level security;
alter table demo_shop.testimonials    enable row level security;
alter table demo_shop.faqs            enable row level security;
alter table demo_shop.messages        enable row level security;
alter table demo_shop.share_links     enable row level security;

/* A grant is a ceiling, not a permission: row-level security still has to allow
   the row. anon receives select only, and only on what renders a public page. */
grant select on
  demo_shop.media, demo_shop.variants, demo_shop.nav_items,
  demo_shop.collections, demo_shop.products, demo_shop.product_options,
  demo_shop.product_images, demo_shop.team, demo_shop.testimonials, demo_shop.faqs
  to anon, authenticated;

grant insert on demo_shop.messages to anon, authenticated;

grant select, insert, update, delete on
  demo_shop.media, demo_shop.variants, demo_shop.nav_items,
  demo_shop.collections, demo_shop.products, demo_shop.product_options,
  demo_shop.product_images, demo_shop.coupons,
  demo_shop.carts, demo_shop.cart_items,
  demo_shop.orders, demo_shop.order_items,
  demo_shop.team, demo_shop.testimonials, demo_shop.faqs,
  demo_shop.messages, demo_shop.share_links
  to authenticated;

grant select on demo_shop.cart_totals, demo_shop.order_totals to authenticated;

grant all on all tables in schema demo_shop to service_role;

-- ---------------------------------------------------------------------------
-- The catalogue and the content.
-- ---------------------------------------------------------------------------

/* Published rows of active shops are public. Drafts are not — that is the point
   of the state: somebody half-way through writing a description should be able
   to save it without a prospect reading it that afternoon.

   Reading everything, drafts included, is `is_admin` — a packer needs to see a
   draft product to answer a question about it. Writing is `is_manager`. */
do $$
declare t text;
begin
  foreach t in array array['collections','products','team','testimonials','faqs'] loop
    execute format('drop policy if exists %I_public_read on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_public_read on demo_shop.%I
        for select using (
          status = 'published'
          and exists (select 1 from demo_shop.variants v
                       where v.id = variant_id and v.is_active)
        )
    $p$, t, t);

    execute format('drop policy if exists %I_staff_read on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_staff_read on demo_shop.%I
        for select using (demo_shop.is_admin())
    $p$, t, t);

    execute format('drop policy if exists %I_manager_write on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_manager_write on demo_shop.%I
        for all using (demo_shop.is_manager()) with check (demo_shop.is_manager())
    $p$, t, t);
  end loop;
end
$$;

/* Options and images hang off a product and inherit its answer. Written as an
   exists rather than duplicated, so a product going to draft takes its sizes
   with it and there is no second rule to keep in step. */
do $$
declare t text;
begin
  foreach t in array array['product_options','product_images'] loop
    execute format('drop policy if exists %I_public_read on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_public_read on demo_shop.%I
        for select using (
          exists (
            select 1 from demo_shop.products p
            join demo_shop.variants v on v.id = p.variant_id
            where p.id = product_id and p.status = 'published' and v.is_active
          )
        )
    $p$, t, t);

    execute format('drop policy if exists %I_staff_read on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_staff_read on demo_shop.%I
        for select using (demo_shop.is_admin())
    $p$, t, t);

    execute format('drop policy if exists %I_manager_write on demo_shop.%I', t, t);
    execute format($p$
      create policy %I_manager_write on demo_shop.%I
        for all using (demo_shop.is_manager()) with check (demo_shop.is_manager())
    $p$, t, t);
  end loop;
end
$$;

drop policy if exists variants_public_read on demo_shop.variants;
create policy variants_public_read on demo_shop.variants for select using (is_active);

/* Only a super admin decides which shops exist. Adding, renaming or retiring
   one changes what every visitor sees. */
drop policy if exists variants_super_admin_write on demo_shop.variants;
create policy variants_super_admin_write on demo_shop.variants
  for all using (demo_shop.is_super_admin()) with check (demo_shop.is_super_admin());

drop policy if exists nav_public_read on demo_shop.nav_items;
create policy nav_public_read on demo_shop.nav_items
  for select using (
    is_active and exists (select 1 from demo_shop.variants v
                           where v.id = variant_id and v.is_active)
  );

drop policy if exists nav_manager_write on demo_shop.nav_items;
create policy nav_manager_write on demo_shop.nav_items
  for all using (demo_shop.is_manager()) with check (demo_shop.is_manager());

drop policy if exists media_public_read on demo_shop.media;
create policy media_public_read on demo_shop.media for select using (true);

drop policy if exists media_manager_write on demo_shop.media;
create policy media_manager_write on demo_shop.media
  for all using (demo_shop.is_manager()) with check (demo_shop.is_manager());

-- ---------------------------------------------------------------------------
-- Money.
-- ---------------------------------------------------------------------------

/* A coupon is never public. The code is meant to be given out, but the list of
   codes is the shop's margin written down, and a `select *` on it is every
   discount the business has ever offered. Checking a code is a function, below,
   which answers about one code and says nothing about the others. */
drop policy if exists coupons_manager_all on demo_shop.coupons;
create policy coupons_manager_all on demo_shop.coupons
  for all using (demo_shop.is_manager()) with check (demo_shop.is_manager());

drop policy if exists coupons_staff_read on demo_shop.coupons;
create policy coupons_staff_read on demo_shop.coupons
  for select using (demo_shop.is_admin());

/* Baskets: the panel may read them — an abandoned basket is the most useful
   number a small shop has — and nobody signed in may write one. Writing is the
   server's job, through the service role, because the owner of a basket is a
   cookie and a policy cannot see a cookie. */
drop policy if exists carts_staff_read on demo_shop.carts;
create policy carts_staff_read on demo_shop.carts
  for select using (demo_shop.is_admin());

drop policy if exists cart_items_staff_read on demo_shop.cart_items;
create policy cart_items_staff_read on demo_shop.cart_items
  for select using (demo_shop.is_admin());

/* Orders: everybody in the panel reads them and may move them along, which is
   the whole job of the staff tier. Deleting one is a manager's — an order is a
   record of something that happened, and "it was a test" is a note, not a
   reason to make it never have existed. */
drop policy if exists orders_staff_read on demo_shop.orders;
create policy orders_staff_read on demo_shop.orders
  for select using (demo_shop.is_admin());

drop policy if exists orders_staff_update on demo_shop.orders;
create policy orders_staff_update on demo_shop.orders
  for update using (demo_shop.is_admin()) with check (demo_shop.is_admin());

drop policy if exists orders_manager_delete on demo_shop.orders;
create policy orders_manager_delete on demo_shop.orders
  for delete using (demo_shop.is_manager());

drop policy if exists order_items_staff_read on demo_shop.order_items;
create policy order_items_staff_read on demo_shop.order_items
  for select using (demo_shop.is_admin());

drop policy if exists order_items_manager_write on demo_shop.order_items;
create policy order_items_manager_write on demo_shop.order_items
  for all using (demo_shop.is_manager()) with check (demo_shop.is_manager());

/* Anybody may write to the shop; only the shop may read what was written. The
   insert is open because that is the demonstration; the read is closed because
   the next visitor must not see the last one's phone number, invented or not. */
drop policy if exists messages_public_insert on demo_shop.messages;
create policy messages_public_insert on demo_shop.messages
  for insert with check (
    exists (select 1 from demo_shop.variants v where v.id = variant_id and v.is_active)
  );

drop policy if exists messages_staff_all on demo_shop.messages;
create policy messages_staff_all on demo_shop.messages
  for all using (demo_shop.is_admin()) with check (demo_shop.is_admin());

/* Share links are never readable by the public. The token is the whole secret,
   and the labels beside it are a list of who we are pitching to. */
drop policy if exists share_links_admin_all on demo_shop.share_links;
create policy share_links_admin_all on demo_shop.share_links
  for all using (demo_shop.is_super_admin()) with check (demo_shop.is_super_admin());

-- ---------------------------------------------------------------------------
-- Who may see which shop.
-- ---------------------------------------------------------------------------

/**
 * May this browser see this variant?
 *
 *   ok         — go ahead.
 *   needs_link — link-only, and no live link was presented.
 *   wrong_link — a live link for a different variant. Worth distinguishing,
 *                because the answer is "here is yours" rather than "no".
 *   unknown    — no such variant.
 *
 * Every kind of failure that is not `wrong_link` looks the same from outside:
 * expired, revoked, used up and never-existed all give `needs_link`. Telling
 * them apart tells somebody probing which tokens are real.
 */
create or replace function demo_shop.can_view(p_slug text, p_token text default null)
returns table (verdict text, allowed_slug text)
language plpgsql stable security definer
set search_path = demo_shop, public
as $$
declare
  v record;
  link record;
begin
  select id, slug, visibility into v
  from demo_shop.variants where slug = p_slug and is_active;

  if p_token is not null then
    select l.id, l.variant_id, vv.slug as slug into link
    from demo_shop.share_links l
    join demo_shop.variants vv on vv.id = l.variant_id
    where l.token = p_token
      and l.revoked_at is null
      and l.expires_at > now()
      and vv.is_active
      and (l.max_views is null or l.view_count < l.max_views);
  end if;

  if v.id is null then
    verdict := case when link.id is null then 'unknown' else 'wrong_link' end;
    allowed_slug := link.slug;
    return next;
    return;
  end if;

  if v.visibility = 'public' then
    verdict := 'ok'; allowed_slug := v.slug; return next; return;
  end if;

  if link.id is null then
    verdict := 'needs_link'; allowed_slug := null; return next; return;
  end if;

  if link.variant_id = v.id then
    verdict := 'ok'; allowed_slug := v.slug;
  else
    verdict := 'wrong_link'; allowed_slug := link.slug;
  end if;

  return next;
end;
$$;

grant execute on function demo_shop.can_view(text, text) to anon, authenticated;

/* Counted when a link is first opened, not on every request — otherwise one
   prospect reading six pages reports as forty visits, and the number exists to
   answer "did they actually look at it". */
create or replace function demo_shop.note_share_visit(p_token text)
returns void language sql security definer
set search_path = demo_shop, public
as $$
  update demo_shop.share_links
  set view_count = view_count + 1, last_seen_at = now()
  where token = p_token and revoked_at is null and expires_at > now();
$$;

grant execute on function demo_shop.note_share_visit(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The checkout.
-- ---------------------------------------------------------------------------

/**
 * Is this coupon usable on a basket of this size, and if not, why not?
 *
 * Returns a verdict rather than a boolean, because the four ways a coupon fails
 * need four different sentences at the checkout. "Invalid code" when the true
 * answer is "spend ₹200 more" loses a sale for no reason at all.
 *
 * It answers about **one** code and reveals nothing about any other, which is
 * why the coupons table itself stays closed to everybody but the panel.
 */
create or replace function demo_shop.check_coupon(
  p_variant_id uuid,
  p_code       text,
  p_items_paise integer
)
returns table (verdict text, discount_paise integer, message text)
language plpgsql stable security definer
set search_path = demo_shop, public
as $$
declare
  c record;
begin
  select * into c from demo_shop.coupons
  where variant_id = p_variant_id and code = upper(btrim(p_code));

  if c.id is null then
    verdict := 'unknown'; discount_paise := 0;
    message := 'That code is not one of ours.';
    return next; return;
  end if;

  if not c.is_active then
    verdict := 'inactive'; discount_paise := 0;
    message := 'That code is no longer in use.';
    return next; return;
  end if;

  if c.starts_at > now() then
    verdict := 'early'; discount_paise := 0;
    message := 'That code does not start yet.';
    return next; return;
  end if;

  if c.ends_at is not null and c.ends_at <= now() then
    verdict := 'expired'; discount_paise := 0;
    message := 'That code has expired.';
    return next; return;
  end if;

  if c.max_uses is not null and c.used_count >= c.max_uses then
    verdict := 'used_up'; discount_paise := 0;
    message := 'That code has been used its maximum number of times.';
    return next; return;
  end if;

  if p_items_paise < c.min_order_paise then
    verdict := 'too_small'; discount_paise := 0;
    message := 'Spend ' || to_char((c.min_order_paise - p_items_paise) / 100.0, 'FM9,999,990.00')
               || ' more to use that code.';
    return next; return;
  end if;

  /* Capped at the basket: a ₹500-off code on a ₹300 basket takes ₹300, never
     ₹500, because the alternative is a negative total and a shop that pays
     people to order. */
  discount_paise := least(
    case when c.kind = 'percent' then (p_items_paise * c.amount) / 100 else c.amount end,
    p_items_paise
  );
  verdict := 'ok';
  message := coalesce(c.description, 'Discount applied.');
  return next;
end;
$$;

grant execute on function demo_shop.check_coupon(uuid, text, integer) to anon, authenticated;

/**
 * Turn a basket into an order.
 *
 * **One function, one transaction, on purpose.** Placing an order is four
 * things that must all happen or none of them: read the basket at today's
 * prices, refuse anything that has gone out of stock, take the stock down, and
 * write the lines with the price the customer actually saw. Doing that from the
 * application means four round trips with a gap between each, and the gap is
 * where two people buy the last one.
 *
 * `for update` on the product rows is the whole point: a second checkout for
 * the same last item waits here rather than reading the same stock count and
 * both succeeding.
 *
 * Prices are re-read from the catalogue rather than taken from the caller. A
 * price posted from a browser is a price a browser can edit.
 */
create or replace function demo_shop.place_order(
  p_cart_token   text,
  p_name         text,
  p_phone        text,
  p_email        text,
  p_address_line text,
  p_city         text,
  p_pincode      text,
  p_note         text default null
)
returns table (order_code text, grand_total_paise integer, problem text)
language plpgsql security definer
set search_path = demo_shop, public
as $$
declare
  cart      record;
  shop      record;
  line      record;
  coupon    record;
  new_order demo_shop.orders;
  items_total integer := 0;
  discount    integer := 0;
  shipping    integer := 0;
  short_name  text;
begin
  select c.* into cart from demo_shop.carts c where c.token = p_cart_token;

  if cart.id is null then
    order_code := null; grand_total_paise := 0;
    problem := 'That basket has gone. Add something and try again.';
    return next; return;
  end if;

  select v.* into shop from demo_shop.variants v where v.id = cart.variant_id;

  if not shop.is_active then
    order_code := null; grand_total_paise := 0;
    problem := 'This shop is not taking orders.';
    return next; return;
  end if;

  if not exists (select 1 from demo_shop.cart_items where cart_id = cart.id) then
    order_code := null; grand_total_paise := 0;
    problem := 'The basket is empty.';
    return next; return;
  end if;

  /* Lock every product in the basket, in a stable order, before checking any of
     them. Ordering by id is not decoration: two baskets holding the same two
     products, locked in opposite orders, deadlock. */
  perform 1 from demo_shop.products p
   where p.id in (select product_id from demo_shop.cart_items where cart_id = cart.id)
   order by p.id
   for update;

  for line in
    select i.quantity, i.option_id,
           p.id as product_id, p.name, p.price_paise, p.stock, p.status,
           o.label as option_label, o.value as option_value,
           o.price_delta_paise, o.stock as option_stock
    from demo_shop.cart_items i
    join demo_shop.products p on p.id = i.product_id
    left join demo_shop.product_options o on o.id = i.option_id
    where i.cart_id = cart.id
  loop
    if line.status <> 'published' then
      order_code := null; grand_total_paise := 0;
      problem := line.name || ' is no longer on sale.';
      return next; return;
    end if;

    /* An option's own count wins where it has one: three shirts left says
       nothing about how many are large. */
    if line.option_id is not null and line.option_stock is not null then
      if line.option_stock < line.quantity then
        order_code := null; grand_total_paise := 0;
        problem := line.name || ' (' || line.option_value || ') — only '
                   || line.option_stock || ' left.';
        return next; return;
      end if;
    elsif line.stock is not null and line.stock < line.quantity then
      order_code := null; grand_total_paise := 0;
      problem := line.name || ' — only ' || line.stock || ' left.';
      return next; return;
    end if;

    items_total := items_total
      + (line.price_paise + coalesce(line.price_delta_paise, 0)) * line.quantity;
  end loop;

  if cart.coupon_id is not null then
    select * into coupon from demo_shop.coupons where id = cart.coupon_id;

    if coupon.id is not null and coupon.is_active
       and coupon.starts_at <= now()
       and (coupon.ends_at is null or coupon.ends_at > now())
       and (coupon.max_uses is null or coupon.used_count < coupon.max_uses)
       and items_total >= coupon.min_order_paise then
      discount := least(
        case when coupon.kind = 'percent' then (items_total * coupon.amount) / 100
             else coupon.amount end,
        items_total
      );
    else
      /* A coupon that died between the basket page and this button is not an
         error worth stopping for — the order goes through at full price and the
         confirmation shows what was charged. Refusing the whole order would be
         the more surprising behaviour. */
      coupon := null;
    end if;
  end if;

  if shop.free_shipping_above is not null
     and (items_total - discount) >= shop.free_shipping_above then
    shipping := 0;
  else
    shipping := shop.shipping_paise;
  end if;

  short_name := upper(left(regexp_replace(shop.slug, '[^a-z]', '', 'g'), 3));

  insert into demo_shop.orders (
    variant_id, code, customer_name, phone, email,
    address_line, city, pincode, note,
    coupon_code, discount_paise, shipping_paise
  ) values (
    cart.variant_id,
    short_name || '-' || to_char(now(), 'YYMMDD') || '-'
      || lpad((floor(random() * 10000))::text, 4, '0'),
    btrim(p_name), btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''),
    btrim(p_address_line), btrim(p_city), btrim(p_pincode),
    nullif(btrim(coalesce(p_note, '')), ''),
    coupon.code, discount, shipping
  )
  returning * into new_order;

  insert into demo_shop.order_items
    (order_id, product_id, product_name, option_label, unit_price_paise, quantity)
  select
    new_order.id, p.id, p.name,
    case when o.id is null then null else o.label || ': ' || o.value end,
    p.price_paise + coalesce(o.price_delta_paise, 0),
    i.quantity
  from demo_shop.cart_items i
  join demo_shop.products p on p.id = i.product_id
  left join demo_shop.product_options o on o.id = i.option_id
  where i.cart_id = cart.id;

  /* Stock comes down from whichever count is the real one for that line. */
  update demo_shop.product_options o
     set stock = o.stock - i.quantity
    from demo_shop.cart_items i
   where i.cart_id = cart.id and i.option_id = o.id and o.stock is not null;

  update demo_shop.products p
     set stock = p.stock - i.quantity
    from demo_shop.cart_items i
   where i.cart_id = cart.id and i.product_id = p.id and p.stock is not null
     and (i.option_id is null
          or not exists (select 1 from demo_shop.product_options o
                          where o.id = i.option_id and o.stock is not null));

  if coupon.id is not null then
    update demo_shop.coupons set used_count = used_count + 1 where id = coupon.id;
  end if;

  /* The basket is gone, not emptied. A basket row that outlives its order shows
     up in the abandoned-basket count as a sale that did not happen. */
  delete from demo_shop.carts where id = cart.id;

  order_code := new_order.code;
  grand_total_paise := items_total - discount + shipping;
  problem := null;
  return next;
end;
$$;

grant execute on function demo_shop.place_order(text, text, text, text, text, text, text, text)
  to anon, authenticated;

/**
 * What one order came to, for the person who placed it.
 *
 * The orders table is closed to the public, and correctly — but somebody who
 * has just ordered has to be able to see their own confirmation. This answers
 * about one order, by a code they were just given, and returns no phone number
 * and no address: only what they bought and what it cost.
 */
create or replace function demo_shop.order_summary(p_code text)
returns table (
  code text, placed_at timestamptz, status text,
  items_paise integer, discount_paise integer, shipping_paise integer,
  grand_total_paise integer, item_count integer, customer_name text
)
language sql stable security definer
set search_path = demo_shop, public
as $$
  select o.code, o.placed_at, o.status::text,
         t.items_paise, t.discount_paise, t.shipping_paise,
         t.grand_total_paise, t.item_count, o.customer_name
  from demo_shop.orders o
  join demo_shop.order_totals t on t.order_id = o.id
  where o.code = p_code;
$$;

grant execute on function demo_shop.order_summary(text) to anon, authenticated;
