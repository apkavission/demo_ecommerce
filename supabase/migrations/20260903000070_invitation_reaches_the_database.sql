-- ===========================================================================
-- The invitation reaches the database.
--
-- ---------------------------------------------------------------------------
-- **What was wrong.**
--
--   > jitna bhi chej h ye yaad rakhna ki kisi ka bhi url koi aur access na kar
--   > sake … kuch bhi browser me leak mat chodna
--
-- Every variant in this schema is `link_only`, and `can_view` enforces that
-- faithfully — in `proxy.ts`. The database did not enforce it at all.
--
--     variants_public_read      using (is_active)
--     courses_public_read       using (status = 'published')
--     faculty_public_read       using (status = 'published')
--     …
--
-- Not one of those policies asks *who is asking*. They were written when the
-- only question was "is this row finished", because every demo was public and
-- there was no such thing as a visitor who should be turned away. Closing the
-- demos changed the question and left the answers alone.
--
-- The consequence, measured rather than imagined: a request to PostgREST
-- carrying nothing but the publishable key returned a row from every one of the
-- six schemas. That key is not a secret — it is shipped to browsers by design,
-- and one of these demos is currently public, so it can be read out of a page
-- by anybody. Every published course, doctor, listing, product, price and
-- testimonial belonging to every business was readable by somebody who had
-- never been sent a link at all.
--
-- ---------------------------------------------------------------------------
-- **The token travels in a header, and the database reads it.**
--
-- PostgREST puts the request's headers in `request.headers`, so a policy can
-- ask the same question `can_view` asks: is there a live, unrevoked, unexpired
-- share link with this token? The application sends the header from the cookie
-- it already sets when a link is redeemed.
--
-- **This is not a new credential to guard.** The header carries the token from
-- the link. Somebody who can send it is somebody who was sent the link — which
-- is precisely the permission being checked. Forging it means guessing the
-- token, and a guessed one is looked up like any other.
--
-- ---------------------------------------------------------------------------
-- **The policies are amended, not replaced.**
--
-- Each existing `*_public_read` rule keeps whatever it already said — mostly
-- `status = 'published'`, which is still true and still wanted — and gains one
-- more condition. Rewriting fifty-one of them by hand across six schemas is how
-- one gets missed, and the one that gets missed is the leak.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Who is asking
-- ---------------------------------------------------------------------------

/**
 * The share token this request is carrying, if any.
 *
 * `request.headers` is absent outside PostgREST — a migration, a psql session,
 * a scheduled job — so the fallback is an empty object rather than an error.
 * Those callers are the service role, which does not consult policies anyway.
 */
create or replace function demo_shop.visitor_token()
returns text
language sql
stable
set search_path = 'demo_shop', 'public'
as $fn$
  select nullif(
    coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-share-token',
    ''
  );
$fn$;

comment on function demo_shop.visitor_token() is
  'The share token on this request, read from the x-share-token header the application sets from the redeemed cookie.';

/**
 * The one variant this request has been invited to, or null.
 *
 * `security definer` because `share_links` is not readable by a visitor and
 * must not become readable: the list of live tokens is the one thing that would
 * turn a single invitation into all of them.
 *
 * The conditions are exactly `can_view`'s, deliberately. Two places deciding
 * whether a link is alive is one too many, but the alternative — a policy
 * calling a function that returns a table of verdicts — is worse to read and
 * slower per row. They are kept identical, and this comment is the reason.
 */
create or replace function demo_shop.admitted_variant()
returns uuid
language sql
stable
security definer
set search_path = 'demo_shop', 'public'
as $fn$
  select l.variant_id
    from demo_shop.share_links l
    join demo_shop.variants v on v.id = l.variant_id
   where l.token = demo_shop.visitor_token()
     and l.revoked_at is null
     and l.expires_at > now()
     and v.is_active
     and (l.max_views is null or l.view_count < l.max_views)
   limit 1;
