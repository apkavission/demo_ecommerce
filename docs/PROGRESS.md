# Store demo — how far along this is

**Counted from the table below, never typed by hand.** The count is the point:
a percentage somebody types drifts, and once one has drifted nobody believes any
of them.

| | |
|---|---|
| **5 of 6 phases done** | **83%** |
| Left | Phase 1 — **the migrations have not been run** |

**The one thing standing between this and finished is four SQL files.** They are
written, and every one of them has been run against the live database inside a
transaction and rolled back, so they are known to execute cleanly — but they
have not been committed, because applying schema changes is the owner's, in the
Supabase editor, as it is everywhere in this estate.

Until they are, this application starts and answers `Invalid schema` to every
query. That is not a bug in it.

**What the number does not say**, and this matters more here than in the other
five: **not one line of this has been run against a real database.** The other
demos were built against their schemas and checked afterwards. This one was
built from the migration outwards, so what is proven is that it compiles, that
its pure logic is correct, and that its SQL parses and executes. Whether the
screens actually render their data is unknown until the migrations are run.

The automated half is **48 unit tests**, weighted towards money — the one thing
in this demo that has a right answer — plus **52 browser tests** at two widths,
which cannot run until the schema exists.

## The phases

| | Phase | State | What it is |
|---|---|---|---|
| 0 | Foundation | done | Next 16 on port 3800, its own Supabase client, its own hand-written types. Nothing imported from another project. |
| 1 | Database | **written, not run** | Four migrations: the schema, the security, three shops of stock, and the clone function. Dry-run clean against the live database. |
| 2 | The public site | done | Every page under `/[variant]` — shop, product, basket, checkout, confirmation, people, reviews, questions, contact. Separate light and dark palettes per shop. |
| 3 | The panel | done | Three tiers, not two: staff work the orders, managers own the catalogue and the codes, a super admin decides which shops exist. |
| 4 | Share links | done | A token with an expiry, a view cap and a revoke button, enforced on every request. |
| 5 | Browser tests | done | 52 tests at desktop and phone widths, including the basket surviving a reload and the checkout refusing a six-digit PIN that is not one. |

## What this demo is

Three shops in one application: **Kora Label** (clothing), **Voltway**
(electronics) and **Daily Basket** (grocery). Switching between them changes the
name, the colours, the stock, the delivery charge and the phone number — the
whole shop, not a badge in the corner.

- **Runs on** `http://localhost:3800` · panel at `/admin`
- **Schema** `demo_shop` · 4 migrations
- **Content** 18 products across 9 collections, with sizes, colours and stock
- **Its enquiry is an order**, and it asks for an address, a PIN code, and
  nothing whatever about a card

## What makes this one different from the other five

**It transacts.** The other five end at an enquiry: somebody asks, the panel
answers. A shop cannot stop there, and a demo where the basket is a picture is a
brochure.

- **The basket is a row in Postgres**, keyed by a cookie, so it survives a
  reload, a second tab, and a phone going to sleep on the checkout page — the
  three things that actually happen to a shopping basket and none of which a
  React state object survives.
- **Stock really comes down**, and the whole checkout happens inside one
  database function where the stock check, the coupon check and the price
  snapshot cannot half-happen. `for update` on the product rows is the point: a
  second checkout for the last item waits rather than both succeeding.
- **Money is paise, as an integer, and no total is ever stored.** Both totals
  are views, so there is nothing to go stale and no second copy of the truth to
  disagree with the first. The one deliberate exception is `order_items.unit_price`,
  copied at the moment of ordering — that is not a cache, it is what the
  customer agreed to pay.
- **A coupon that fails says why.** Expired, switched off, used up, or the
  basket being too small are four different sentences. "Invalid code" when the
  real answer is "spend ₹200 more" loses a sale for no reason at all.
- **Three roles, where the others have two.** A shop has a job that is neither
  owner nor administrator: the person who packs orders. They move an order
  along and cannot change a price — not because they are not trusted, but
  because a pricing mistake made while packing is one nobody is looking for.

## What is deliberately not here

**Photographs.** There is a `media` table and nothing in it. Every page stands on
type, colour and layout. A stock photograph of a smiling stranger would make this
look like every other template.

**Payment.** No card details are asked for anywhere, and a browser test asserts
it. Cash on delivery is the majority of Indian ecommerce anyway, and a demo shop
collecting card numbers would be a real problem regardless of what it did with
them.

**Customer accounts.** A basket belongs to a browser. Sign-up screens would be a
week of work to demonstrate something nobody asks to see.

**`npm run gen:types`, and therefore `conformance.ts`.** The generator reads a
live schema, and there is not one yet. The types here are hand-written from the
migration — which is what the company website and the internal panel both do,
but it means the type safety is a claim about the migration rather than about
the database. **Run the generator the moment the migrations are applied.**

**Anything committed or pushed.** That stays the owner's.

## Where the rest is written

| | |
|---|---|
| What only the owner can do | `services/docs/estate-status.md` |
| The click-through list | [testing.md](testing.md) |
| Which SQL has actually run | `cd services && npm run verify:estate` |
