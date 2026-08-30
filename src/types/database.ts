/**
 * The schema, as TypeScript.
 *
 * ---------------------------------------------------------------------------
 * **Hand-written here, where the other five demos derive theirs.**
 *
 * Those five run `npm run gen:types`, which reads `information_schema` over a
 * real connection and writes `database.generated.ts`; `conformance.ts` then
 * compares the two at compile time so the hand-written copy cannot quietly
 * disagree with the database.
 *
 * This one cannot do that yet, for an honest reason and not a shortcut: **the
 * migrations have not been applied.** A generator cannot read a schema that
 * does not exist. So this file is written from the migration, by hand, the way
 * the company website and the internal panel both do it.
 *
 * **The moment the three migrations are run, do this:**
 *
 *     npm run gen:types
 *
 * and add a `conformance.ts` matching the other demos'. Until then the type
 * safety here is a claim about the migration rather than about the database,
 * and that difference is worth knowing before trusting it.
 *
 * ---------------------------------------------------------------------------
 * **Money is `_paise` everywhere, and the suffix is the documentation.**
 *
 * A bare `price: number` invites somebody to render it directly, and the bug —
 * ₹129900 on a product card — is the kind that ships because it looks like a
 * number in the right place. Every column that holds money says paise in its
 * name, and `formatMoney` in `lib/money.ts` is the only thing that turns one
 * into something a person reads.
 */

/*
  ---------------------------------------------------------------------------
  **Every shape below is a `type`, not an `interface`, and that is load-bearing.**

  Supabase's `GenericSchema` requires each table's Row to satisfy
  `Record<string, unknown>`. A type alias for an object gets an implicit index
  signature and satisfies it; an interface does not, and never has.

  Written as interfaces the first time, this whole schema silently failed the
  constraint, the client fell back to `never`, and roughly forty lines across
  six files reported "Property 'code' does not exist on type 'never'" — none of
  which points anywhere near the actual cause.
  ---------------------------------------------------------------------------
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PublishState = "draft" | "published";
export type OrderState =
  | "placed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
export type PaymentState = "pending" | "paid" | "refunded" | "failed";
export type DiscountKind = "percent" | "amount";

export type MediaRow = {
  id: string;
  storage_key: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  created_at: string;
};

export type VariantRow = {
  id: string;
  slug: string;
  name: string;
  industry_label: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  logo_light_id: string | null;
  logo_dark_id: string | null;
  og_image_id: string | null;
  theme: Json;
  contact: Json;
  features: Json;
  shipping_paise: number;
  free_shipping_above: number | null;
  currency_symbol: string;
  default_mode: string;
  allow_mode_toggle: boolean;
  visibility: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NavItemRow = {
  id: string;
  variant_id: string;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
};

export type CollectionRow = {
  id: string;
  variant_id: string;
  slug: string;
  name: string;
  summary: string | null;
  icon: string | null;
  image_id: string | null;
  status: PublishState;
  sort_order: number;
  created_at: string;
};

export type ProductRow = {
  id: string;
  variant_id: string;
  collection_id: string | null;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  sku: string | null;
  image_id: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  stock: number | null;
  weight_grams: number | null;
  is_featured: boolean;
  meta_label: string | null;
  status: PublishState;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductOptionRow = {
  id: string;
  product_id: string;
  label: string;
  value: string;
  price_delta_paise: number;
  stock: number | null;
  sort_order: number;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  media_id: string;
  sort_order: number;
};

export type CouponRow = {
  id: string;
  variant_id: string;
  code: string;
  description: string | null;
  kind: DiscountKind;
  amount: number;
  min_order_paise: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type CartRow = {
  id: string;
  variant_id: string;
  token: string;
  coupon_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItemRow = {
  id: string;
  cart_id: string;
  product_id: string;
  option_id: string | null;
  quantity: number;
  added_at: string;
};

export type OrderRow = {
  id: string;
  variant_id: string;
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address_line: string;
  city: string;
  pincode: string;
  note: string | null;
  coupon_code: string | null;
  discount_paise: number;
  shipping_paise: number;
  status: OrderState;
  payment: PaymentState;
  payment_method: string;
  staff_note: string | null;
  placed_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  option_label: string | null;
  unit_price_paise: number;
  quantity: number;
};

export type PersonRow = {
  id: string;
  variant_id: string;
  slug: string;
  full_name: string;
  role_label: string | null;
  qualification: string | null;
  bio: string | null;
  photo_id: string | null;
  years_experience: number | null;
  availability: Json;
  status: PublishState;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TestimonialRow = {
  id: string;
  variant_id: string;
  product_id: string | null;
  author: string;
  role_label: string | null;
  quote: string;
  rating: number | null;
  photo_id: string | null;
  status: PublishState;
  sort_order: number;
  created_at: string;
};

export type FaqRow = {
  id: string;
  variant_id: string;
  question: string;
  answer: string;
  status: PublishState;
  sort_order: number;
  created_at: string;
};

export type MessageRow = {
  id: string;
  variant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type ShareLinkRow = {
  id: string;
  variant_id: string;
  token: string;
  label: string;
  note: string | null;
  expires_at: string;
  revoked_at: string | null;
  view_count: number;
  last_seen_at: string | null;
  max_views: number | null;
  created_by: string | null;
  created_at: string;
};

export type CartTotalsRow = {
  cart_id: string | null;
  variant_id: string | null;
  items_paise: number | null;
  item_count: number | null;
};

export type OrderTotalsRow = {
  order_id: string | null;
  items_paise: number | null;
  discount_paise: number | null;
  shipping_paise: number | null;
  grand_total_paise: number | null;
  item_count: number | null;
};

export type MeRow = {
  id: string | null;
  full_name: string | null;
  role_key: string | null;
  role_label: string | null;
  is_owner: boolean | null;
  app_access: string[] | null;
  is_active: boolean | null;
}

/**
 * A table's three faces.
 *
 * `Insert` makes anything with a default optional, `Update` makes everything
 * optional. Written as one helper rather than three copies per table, because
 * three copies of twenty tables is where a column gets added to one and not the
 * others.
 */