$fn$;

comment on function demo_shop.admitted_variant() is
  'The variant this request holds a live share link for, or null. Definer, because the list of live tokens must never be readable.';

/**
 * May this request see rows belonging to this business?
 *
 * `security definer` also settles the recursion question: a policy on
 * `courses` calling a function that selects from `variants` would otherwise
 * evaluate the `variants` policy for every row. Owned by a role that bypasses
 * row security, it reads the table plainly and once.
 */
create or replace function demo_shop.may_see(p_variant uuid)
returns boolean
language sql
stable
security definer
set search_path = 'demo_shop', 'public'
as $fn$
  select demo_shop.is_admin() or exists (
    select 1 from demo_shop.variants v
     where v.id = p_variant
       and v.is_active
       and (v.visibility = 'public' or v.id = demo_shop.admitted_variant())
  );
$fn$;

comment on function demo_shop.may_see(uuid) is
  'True when this request may read a business: it is public, or the request carries a live link to it, or the caller runs the panel.';

grant execute on function demo_shop.visitor_token() to anon, authenticated;
grant execute on function demo_shop.admitted_variant() to anon, authenticated;
grant execute on function demo_shop.may_see(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Every public read gains the question
-- ---------------------------------------------------------------------------

do $do$
declare
  rule record;
  gate text;
  has_variant boolean;
begin
  for rule in
    select p.polname, c.relname, pg_get_expr(p.polqual, p.polrelid) as qual
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'demo_shop'
       and p.polcmd = 'r'      -- select
       and p.polpermissive           -- permissive policies are ORed: one open rule opens the table
       and p.polname like '%public_read'
     order by c.relname
  loop
    /* Applying it twice does no harm, but it makes the policy unreadable. */
    if rule.qual like '%may_see%' or rule.qual like '%admitted_variant%' then
      raise notice 'already gated: demo_shop.%', rule.relname;
      continue;
    end if;

    select exists (
      select 1 from information_schema.columns
       where table_schema = 'demo_shop'
         and table_name = rule.relname
         and column_name = 'variant_id'
    ) into has_variant;

    if rule.relname = 'variants' then
      /*
        Asked inline rather than through `may_see`, because a policy on
        `variants` that calls a function selecting from `variants` is a loop
        waiting for somebody to drop the definer.
      */
      gate := '(visibility = ''public'' or id = demo_shop.admitted_variant() or demo_shop.is_admin())';

    elsif has_variant then
      gate := 'demo_shop.may_see(variant_id)';

    elsif rule.relname in ('product_images', 'product_options') then
      /* These hang off a product, and the product knows its business. */
      gate := 'exists (select 1 from demo_shop.products p where p.id = product_id and demo_shop.may_see(p.variant_id))';

    elsif rule.relname = 'media' then
      /*
        Media belongs to no single business, and the files themselves live in a
        public bucket — somebody who knows a storage key can already fetch the
        picture. What closes here is the *listing*: a stranger with no
        invitation can no longer enumerate every filename in the estate.
      */
      gate := '(demo_shop.is_admin() or demo_shop.admitted_variant() is not null or exists (select 1 from demo_shop.variants v where v.is_active and v.visibility = ''public''))';

    else
      raise warning 'no gate for demo_shop.% — left as it was, look at it', rule.relname;
      continue;
    end if;

    execute format(
      'alter policy %I on %I.%I using ((%s) and %s)',
      rule.polname, 'demo_shop', rule.relname, rule.qual, gate
    );

    raise notice 'gated demo_shop.%', rule.relname;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- A view is not a way around it
-- ---------------------------------------------------------------------------

/*
  A view runs as its owner unless told otherwise, and its owner bypasses row
  security. `media_public` was therefore an unlocked door beside a locked one:
  the policy above would have protected `media` and the view would have handed
  over the same rows anyway.
*/
alter view demo_shop.media_public set (security_invoker = on);
