# Store demo

Three online shops in one application: **Kora Label** (clothing), **Voltway**
(electronics) and **Daily Basket** (grocery). One codebase, three complete
businesses — separate names, colours, stock, delivery charges and phone numbers.

Built by Apka Saathi Private Limited as a sales demonstration. Every product,
price and person in it is invented, nothing ordered is dispatched, and no payment
is ever taken.

```
npm install
npm run dev          # http://localhost:3800
```

## Before it will run

**The four migrations in `supabase/migrations/` have to be applied**, and
`demo_shop` has to be in Supabase's exposed-schema list. Until both are done,
every page answers `Invalid schema`. The steps are in
`services/docs/estate-status.md` §5.

## What makes this different from the other five demos

The other five end at an enquiry: somebody asks, a panel answers. This one
transacts, because a shop that cannot take an order is a brochure.

- **The basket is a row in Postgres**, keyed by an httpOnly cookie, so it
  survives a reload and a second tab.
- **Stock really comes down.** The whole checkout is one database function
  holding the stock check, the coupon check and the price snapshot in a single
  transaction.
- **Money is paise, as an integer.** No total is ever stored — both are views.
- **Three roles**: staff work the orders, managers own the catalogue and the
  codes, a super admin decides which shops exist.

## The commands

| | |
|---|---|
| `npm run dev` | The site and the panel, on 3800 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | 48 unit tests, weighted towards money |
| `npm run test:e2e` | 52 browser tests, desktop and phone |
| `npm run gen:types` | Regenerate the types from the live schema |

## Where the rest is written

| | |
|---|---|
| How far along it is | [docs/PROGRESS.md](docs/PROGRESS.md) |
| The click-through list | [docs/testing.md](docs/testing.md) |
| The whole estate | `services/docs/estate-status.md` |
