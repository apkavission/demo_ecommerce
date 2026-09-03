import type { Database as Generated, Json } from "./database.generated";

/**
 * The schema, as TypeScript.
 *
 * ---------------------------------------------------------------------------
 * **Derived from the generated file, as the other five demos are.**
 *
 * This was hand-written for an honest reason: when it was first needed the
 * migrations had not been applied, and a generator cannot read a schema that
 * does not exist. They have been applied since, so the note that used to stand
 * here — "run `npm run gen:types` the moment the migrations are run" — has been
 * carried out, and the hand-written copy of twenty-four table shapes is gone.
 *
 * That copy was not merely redundant. A hand-written schema beside a live one
 * is a claim about the database rather than a reading of it, and the first
 * migration nobody mirrored here would have compiled perfectly and failed at
 * runtime.
 *
 * After any migration:
 *
 *     npm run gen:types
 *
 * ---------------------------------------------------------------------------
 * **Money is `_paise` everywhere, and the suffix is the documentation.**
 *
 * A bare `price: number` invites somebody to render it directly, and the bug —
 * ₹129900 on a product card — is the kind that ships because it looks like a
 * number in the right place. Every column that holds money says paise in its
 * name, and `formatMoney` in `lib/money.ts` is the only thing that turns one
 * into something a person reads. Those names come from the database, so they
 * survive the switch to generated types unchanged.
 */

export type { Json };

type Tables = Generated["demo_shop"]["Tables"];
type Enums = Generated["demo_shop"]["Enums"];

export type PublishState = Enums["publish_state"];
export type OrderState = Enums["order_state"];
export type PaymentState = Enums["payment_state"];
export type DiscountKind = Enums["discount_kind"];

export type MediaRow = Tables["media"]["Row"];
export type VariantRow = Tables["variants"]["Row"];
export type NavItemRow = Tables["nav_items"]["Row"];
export type CollectionRow = Tables["collections"]["Row"];
export type ProductRow = Tables["products"]["Row"];
export type ProductOptionRow = Tables["product_options"]["Row"];
export type ProductImageRow = Tables["product_images"]["Row"];
export type CouponRow = Tables["coupons"]["Row"];
export type CartRow = Tables["carts"]["Row"];
export type CartItemRow = Tables["cart_items"]["Row"];
export type OrderRow = Tables["orders"]["Row"];
export type OrderItemRow = Tables["order_items"]["Row"];
export type PersonRow = Tables["team"]["Row"];
export type TestimonialRow = Tables["testimonials"]["Row"];
export type FaqRow = Tables["faqs"]["Row"];
export type MessageRow = Tables["messages"]["Row"];
export type ShareLinkRow = Tables["share_links"]["Row"];
export type PageRow = Tables["pages"]["Row"];
export type PageSectionRow = Tables["page_sections"]["Row"];

/*
  The generator puts views in `Tables` and leaves `Views` empty, because
  PostgREST describes both the same way and a view that can be selected from is,
  as far as a query is concerned, a table you cannot write to. Read from where
  they actually are rather than from where the name suggests.
*/
type Views = Generated["demo_shop"]["Views"];

export type CartTotalsRow = Tables["cart_totals"]["Row"];
export type OrderTotalsRow = Tables["order_totals"]["Row"];
export type MeRow = Tables["me"]["Row"];

export type Database = {
  demo_shop: {
    Tables: Tables;
    Views: Views;
    Enums: Enums;
    CompositeTypes: Generated["demo_shop"]["CompositeTypes"];

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
      /**
       * Count one opening, at most once every half hour.
       *
       * The browser and referrer are optional because the throttle means most
       * calls have nothing new to record — see 20260903000050.
       */
      note_share_visit: {
        Args: {
          p_token: string;
          p_user_agent?: string | null;
          p_referrer?: string | null;
        };
        Returns: undefined;
      };
      /**
       * What happened to this token, for the screen shown to whoever holds it.
       *
       * 'live' | 'expired' | 'revoked' | 'used_up' | 'unknown'. Everything but
       * the state is null for a token that does not exist.
       */
      link_state: {
        Args: { p_token: string };
        Returns: {
          state: string;
          expires_at: string | null;
          revoked_at: string | null;
          business: string | null;
        }[];
      };
      /** Every opening of one link, newest first. A super admin's question. */
      share_link_opens_for: {
        Args: { p_link_id: string };
        Returns: { opened_at: string; user_agent: string | null; referrer: string | null }[];
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
