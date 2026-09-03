-- ===========================================================================
-- Nobody walks into a demo. They are let in, for a while, and it is counted.
--
-- ---------------------------------------------------------------------------
-- **The owner's instruction.**
--
--   > demos project koi bhi open nhi kar sakta h jab tak me approved na karo ya
--   > usko link nhi diya ho and jitney time ke liye diya wo expire ho jana
--   > chiaye and wo open nhi hona chiaye … and jo expire ho gaya to show hona
--   > chiaye and open hua to kitni baar ye bhi … sab kuch detail chaiye ek ek
--
-- Three changes, and each answers one clause of that.
--
-- ---------------------------------------------------------------------------
-- **1. Every variant closes.**
--
-- 'visibility' has meant public by default since the schema was written, and
-- all eighteen still were: the demo we spent a month building could be read by
-- anybody who guessed /dental, including the competitor a prospect forwards it
-- to. The default flips, and the rows already made flip with it. Opening one to
-- the world afterwards is a deliberate edit by a super admin, which is what it
-- should always have been.
--
-- ---------------------------------------------------------------------------
-- **2. Every opening is a row, not just a number.**
--
-- 'view_count' answers "how many". It cannot answer the question actually asked
-- across a table — *when* did they look, was it once on the day we sent it or
-- four times the week they were deciding, did they open it again after the
-- meeting. That is a row per opening.
--
-- Coarse on purpose: a browser and where they came from, never an address and
-- nothing that follows a person between visits. This is a record of our own
-- sales link being used, not surveillance of somebody we are pitching to.
--
-- **What counts as an opening.** Not a page. A prospect who reads six pages
-- opened the link once, and a count that said six would be worthless for the
-- one conversation it exists for. So a visit is counted at most once every
-- thirty minutes — a return the next day is a second opening, a click through
-- to the menu is not.
--
-- ---------------------------------------------------------------------------
-- **3. A dead link says what happened — to whoever is holding it.**
--
-- The expired screen was deliberately vague about every failure, so that
-- somebody trying tokens learned nothing. That reasoning holds for a *guessed*
-- token and fails for a real one: the client we sent it to, whose link ran out
-- on Friday, is told nothing they can act on and concludes our work is broken.
--
-- 'link_state' answers only for a token that exists — which requires already
-- holding it, so there is nothing left to leak — and says nothing at all for
-- one that does not.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Close the doors.
-- ---------------------------------------------------------------------------

alter table demo_shop.variants
  alter column visibility set default 'link_only';

update demo_shop.variants
set visibility = 'link_only'
where visibility = 'public';

comment on column demo_shop.variants.visibility is
  'link_only by default since 2026-09-03: a demo is opened by invitation. public is a deliberate act, for a portfolio piece we want found.';

-- ---------------------------------------------------------------------------
-- 2. Every opening, one row.
-- ---------------------------------------------------------------------------

create table if not exists demo_shop.share_link_opens (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references demo_shop.share_links(id) on delete cascade,
  opened_at   timestamptz not null default now(),

  /* A browser and a referrer. Trimmed where they are written, because both
     arrive from the request and neither is trusted to be a sensible length. */
  user_agent  text,
  referrer    text
);

create index if not exists share_link_opens_link_idx
  on demo_shop.share_link_opens (link_id, opened_at desc);

comment on table demo_shop.share_link_opens is
  'One row per opening of a share link. Coarse by design: a browser and a referrer, never an address or anything that identifies a person.';

alter table demo_shop.share_link_opens enable row level security;

/* The same rule as the links themselves: this is the record of who we are
   pitching to, and it belongs with whoever is accountable for the estate. */
drop policy if exists share_link_opens_admin on demo_shop.share_link_opens;
create policy share_link_opens_admin on demo_shop.share_link_opens
  for select using (demo_shop.is_super_admin());

grant select on demo_shop.share_link_opens to authenticated;
grant all on demo_shop.share_link_opens to service_role;

/*
  The old one-argument version is dropped rather than left beside this.

  'create or replace' with new parameters makes an *overload*, not a
  replacement, and PostgREST then cannot decide which of the two a call by name
  means — an error at the door of every demo, for the one function that must
  never fail. This estate has learned that three times; it is written down here
  so it is learned once more.
*/
drop function if exists demo_shop.note_share_visit(text);

/**
 * Count an opening, at most once every thirty minutes.
 *
 * Called when a link is redeemed and on every page that link opens. The
 * throttle is what makes the number mean "times they came to look" rather than
 * "pages they read" — see the note at the top of this file.
 *
 * 'security definer' because share_links is readable by nobody: the token is
 * the whole secret and the labels beside it are a sales list. This writes one
 * row about one token and returns nothing.
 */
create or replace function demo_shop.note_share_visit(
  p_token text,
  p_user_agent text default null,
  p_referrer text default null
)
returns void
language plpgsql
security definer
set search_path = demo_shop, public
as $fn$
declare
  link record;
begin
  select l.id, l.last_seen_at into link
  from demo_shop.share_links l
  where l.token = p_token
    and l.revoked_at is null
    and l.expires_at > now()
    and (l.max_views is null or l.view_count < l.max_views);

  if not found then
    /* A refused attempt is not an opening. Counting it would make "opened four
       times" mean "four people tried, some got in" — a different fact, and the
       wrong one to take into a conversation with a client. */
    return;
  end if;

  if link.last_seen_at is not null and link.last_seen_at > now() - interval '30 minutes' then
    return;
  end if;

  update demo_shop.share_links
  set view_count = view_count + 1, last_seen_at = now()
  where id = link.id;

  insert into demo_shop.share_link_opens (link_id, user_agent, referrer)
  values (link.id, left(p_user_agent, 400), left(p_referrer, 400));