type Table<Row, Optional extends string> = {
  Row: Row;
  Insert: Omit<Row, Extract<Optional, keyof Row>> &
    Partial<Pick<Row, Extract<Optional, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

/**
 * Columns every table defaults.
 *
 * `Optional extends string` rather than `extends keyof Row`, so this one name
 * can be handed to every table including the several that have no `updated_at`.
 * `Extract` drops whatever does not apply. The alternative — writing the two or
 * three automatic columns out per table — is twenty chances to miss one.
 */
type Auto = "id" | "created_at" | "updated_at";

export type Database = {
  demo_shop: {
    Tables: {
      media: Table<MediaRow, Auto | "alt" | "width" | "height" | "mime_type">;
      variants: Table<
        VariantRow,
        | Auto
        | "tagline"
        | "description"
        | "logo_light_id"
        | "logo_dark_id"
        | "og_image_id"
        | "theme"
        | "contact"
        | "features"
        | "shipping_paise"
        | "free_shipping_above"
        | "currency_symbol"
        | "default_mode"
        | "allow_mode_toggle"
        | "visibility"
        | "is_default"
        | "is_active"
        | "sort_order"
      >;
      nav_items: Table<NavItemRow, "id" | "sort_order" | "is_active">;
      collections: Table<
        CollectionRow,
        Auto | "summary" | "icon" | "image_id" | "status" | "sort_order"
      >;
      products: Table<
        ProductRow,
        | Auto
        | "collection_id"
        | "summary"
        | "description"
        | "sku"
        | "image_id"
        | "compare_at_paise"
        | "stock"
        | "weight_grams"
        | "is_featured"
        | "meta_label"
        | "status"
        | "sort_order"
      >;
      product_options: Table<
        ProductOptionRow,
        "id" | "price_delta_paise" | "stock" | "sort_order"
      >;
      product_images: Table<ProductImageRow, "id" | "sort_order">;
      coupons: Table<
        CouponRow,
        | Auto
        | "description"
        | "kind"
        | "min_order_paise"
        | "max_uses"
        | "used_count"
        | "starts_at"
        | "ends_at"
        | "is_active"
      >;
      carts: Table<CartRow, Auto | "coupon_id">;
      cart_items: Table<CartItemRow, "id" | "option_id" | "quantity" | "added_at">;
      orders: Table<
        OrderRow,
        | "id"
        | "placed_at"
        | "updated_at"
        | "email"
        | "note"
        | "coupon_code"
        | "discount_paise"
        | "shipping_paise"
        | "status"
        | "payment"
        | "payment_method"
        | "staff_note"
      >;
      order_items: Table<OrderItemRow, "id" | "product_id" | "option_label">;
      team: Table<
        PersonRow,
        | Auto
        | "role_label"
        | "qualification"
        | "bio"
        | "photo_id"
        | "years_experience"
        | "availability"
        | "status"
        | "sort_order"
      >;
      testimonials: Table<
        TestimonialRow,
        Auto | "product_id" | "role_label" | "rating" | "photo_id" | "status" | "sort_order"
      >;
      faqs: Table<FaqRow, Auto | "status" | "sort_order">;
      messages: Table<MessageRow, Auto | "email" | "phone" | "is_read">;
      share_links: Table<
        ShareLinkRow,
        | Auto
        | "label"
        | "note"
        | "revoked_at"
        | "view_count"
        | "last_seen_at"
        | "max_views"
        | "created_by"
      >;
    };

    Views: {
      cart_totals: { Row: CartTotalsRow; Relationships: [] };
      order_totals: { Row: OrderTotalsRow; Relationships: [] };
      me: { Row: MeRow; Relationships: [] };
    };

    Enums: {
      publish_state: PublishState;
      order_state: OrderState;
      payment_state: PaymentState;
      discount_kind: DiscountKind;
    };

    CompositeTypes: Record<string, never>;

    /**
     * The functions the application calls.
     *
     * The generator in the other demos does not read these — argument and
     * return types live in `pg_proc` in a form that needs real parsing, and a
     * generator that guessed at them would be worse than one that admits it
     * does not do them. So they are written by hand there too.
     *
     * If a signature changes in a migration and this is not updated, the RPC
     * fails loudly at the first request rather than silently returning nothing,
     * which is the right way for this particular mistake to appear: three of
     * these decide who gets in and what somebody is charged.
     */
    Functions: {
      /** Is the caller allowed to change prices and content? */
      is_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      /** Copy a shop and everything it sells. Returns the new variant's id. */
      clone_variant: {
        Args: { p_source: string; p_slug: string; p_name: string };
        Returns: string;
      };
      /** May this browser see this variant? */
      can_view: {
        Args: { p_slug: string; p_token?: string | null };
        Returns: { verdict: string; allowed_slug: string | null }[];
      };
      /** Count one visit, when a share link is first opened. */
      note_share_visit: {
        Args: { p_token: string };
        Returns: undefined;
      };
      /** Is this code usable on a basket this size, and if not, why not? */
      check_coupon: {
        Args: { p_variant_id: string; p_code: string; p_items_paise: number };
        Returns: { verdict: string; discount_paise: number; message: string }[];
      };
      /** Turn a basket into an order, or say what stopped it. */
      place_order: {
        Args: {
          p_cart_token: string;
          p_name: string;
          p_phone: string;
          p_email: string | null;
          p_address_line: string;
          p_city: string;
          p_pincode: string;
          p_note?: string | null;
        };
        Returns: {
          order_code: string | null;
          grand_total_paise: number;
          problem: string | null;
        }[];
      };
      /** What one order came to, for the person who placed it. */
      order_summary: {
        Args: { p_code: string };
        Returns: {
          code: string;
          placed_at: string;
          status: string;
          items_paise: number;
          discount_paise: number;
          shipping_paise: number;
          grand_total_paise: number;
          item_count: number;
          customer_name: string;
        }[];
      };
    };
  };
};

/**
 * The shape of `variants.theme`.
 *
 * `jsonb` in the database and therefore `Json` above, which is honest — Postgres
 * does not check the shape. This is what the application hopes to find, and
 * `readTheme` is what makes the hope safe.
 */
export type VariantPalette = {
  accent: string;
  accentFg: string;
  accentSoft: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
};

export type VariantTheme = {
  light: VariantPalette;
  dark: VariantPalette;
  headingFont?: string;
  bodyFont?: string;
  radius?: "sm" | "md" | "lg" | "xl";
};

export type VariantContact = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  whatsapp?: string;
};

export type VariantFeatures = {
  [key: string]: boolean | string | number | undefined;
}
