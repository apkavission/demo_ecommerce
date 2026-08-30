# Store demo — the click-through list

Run it once, at the end, on something finished. A pass against a half-built shop
finds the half that is missing rather than the half that is wrong.

**Two things before anything else, and neither is optional:**

1. **The four migrations have to be run** — see
   `services/docs/estate-status.md` §5. Until they are, every page answers
   `Invalid schema`, and that is not a bug in this application.
2. **Your account needs the Store demo ticked** under **Users → Applications**
   in the company website admin. Until then the panel refuses you, which is
   correct and looks exactly like a broken screen.

```
cd demo-ecommerce && npm run dev      # http://localhost:3800
```

## As a visitor — `http://localhost:3800`

- [ ] It lands on **Kora Label** with no shop in the URL.
- [ ] The switcher in the top bar moves between all three: Kora Label, Voltway,
      Daily Basket. The name, the colours, the stock, the delivery charge and
      the phone number all change.
- [ ] Dark mode, by the moon button. Each shop has **its own** dark palette —
      the clothing shop goes warm, the electronics shop goes cold. Cards still
      sit above the page.
- [ ] Light mode: the page is tinted and the cards are white. If you cannot see
      where a card ends, that is the flat-light bug and it is worth reporting.
- [ ] Every page in the menu opens: shop, our story, reviews, questions,
      contact.
- [ ] Filter by a collection. The address changes to `?in=shirts`, which means
      you can send it to somebody.
- [ ] Open a product. The price, the sizes and the stock are above the fold; the
      description is below it.
- [ ] At 390px wide, nothing scrolls sideways.

## The basket — this is the part worth watching

- [ ] Add a shirt in size M. The number on the Basket button goes up.
- [ ] Add the same shirt in size L. **Two lines**, not one.
- [ ] Add the same shirt in size M again. **One line, quantity two.**
- [ ] **Reload the page.** Everything is still there. Close the tab, open it
      again — still there. That is the whole difference between a real basket
      and a picture of one.
- [ ] The total includes delivery, and says how much more to spend for it to be
      free. Not on the last screen — here.
- [ ] Type `FIRST10` in the discount box. Ten per cent comes off.
- [ ] Type `LINEN500` on a basket under ₹3,000. It refuses, and tells you how
      much more to spend rather than saying "invalid code".
- [ ] Clear the box and apply. The code comes off.
- [ ] Take the quantity down to zero on a line. It goes.

## The checkout

- [ ] With an empty basket, go to `/fashion/checkout` directly. It sends you to
      the basket rather than showing a form that cannot succeed.
- [ ] Fill it in with a two-digit PIN code. It refuses, under that field.
- [ ] **Nothing anywhere asks for a card number.** Cash on delivery is the only
      option, and it says so.
- [ ] Place the order. You get an order number that can be read aloud —
      `FAS-260902-4417`, not a uuid.
- [ ] Open the order number's page. It shows what it cost and does **not** show
      your address back to you.
- [ ] Go back to the shop. The basket is empty — the row is deleted, not
      emptied, so it does not show up as an abandoned basket that never was.

## Stock

- [ ] Note the stock on a product with only a few left. Order some.
- [ ] Reload the product page. The number has come down.
- [ ] Cotton cardigan and Bananas are seeded with zero. Both show as **sold
      out**, and cannot be added.
- [ ] The dashboard's *Running out* list shows anything at three or fewer.

## As the panel — `http://localhost:3800/admin`

- [ ] Signing in with an account that does **not** have the Store demo ticked is
      refused, and says why.
- [ ] Your order is on *Today*, and in *Orders* with its lines and the address.
- [ ] Move it: placed → packed → shipped → delivered. The dashboard follows.
- [ ] Change payment from pending to paid.
- [ ] **Catalogue** → change a price, save, reload the public page. Already
      different.
- [ ] Change a stock count from the small box in the row, without opening the
      form. That is the edit somebody makes forty times a day.
- [ ] Set a product to *Draft* — gone from the shop, still in the panel.
- [ ] **Codes** → make one for 20% over ₹1,000. Try it on a smaller basket and
      watch it refuse with the right sentence.

## The three roles — the part that is only in this demo

- [ ] Sign in as **owner or super admin**: the whole panel, including *Shops*
      and *Share links*.
- [ ] Sign in as somebody with the **admin** role and Store access: Today,
      Orders, Catalogue, Codes, Content. No *Shops*, no *Share links* — absent,
      not greyed out.
- [ ] Sign in as an **editor** with Store access: Today and Orders only. They
      can move an order along and cannot reach a price.
- [ ] As that editor, the money figure on the dashboard is **absent** rather
      than blurred. A hidden number with a padlock on it is an invitation to ask
      what it is.

## Share links — super admin only

- [ ] **Share links** → make one for Daily Basket, lasting three days, labelled
      with a name you would recognise a week later.
- [ ] Open it in a private window. It lands on the grocery shop.
- [ ] From that window, try `/fashion` — it sends you back.
- [ ] Try `/admin` from that window — the same.
- [ ] **Shops** → set Daily Basket to **Link only**. In a third window with no
      link, its address says the link is no longer open.
- [ ] Back in **Share links**, press **Close it**. Refresh the private window —
      dead immediately, not after a cache expires.

## Copying a shop — super admin only

- [ ] **Shops** → *Copy this one* on Kora Label. Give it a name and an address.
- [ ] The copy appears, **switched off and link-only**, with all eighteen
      products and every discount code switched off.
- [ ] Its orders list is empty. The original's orders stayed where they were.

## What is checked without a browser

```
cd demo-ecommerce && npm run typecheck && npm run lint && npm test
cd demo-ecommerce && npx playwright test    # 52, two widths
cd services       && npm run check:demos    # anonymous visitor: content yes, orders no
cd services       && npm run check:queries  # every panel query, run against this schema
```

**And one that has to be run the day the migrations are:**

```
cd demo-ecommerce && npm run gen:types
```

The types in this project are hand-written from the migration, because a
generator cannot read a schema that does not exist yet. Until that command has
been run, the type safety here is a claim about the SQL rather than about the
database — which is a real difference, and the reason this line is in the list
rather than in a comment.