end;
$fn$;

grant execute on function demo_shop.note_share_visit(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Why a link no longer works.
-- ---------------------------------------------------------------------------

/**
 * What happened to this token — for the screen shown to whoever holds it.
 *
 *   live     — it works; the caller asked the wrong question.
 *   expired  — the date passed. expires_at comes back so the screen can say
 *              which date, which is the difference between a client asking for
 *              a new link and a client deciding we are unreliable.
 *   revoked  — closed by hand.
 *   used_up  — the view limit was reached.
 *   unknown  — no such token. Nothing else is returned, ever.
 *
 * **Why this may safely say more than can_view does.** can_view is asked about
 * an address anybody can type. This is asked about a token, and knowing a token
 * requires having been sent it — so there is nothing new to learn here by
 * guessing, and an honest visitor gets an answer they can act on.
 */
create or replace function demo_shop.link_state(p_token text)
returns table (state text, expires_at timestamptz, revoked_at timestamptz, business text)
language plpgsql
stable
security definer
set search_path = demo_shop, public
as $fn$
declare
  link record;
begin
  select l.expires_at, l.revoked_at, l.view_count, l.max_views, v.business_name
  into link
  from demo_shop.share_links l
  join demo_shop.variants v on v.id = l.variant_id
  where l.token = p_token;

  if not found then
    state := 'unknown';
    return next;
    return;
  end if;

  business := link.business_name;
  expires_at := link.expires_at;
  revoked_at := link.revoked_at;

  state := case
    when link.revoked_at is not null then 'revoked'
    when link.expires_at <= now() then 'expired'
    when link.max_views is not null and link.view_count >= link.max_views then 'used_up'
    else 'live'
  end;

  return next;
end;
$fn$;

grant execute on function demo_shop.link_state(text) to anon, authenticated;

/** Every opening of one link, newest first. A super admin's question. */
create or replace function demo_shop.share_link_opens_for(p_link_id uuid)
returns table (opened_at timestamptz, user_agent text, referrer text)
language sql
stable
security definer
set search_path = demo_shop, public
as $fn$
  select o.opened_at, o.user_agent, o.referrer
  from demo_shop.share_link_opens o
  where demo_shop.is_super_admin() and o.link_id = p_link_id
  order by o.opened_at desc;
$fn$;

grant execute on function demo_shop.share_link_opens_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. The bug that closing the doors uncovered.
-- ---------------------------------------------------------------------------

/*
  `can_view` raised an error for every visitor arriving without a link.

  It held both the variant and the link in `record` variables. A record that is
  never assigned has no shape at all, so reading a field of one is not null —
  it is:

      record "link" is not assigned yet
      The tuple structure of a not-yet-assigned record is indeterminate.

  The `select ... into link` only runs when a token was presented, so a visitor
  with no token reached `if link.id is null` with nothing assigned and the whole
  request failed. Not the expired screen: a 500.

  It never fired before today because every variant was `public`, and the public
  branch returns before that line. Closing the doors above makes the no-token
  path the ordinary one — the first stranger to open the demo would have met a
  broken site — so the fix belongs in the same migration as the change that
  exposes it, and not one deploy later.

  The repair is to hold plain variables instead of records. A scalar that has
  not been assigned is null, which is what every line below already assumed.
*/
create or replace function demo_shop.can_view(p_slug text, p_token text default null)
returns table (verdict text, allowed_slug text)
language plpgsql
stable
security definer
set search_path = demo_shop, public
as $fn$
declare
  found_id uuid;
  found_slug text;
  found_visibility text;
  link_variant uuid;
  link_slug text;
begin
  select v.id, v.slug, v.visibility
    into found_id, found_slug, found_visibility
  from demo_shop.variants v
  where v.slug = p_slug and v.is_active;

  /* A live link, whatever the variant asked for. Looked up first because it
     also answers the "sent the wrong link" case below. */
  if p_token is not null then
    select l.variant_id, vv.slug
      into link_variant, link_slug
    from demo_shop.share_links l
    join demo_shop.variants vv on vv.id = l.variant_id
    where l.token = p_token
      and l.revoked_at is null
      and l.expires_at > now()
      and vv.is_active
      and (l.max_views is null or l.view_count < l.max_views);
  end if;

  if found_id is null then
    /* No such variant. If they hold a live link, send them to what it opens
       rather than to a dead end — a mistyped path should not look like a broken
       demo. */
    verdict := case when link_variant is null then 'unknown' else 'wrong_link' end;
    allowed_slug := link_slug;
    return next;
    return;
  end if;

  if found_visibility = 'public' then
    verdict := 'ok';
    allowed_slug := found_slug;
    return next;
    return;
  end if;

  -- Link-only from here down, which is now every variant by default.
  if link_variant is null then
    verdict := 'needs_link';
    allowed_slug := null;
    return next;
    return;
  end if;

  if link_variant = found_id then
    verdict := 'ok';
    allowed_slug := found_slug;
  else
    verdict := 'wrong_link';
    allowed_slug := link_slug;
  end if;

  return next;
end;
$fn$;

grant execute on function demo_shop.can_view(text, text) to anon, authenticated;
