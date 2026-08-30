-- ===========================================================================
-- Three shops, with stock on the shelves.
--
-- **Everything here is invented, and reads as invented.** No real shop’s name,
-- no real person, no photograph of anybody. A testimonial is labelled *Sample
-- review* in the author field rather than only in a comment nobody renders,
-- because a demo passed off as a real customer’s words is a lie with a
-- signature on it.
--
-- ---------------------------------------------------------------------------
-- **Each shop gets its own two palettes, chosen rather than computed.**
--
-- The rule both must satisfy: the page is a step away from the things sitting
-- on it. In light the page is tinted and the cards are white; in dark the page
-- is near-black and the cards are lifted above it. Derive one mode from the
-- other and you get the flat look this estate spent a fortnight not being able
-- to name.
--
-- Fashion is warm and quiet, electronics is cold and high-contrast, grocery is
-- green and cheap-looking on purpose — a grocery site that looks expensive is
-- a grocery site nobody trusts on price.
--
-- ---------------------------------------------------------------------------
-- **Prices are in paise.** ₹1,299 is 129900. Written out in full rather than
-- multiplied, so a reader can check one against the site without arithmetic.
-- ===========================================================================

insert into demo_shop.variants (
  slug, name, industry_label, business_name, tagline, description,
  theme, contact, shipping_paise, free_shipping_above,
  is_default, sort_order
) values
(
  'fashion', 'Kora Label', 'Clothing', 'Kora Label',
  'Everyday clothes, made to last a decade',
  'Twelve pieces, cut from mill-finished cotton and linen, made in a single unit in Tiruppur. Nothing here changes with the season, which is the whole idea.',
  jsonb_build_object(
    'light', jsonb_build_object(
      'accent', '#8a5a3b', 'accentFg', '#ffffff', 'accentSoft', '#f4e9e0',
      'bg', '#f6f2ed', 'surface', '#ffffff', 'text', '#241c16', 'muted', '#6b5c50'),
    'dark', jsonb_build_object(
      'accent', '#d9a877', 'accentFg', '#241708', 'accentSoft', '#2c211a',
      'bg', '#14100d', 'surface', '#1f1915', 'text', '#f2ebe4', 'muted', '#b3a396'),
    'headingFont', 'Fraunces', 'bodyFont', 'Inter', 'radius', 'md'),
  jsonb_build_object(
    'phone', '+91 98765 40001', 'email', 'hello@koralabel.example',
    'address', '14 Cotton Street, Tiruppur', 'hours', 'Mon–Sat, 10am–7pm'),
  9900, 199900,
  true, 10
),
(
  'electronics', 'Voltway', 'Consumer electronics', 'Voltway',
  'Gadgets, with the specification sheet in front',
  'Audio, charging and desk accessories chosen on measurement rather than on marketing. Every listing says what it actually does before it says what it feels like.',
  jsonb_build_object(
    'light', jsonb_build_object(
      'accent', '#1d4ed8', 'accentFg', '#ffffff', 'accentSoft', '#e2e9fb',
      'bg', '#eef1f6', 'surface', '#ffffff', 'text', '#0d1424', 'muted', '#4c5670'),
    'dark', jsonb_build_object(
      'accent', '#6aa8ff', 'accentFg', '#03102b', 'accentSoft', '#132038',
      'bg', '#070a11', 'surface', '#111725', 'text', '#e8eefb', 'muted', '#93a1bd'),
    'headingFont', 'Space Grotesk', 'bodyFont', 'Inter', 'radius', 'lg'),
  jsonb_build_object(
    'phone', '+91 98765 40002', 'email', 'support@voltway.example',
    'address', '2nd Floor, Nehru Place, New Delhi', 'hours', 'Every day, 9am–9pm'),
  4900, 99900,
  false, 20
),
(
  'grocery', 'Daily Basket', 'Grocery', 'Daily Basket',
  'The week''s shopping, delivered before dinner',
  'Staples, fresh produce and household basics from four suppliers we name on every listing. Order by four, it arrives the same evening.',
  jsonb_build_object(
    'light', jsonb_build_object(
      'accent', '#177245', 'accentFg', '#ffffff', 'accentSoft', '#dcf0e4',
      'bg', '#eef4ef', 'surface', '#ffffff', 'text', '#0f1a13', 'muted', '#4a5b50'),
    'dark', jsonb_build_object(
      'accent', '#4ade80', 'accentFg', '#052012', 'accentSoft', '#10251a',
      'bg', '#070c09', 'surface', '#111a14', 'text', '#e7f3eb', 'muted', '#96ab9d'),
    'headingFont', 'Inter', 'bodyFont', 'Inter', 'radius', 'xl'),
  jsonb_build_object(
    'phone', '+91 98765 40003', 'email', 'orders@dailybasket.example',
    'address', 'Warehouse 6, Whitefield, Bengaluru', 'hours', 'Orders till 4pm, delivered by 9pm'),
  2900, 49900,
  false, 30
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Navigation. Each shop names its own catalogue page.
-- ---------------------------------------------------------------------------

insert into demo_shop.nav_items (variant_id, label, href, sort_order)
select v.id, n.label, n.href, n.sort_order
from demo_shop.variants v
join (values
  ('fashion', 'Shop', '/shop', 10),
  ('fashion', 'Our story', '/people', 20),
  ('fashion', 'Reviews', '/reviews', 30),
  ('fashion', 'Questions', '/questions', 40),
  ('fashion', 'Contact', '/contact', 50),

  ('electronics', 'Products', '/shop', 10),
  ('electronics', 'The team', '/people', 20),
  ('electronics', 'Reviews', '/reviews', 30),
  ('electronics', 'Questions', '/questions', 40),
  ('electronics', 'Contact', '/contact', 50),

  ('grocery', 'Shop', '/shop', 10),
  ('grocery', 'Who packs it', '/people', 20),
  ('grocery', 'Reviews', '/reviews', 30),
  ('grocery', 'Questions', '/questions', 40),
  ('grocery', 'Contact', '/contact', 50)
) as n(variant, label, href, sort_order)
  on n.variant = v.slug
on conflict (variant_id, label) do nothing;

-- ---------------------------------------------------------------------------
-- Collections.
-- ---------------------------------------------------------------------------

insert into demo_shop.collections (variant_id, slug, name, summary, icon, sort_order)
select v.id, c.slug, c.name, c.summary, c.icon, c.sort_order
from demo_shop.variants v
join (values
  ('fashion', 'shirts', 'Shirts', 'Cotton and linen, cut straight.', 'shirt', 10),
  ('fashion', 'trousers', 'Trousers', 'Two fits, four colours, no season.', 'ruler', 20),
  ('fashion', 'knitwear', 'Knitwear', 'Merino and cotton, for eleven months of the year.', 'layers', 30),

  ('electronics', 'audio', 'Audio', 'Headphones and speakers, measured before listed.', 'headphones', 10),
  ('electronics', 'power', 'Power', 'Chargers and banks that state their real output.', 'battery-charging', 20),
  ('electronics', 'desk', 'Desk', 'Stands, hubs and lamps for a working surface.', 'monitor', 30),

  ('grocery', 'staples', 'Staples', 'Rice, flour, pulses and oil.', 'wheat', 10),
  ('grocery', 'fresh', 'Fresh', 'Picked the morning it is delivered.', 'carrot', 20),
  ('grocery', 'household', 'Household', 'Cleaning and kitchen basics.', 'spray-can', 30)
) as c(variant, slug, name, summary, icon, sort_order)
  on c.variant = v.slug
on conflict (variant_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- The stock.
-- ---------------------------------------------------------------------------

insert into demo_shop.products (
  variant_id, collection_id, slug, name, summary, description,
  sku, price_paise, compare_at_paise, stock, weight_grams,
  is_featured, meta_label, sort_order
)
select
  v.id, c.id, p.slug, p.name, p.summary, p.description,
  p.sku, p.price_paise, p.compare_at_paise, p.stock, p.weight_grams,
  p.is_featured, p.meta_label, p.sort_order
from demo_shop.variants v
join (values
  -- Kora Label ----------------------------------------------------------------
  ('fashion', 'shirts', 'oxford-shirt', 'Oxford shirt',
   'Mill-finished cotton, unbleached.',
   'A 140gsm oxford woven in Tiruppur, cut with a straight body and a collar that holds its shape without fusing. It softens for about ten washes and then stops changing.',
   'KL-SH-01', 249900, 299900, 24, 320, true, 'Cotton · 140gsm', 10),
  ('fashion', 'shirts', 'linen-shirt', 'Linen shirt',
   'For the four months that need it.',
   'European flax, washed twice before cutting so it arrives already soft. It creases, which is what linen does, and the alternative is a blend that does not breathe.',
   'KL-SH-02', 289900, null, 12, 280, true, 'Linen · 165gsm', 20),
  ('fashion', 'trousers', 'work-trouser', 'Work trouser',
   'Straight leg, no stretch.',
   'A 280gsm cotton twill with a proper waistband and pockets deep enough for a phone. No elastane, so it keeps its shape rather than relaxing into a different pair of trousers by March.',
   'KL-TR-01', 329900, null, 18, 520, false, 'Cotton twill', 30),
  ('fashion', 'trousers', 'drawstring-trouser', 'Drawstring trouser',
   'The one you will actually wear.',
   'Same twill, softer finish, with a flat drawstring rather than elastic. Cut wide at the thigh and tapered below the knee.',
   'KL-TR-02', 279900, 319900, 9, 470, false, 'Cotton twill', 40),
  ('fashion', 'knitwear', 'merino-crew', 'Merino crew',
   'Fine gauge, no itch.',
   '19.5 micron merino at a 14-gauge knit, which is thin enough under a jacket and warm enough alone. Machine washable on cold, which most merino at this price is not.',
   'KL-KN-01', 449900, null, 6, 340, true, 'Merino · 19.5 micron', 50),
  ('fashion', 'knitwear', 'cotton-cardigan', 'Cotton cardigan',
   'For a room with aggressive air conditioning.',
   'A mid-weight cotton knit with real horn-effect buttons and a shape that does not stretch at the pockets, because the pockets are set into a seam rather than patched on.',
   'KL-KN-02', 389900, null, 0, 420, false, 'Cotton · 12 gauge', 60),

  -- Voltway --------------------------------------------------------------------
  ('electronics', 'audio', 'over-ear-anc', 'Over-ear headphones, ANC',
   '32 hours with noise cancelling on.',
   '40mm drivers, hybrid active noise cancelling measured at 28dB average across 100–1000Hz, and a wired mode that works with the battery flat. Replaceable earpads, which is why this one is listed and four others are not.',
   'VW-AU-01', 899900, 1099900, 15, 290, true, '32h · ANC 28dB', 10),
  ('electronics', 'audio', 'desk-speaker', 'Desk speaker pair',
   'Near-field, powered, no subwoofer needed.',
   'Three-inch woofers in a sealed cabinet, usable from 60Hz without a subwoofer at desk distance. Volume is a knob on the front, not a gesture on the top.',
   'VW-AU-02', 1249900, null, 4, 3200, false, '2 × 3in · 60Hz–20kHz', 20),
  ('electronics', 'power', 'gan-charger-65', 'GaN charger, 65W',
   'Two ports, and honest about what happens when both are used.',
   '65W from one USB-C port, or 45W and 18W split across two. The second number is on the box, which is the whole reason this one is stocked — most are not.',
   'VW-PW-01', 249900, 299900, 40, 120, true, '65W · GaN · 2 ports', 30),
  ('electronics', 'power', 'power-bank-20k', 'Power bank, 20,000mAh',
   'Airline legal, and it says so.',
   '74Wh, under the 100Wh cabin limit, with 30W output and a display showing actual percentage rather than four lights. Charges itself in 90 minutes.',
   'VW-PW-02', 349900, null, 22, 380, false, '74Wh · 30W out', 40),
  ('electronics', 'desk', 'monitor-stand', 'Monitor stand',
   'Steel, not aluminium-coloured plastic.',
   'A 4mm steel plate on two uprights, rated to 20kg, with a gap underneath a keyboard actually fits into. It does not adjust, because the adjustable ones at this price wobble.',
   'VW-DK-01', 449900, null, 11, 4100, false, 'Steel · 20kg', 50),
  ('electronics', 'desk', 'usb-hub-7', 'USB-C hub, 7-in-1',
   'With the throughput each port really gets.',
   'HDMI 4K60, two USB-A at 5Gbps, one USB-C data, 100W passthrough charging, SD and microSD. The chipset is named in the listing so it can be looked up.',
   'VW-DK-02', 379900, 429900, 0, 95, false, '4K60 · 100W PD', 60),

  -- Daily Basket ---------------------------------------------------------------
  ('grocery', 'staples', 'sona-masuri-5kg', 'Sona Masuri rice, 5kg',
   'Aged twelve months, single mill.',
   'From one mill in Raichur, aged a year before packing, which is why it cooks separate rather than sticky. The harvest year is printed on the bag.',
   'DB-ST-01', 42500, null, 60, 5000, true, '5kg · aged 12 months', 10),
  ('grocery', 'staples', 'toor-dal-1kg', 'Toor dal, 1kg',
   'Unpolished, which is why it looks duller.',
   'No oil polish and no water polish, so it looks less shiny than the branded bag next to it and cooks in the same time. From a Gulbarga co-operative.',
   'DB-ST-02', 18500, 21000, 85, 1000, false, '1kg · unpolished', 20),
  ('grocery', 'staples', 'groundnut-oil-1l', 'Groundnut oil, 1L',
   'Wood-pressed, in glass.',
   'Cold-pressed in a wooden ghani in Erode and bottled in glass rather than PET. It clouds below 18 degrees, which is what unrefined oil does and is not a fault.',
   'DB-ST-03', 34500, null, 28, 1100, true, '1L · wood-pressed', 30),
  ('grocery', 'fresh', 'tomatoes-1kg', 'Tomatoes, 1kg',
   'Picked this morning, in Kolar.',
   'Hybrid table tomatoes, firm rather than soft, sorted by hand. Delivered the same day they are picked, which is the only claim on this page that matters.',
   'DB-FR-01', 6500, null, 40, 1000, false, '1kg · Kolar', 40),
  ('grocery', 'fresh', 'bananas-dozen', 'Bananas, dozen',
   'Yelakki, ripened without carbide.',
   'Small Yelakki bananas ripened in a chamber with ethylene rather than with calcium carbide. Sweeter and about three days shorter-lived, which is the trade.',
   'DB-FR-02', 8900, null, 0, 1400, false, 'Dozen · Yelakki', 50),
  ('grocery', 'household', 'dish-bar-3', 'Dish bar, pack of three',
   'The one that lasts a month.',
   'A 300g bar each, no added colour, in paper rather than shrink wrap. Three of them get an ordinary kitchen through a month.',
   'DB-HH-01', 15900, 18900, 52, 950, false, '3 × 300g', 60)
) as p(variant, collection, slug, name, summary, description, sku,
       price_paise, compare_at_paise, stock, weight_grams, is_featured, meta_label, sort_order)
  on p.variant = v.slug
join demo_shop.collections c on c.variant_id = v.id and c.slug = p.collection
on conflict (variant_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Sizes and colours.
--
-- Only where a shop really has them: rice does not come in a large. A demo that
-- puts a size picker on a kilo of tomatoes is a demo somebody stops believing.
-- ---------------------------------------------------------------------------

insert into demo_shop.product_options (product_id, label, value, price_delta_paise, stock, sort_order)
select p.id, o.label, o.value, o.delta, o.stock, o.sort_order
from demo_shop.variants v
join demo_shop.products p on p.variant_id = v.id
join (values
  ('fashion', 'oxford-shirt', 'Size', 'S', 0, 4, 10),
  ('fashion', 'oxford-shirt', 'Size', 'M', 0, 9, 20),
  ('fashion', 'oxford-shirt', 'Size', 'L', 0, 8, 30),
  ('fashion', 'oxford-shirt', 'Size', 'XL', 10000, 3, 40),

  ('fashion', 'linen-shirt', 'Size', 'M', 0, 5, 10),
  ('fashion', 'linen-shirt', 'Size', 'L', 0, 6, 20),
  ('fashion', 'linen-shirt', 'Size', 'XL', 10000, 1, 30),

  ('fashion', 'work-trouser', 'Waist', '30', 0, 5, 10),
  ('fashion', 'work-trouser', 'Waist', '32', 0, 7, 20),
  ('fashion', 'work-trouser', 'Waist', '34', 0, 6, 30),

  ('fashion', 'merino-crew', 'Size', 'M', 0, 3, 10),
  ('fashion', 'merino-crew', 'Size', 'L', 0, 3, 20),

  ('electronics', 'over-ear-anc', 'Colour', 'Graphite', 0, 9, 10),
  ('electronics', 'over-ear-anc', 'Colour', 'Sand', 0, 6, 20),

  ('electronics', 'gan-charger-65', 'Plug', 'India (Type D)', 0, 28, 10),
  ('electronics', 'gan-charger-65', 'Plug', 'Universal', 20000, 12, 20),

  ('grocery', 'sona-masuri-5kg', 'Pack', '5kg', 0, 60, 10),
  ('grocery', 'sona-masuri-5kg', 'Pack', '10kg', 40000, 18, 20)
) as o(variant, product, label, value, delta, stock, sort_order)
  on o.variant = v.slug and o.product = p.slug
on conflict (product_id, label, value) do nothing;

-- ---------------------------------------------------------------------------
-- Discount codes.
-- ---------------------------------------------------------------------------

insert into demo_shop.coupons (variant_id, code, description, kind, amount, min_order_paise, max_uses, ends_at)
select v.id, c.code, c.description, c.kind::demo_shop.discount_kind, c.amount,
       c.min_order, c.max_uses, c.ends_at
from demo_shop.variants v
join (values
  ('fashion', 'FIRST10', '10% off a first order.', 'percent', 10, 0, null::integer, null::timestamptz),
  ('fashion', 'LINEN500', '₹500 off, on ₹3,000 and above.', 'amount', 50000, 300000, 100, now() + interval '60 days'),

  ('electronics', 'VOLT15', '15% off, on ₹5,000 and above.', 'percent', 15, 500000, null, now() + interval '30 days'),
  ('electronics', 'DESKSET', '₹750 off a desk order.', 'amount', 75000, 400000, 50, null),

  ('grocery', 'BASKET50', '₹50 off your first basket.', 'amount', 5000, 50000, null, null),
  ('grocery', 'WEEKLY5', '5% off, every order.', 'percent', 5, 0, null, null)
) as c(variant, code, description, kind, amount, min_order, max_uses, ends_at)
  on c.variant = v.slug
on conflict (variant_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- Who is behind each shop.
-- ---------------------------------------------------------------------------

insert into demo_shop.team (variant_id, slug, full_name, role_label, qualification, bio, years_experience, sort_order)
select v.id, t.slug, t.full_name, t.role_label, t.qualification, t.bio, t.years, t.sort_order
from demo_shop.variants v
join (values
  ('fashion', 'meera-iyer', 'Meera Iyer', 'Founder', 'NIFT, twelve years in production',
   'Spent eight years buying for somebody else before deciding twelve pieces was enough. Approves every cut herself and has rejected more than she has kept.', 12, 10),
  ('fashion', 'rahul-nair', 'Rahul Nair', 'Production', 'Textile engineering',
   'Sits with the Tiruppur unit two days a week. Knows which machine each seam came off, which is why the returns are about fit and never about stitching.', 9, 20),
  ('fashion', 'anita-das', 'Anita Das', 'Customer care', null,
   'Answers the phone herself and will tell you to size up when the measurements say so, even when it means a return.', 5, 30),

  ('electronics', 'karthik-menon', 'Karthik Menon', 'Founder', 'Electronics engineering',
   'Measures everything before listing it, and publishes the numbers that do not flatter. About a third of what he tests never reaches the site.', 11, 10),
  ('electronics', 'sana-qureshi', 'Sana Qureshi', 'Service', 'Six years in repair',
   'Runs the repair bench. If a product cannot be opened without breaking it, she argues against stocking it, and usually wins.', 6, 20),
  ('electronics', 'dev-patel', 'Dev Patel', 'Support', null,
   'Replies within a working day and will talk you out of an upgrade you do not need. That is not a policy; it is just how he answers.', 4, 30),

  ('grocery', 'lakshmi-rao', 'Lakshmi Rao', 'Founder', null,
   'Buys directly from four suppliers and names all four on every listing. Started this because nobody would tell her which mill her rice came from.', 8, 10),
  ('grocery', 'imran-shaikh', 'Imran Shaikh', 'Warehouse', null,
   'Packs the four o''clock cut-off himself. If something is not good enough that morning, it comes off the site rather than into the box.', 7, 20),
  ('grocery', 'priya-menon', 'Priya Menon', 'Deliveries', null,
   'Runs the evening routes. Will ring before arriving, which sounds small until the alternative has happened to you.', 3, 30)
) as t(variant, slug, full_name, role_label, qualification, bio, years, sort_order)
  on t.variant = v.slug
on conflict (variant_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Reviews. Labelled as samples, in the field that renders.
-- ---------------------------------------------------------------------------

insert into demo_shop.testimonials (variant_id, author, role_label, quote, rating, sort_order)
select v.id, t.author, t.role_label, t.quote, t.rating, t.sort_order
from demo_shop.variants v
join (values
  ('fashion', 'Sample review', 'Oxford shirt, size L', 'Third one I have bought. The first is two years old and still the same colour.', 5, 10),
  ('fashion', 'Sample review', 'Work trouser', 'No stretch was the point. They are the same shape after six months as the day they arrived.', 5, 20),
  ('fashion', 'Sample review', 'Merino crew', 'Expensive, and I would buy it again. It does not itch, which every other merino I own does.', 4, 30),

  ('electronics', 'Sample review', 'GaN charger', 'The split output is printed on the box. That is the only reason I bought this one over the cheaper one.', 5, 10),
  ('electronics', 'Sample review', 'Over-ear headphones', 'Replaceable earpads. My last pair died at eighteen months because the pads were glued on.', 5, 20),
  ('electronics', 'Sample review', 'Monitor stand', 'Heavier than I expected and does not move when I type. That is the whole review.', 4, 30),

  ('grocery', 'Sample review', 'Weekly order', 'Ordered at half three, arrived at seven. Nothing was substituted without being asked first.', 5, 10),
  ('grocery', 'Sample review', 'Groundnut oil', 'It went cloudy in December and I nearly complained. The listing already explained why.', 5, 20),
  ('grocery', 'Sample review', 'Tomatoes', 'Two were soft and they refunded those two, not the whole kilo. Fair, and quick.', 4, 30)
) as t(variant, author, role_label, quote, rating, sort_order)
  on t.variant = v.slug;

-- ---------------------------------------------------------------------------
-- Questions.
-- ---------------------------------------------------------------------------

insert into demo_shop.faqs (variant_id, question, answer, sort_order)
select v.id, f.question, f.answer, f.sort_order
from demo_shop.variants v
join (values
  ('fashion', 'How do I know my size?', 'Every listing has flat measurements in centimetres — chest, length, shoulder — rather than only S, M and L. Measure a shirt you already like and match it.', 10),
  ('fashion', 'Can I return something?', 'Within fourteen days, unworn, and we pay the return courier. A piece that does not fit is our measurement problem, not your mistake.', 20),
  ('fashion', 'Will the colour run?', 'They are washed twice before cutting, so the shrinking and the bleeding have already happened. Cold wash, and the first one separately anyway.', 30),
  ('fashion', 'Where is it made?', 'One unit in Tiruppur, which we name because a brand that will not name its factory usually has a reason.', 40),

  ('electronics', 'Is there a warranty?', 'Two years on everything, handled by us rather than by the manufacturer. You post it to us; we deal with the rest.', 10),
  ('electronics', 'Are these original?', 'Bought from the authorised distributor, and the invoice comes in the box with the serial on it. Check it against the maker''s site.', 20),
  ('electronics', 'Do the numbers in the listing come from the box?', 'No. We measure the ones we can measure — output, battery, noise reduction — and say so when a figure is the manufacturer''s.', 30),
  ('electronics', 'Can I get it repaired after the warranty?', 'For anything we stock, yes, at cost plus labour. It is why we do not stock things that cannot be opened.', 40),

  ('grocery', 'When will it arrive?', 'Order before four in the afternoon and it arrives the same evening, by nine. After four it goes on the next day''s round.', 10),
  ('grocery', 'What if something is bad?', 'Tell us within a day and we refund that item. Not the whole order — just the thing that was wrong.', 20),
  ('grocery', 'Do you substitute?', 'Only after asking. If the tomatoes are not good enough we ring you rather than sending them anyway.', 30),
  ('grocery', 'Is there a minimum order?', 'No minimum. Delivery is ₹29 and free above ₹499, which is about a normal week''s shopping.', 40)
) as f(variant, question, answer, sort_order)
  on f.variant = v.slug;
