/**
 * Generated from the live database. Do not edit.
 *
 *     npm run gen:types
 *
 * The hand-written `database.ts` is the one the application imports — it
 * carries the reasoning a generator cannot know. This file exists so that one
 * can be checked against reality: `conformance.ts` compares them at compile
 * time, and `tsc` fails if they have drifted apart.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  demo_shop: {
    Tables: {
      /** A table. */
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          option_id: string | null;
          quantity: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          option_id?: string | null;
          quantity?: number;
          added_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          option_id?: string | null;
          quantity?: number;
          added_at?: string;
        };
        Relationships: [];
      };
      /** A view. */
      cart_totals: {
        Row: {
          cart_id: string | null;
          variant_id: string | null;
          items_paise: number | null;
          item_count: number | null;
        };
        Insert: {
          cart_id?: string | null;
          variant_id?: string | null;
          items_paise?: number | null;
          item_count?: number | null;
        };
        Update: {
          cart_id?: string | null;
          variant_id?: string | null;
          items_paise?: number | null;
          item_count?: number | null;
        };
        Relationships: [];
      };
      /** A table. */
      carts: {
        Row: {
          id: string;
          variant_id: string;
          token: string;
          coupon_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          token: string;
          coupon_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          token?: string;
          coupon_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      collections: {
        Row: {
          id: string;
          variant_id: string;
          slug: string;
          name: string;
          summary: string | null;
          icon: string | null;
          image_id: string | null;
          status: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          slug: string;
          name: string;
          summary?: string | null;
          icon?: string | null;
          image_id?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          slug?: string;
          name?: string;
          summary?: string | null;
          icon?: string | null;
          image_id?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      coupons: {
        Row: {
          id: string;
          variant_id: string;
          code: string;
          description: string | null;
          kind: Database["demo_shop"]["Enums"]["discount_kind"];
          amount: number;
          min_order_paise: number;
          max_uses: number | null;
          used_count: number;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          code: string;
          description?: string | null;
          kind?: Database["demo_shop"]["Enums"]["discount_kind"];
          amount: number;
          min_order_paise?: number;
          max_uses?: number | null;
          used_count?: number;
          starts_at?: string;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          code?: string;
          description?: string | null;
          kind?: Database["demo_shop"]["Enums"]["discount_kind"];
          amount?: number;
          min_order_paise?: number;
          max_uses?: number | null;
          used_count?: number;
          starts_at?: string;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      faqs: {
        Row: {
          id: string;
          variant_id: string;
          question: string;
          answer: string;
          status: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          question: string;
          answer: string;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          question?: string;
          answer?: string;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A view. */
      me: {
        Row: {
          id: string | null;
          full_name: string | null;
          role_key: string | null;
          role_label: string | null;
          is_owner: boolean | null;
          app_access: string[] | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string | null;
          full_name?: string | null;
          role_key?: string | null;
          role_label?: string | null;
          is_owner?: boolean | null;
          app_access?: string[] | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string | null;
          full_name?: string | null;
          role_key?: string | null;
          role_label?: string | null;
          is_owner?: boolean | null;
          app_access?: string[] | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      /** A table. */
      media: {
        Row: {
          id: string;
          storage_key: string;
          filename: string;
          alt: string;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_key: string;
          filename: string;
          alt?: string;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          storage_key?: string;
          filename?: string;
          alt?: string;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A view. */
      media_public: {
        Row: {
          id: string | null;
          storage_key: string | null;
          filename: string | null;
          alt: string | null;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string | null;
          storage_key?: string | null;
          filename?: string | null;
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          storage_key?: string | null;
          filename?: string | null;
          alt?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      /** A table. */
      messages: {
        Row: {
          id: string;
          variant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          body?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      nav_items: {
        Row: {
          id: string;
          variant_id: string;
          label: string;
          href: string;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          variant_id: string;
          label: string;
          href: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          variant_id?: string;
          label?: string;
          href?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      /** A table. */
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          option_label: string | null;
          unit_price_paise: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          option_label?: string | null;
          unit_price_paise: number;
          quantity: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          option_label?: string | null;
          unit_price_paise?: number;
          quantity?: number;
        };
        Relationships: [];
      };
      /** A view. */
      order_totals: {
        Row: {
          order_id: string | null;
          items_paise: number | null;
          discount_paise: number | null;
          shipping_paise: number | null;
          grand_total_paise: number | null;
          item_count: number | null;
        };
        Insert: {
          order_id?: string | null;
          items_paise?: number | null;
          discount_paise?: number | null;
          shipping_paise?: number | null;
          grand_total_paise?: number | null;
          item_count?: number | null;
        };
        Update: {
          order_id?: string | null;
          items_paise?: number | null;
          discount_paise?: number | null;
          shipping_paise?: number | null;
          grand_total_paise?: number | null;
          item_count?: number | null;
        };
        Relationships: [];
      };
      /** A table. */
      orders: {
        Row: {
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
          status: Database["demo_shop"]["Enums"]["order_state"];
          payment: Database["demo_shop"]["Enums"]["payment_state"];
          payment_method: string;
          staff_note: string | null;
          placed_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          code: string;
          customer_name: string;
          phone: string;
          email?: string | null;
          address_line: string;
          city: string;
          pincode: string;
          note?: string | null;
          coupon_code?: string | null;
          discount_paise?: number;
          shipping_paise?: number;
          status?: Database["demo_shop"]["Enums"]["order_state"];
          payment?: Database["demo_shop"]["Enums"]["payment_state"];
          payment_method?: string;
          staff_note?: string | null;
          placed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          code?: string;
          customer_name?: string;
          phone?: string;
          email?: string | null;
          address_line?: string;
          city?: string;
          pincode?: string;
          note?: string | null;
          coupon_code?: string | null;
          discount_paise?: number;
          shipping_paise?: number;
          status?: Database["demo_shop"]["Enums"]["order_state"];
          payment?: Database["demo_shop"]["Enums"]["payment_state"];
          payment_method?: string;
          staff_note?: string | null;
          placed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      page_sections: {
        Row: {
          id: string;
          page_id: string;
          heading: string | null;
          body: string | null;
          image_id: string | null;
          layout: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          page_id: string;
          heading?: string | null;
          body?: string | null;
          image_id?: string | null;
          layout?: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          page_id?: string;
          heading?: string | null;
          body?: string | null;
          image_id?: string | null;
          layout?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      /** A table. */
      pages: {
        Row: {
          id: string;
          variant_id: string;
          slug: string;
          title: string;
          summary: string | null;
          status: Database["demo_shop"]["Enums"]["publish_state"];
          meta_title: string | null;
          meta_description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          slug: string;
          title: string;
          summary?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          meta_title?: string | null;
          meta_description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          slug?: string;
          title?: string;
          summary?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          meta_title?: string | null;
          meta_description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      product_images: {
        Row: {
          id: string;
          product_id: string;
          media_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          media_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          media_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      /** A table. */
      product_options: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          value: string;
          price_delta_paise: number;
          stock: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          label: string;
          value: string;
          price_delta_paise?: number;
          stock?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          label?: string;
          value?: string;
          price_delta_paise?: number;
          stock?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      /** A table. */
      products: {
        Row: {
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
          status: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          collection_id?: string | null;
          slug: string;
          name: string;
          summary?: string | null;
          description?: string | null;
          sku?: string | null;
          image_id?: string | null;
          price_paise: number;
          compare_at_paise?: number | null;
          stock?: number | null;
          weight_grams?: number | null;
          is_featured?: boolean;
          meta_label?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          collection_id?: string | null;
          slug?: string;
          name?: string;
          summary?: string | null;
          description?: string | null;
          sku?: string | null;
          image_id?: string | null;
          price_paise?: number;
          compare_at_paise?: number | null;
          stock?: number | null;
          weight_grams?: number | null;
          is_featured?: boolean;
          meta_label?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      share_link_opens: {
        Row: {
          id: string;
          link_id: string;
          opened_at: string;
          user_agent: string | null;
          referrer: string | null;
        };
        Insert: {
          id?: string;
          link_id: string;
          opened_at?: string;
          user_agent?: string | null;
          referrer?: string | null;
        };
        Update: {
          id?: string;
          link_id?: string;
          opened_at?: string;
          user_agent?: string | null;
          referrer?: string | null;
        };
        Relationships: [];
      };
      /** A table. */
      share_links: {
        Row: {
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
        Insert: {
          id?: string;
          variant_id: string;
          token: string;
          label?: string;
          note?: string | null;
          expires_at: string;
          revoked_at?: string | null;
          view_count?: number;
          last_seen_at?: string | null;
          max_views?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          token?: string;
          label?: string;
          note?: string | null;
          expires_at?: string;
          revoked_at?: string | null;
          view_count?: number;
          last_seen_at?: string | null;
          max_views?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      team: {
        Row: {
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
          status: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          slug: string;
          full_name: string;
          role_label?: string | null;
          qualification?: string | null;
          bio?: string | null;
          photo_id?: string | null;
          years_experience?: number | null;
          availability?: Json;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          slug?: string;
          full_name?: string;
          role_label?: string | null;
          qualification?: string | null;
          bio?: string | null;
          photo_id?: string | null;
          years_experience?: number | null;
          availability?: Json;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      testimonials: {
        Row: {
          id: string;
          variant_id: string;
          product_id: string | null;
          author: string;
          role_label: string | null;
          quote: string;
          rating: number | null;
          photo_id: string | null;
          status: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          product_id?: string | null;
          author: string;
          role_label?: string | null;
          quote: string;
          rating?: number | null;
          photo_id?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          product_id?: string | null;
          author?: string;
          role_label?: string | null;
          quote?: string;
          rating?: number | null;
          photo_id?: string | null;
          status?: Database["demo_shop"]["Enums"]["publish_state"];
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      /** A table. */
      variants: {
        Row: {
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
          logo_shows_name: boolean;
          meta_title: string | null;
          meta_description: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          industry_label: string;
          business_name: string;
          tagline?: string | null;
          description?: string | null;
          logo_light_id?: string | null;
          logo_dark_id?: string | null;
          og_image_id?: string | null;
          theme?: Json;
          contact?: Json;
          features?: Json;
          shipping_paise?: number;
          free_shipping_above?: number | null;
          currency_symbol?: string;
          default_mode?: string;
          allow_mode_toggle?: boolean;
          visibility?: string;
          is_default?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          logo_shows_name?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          industry_label?: string;
          business_name?: string;
          tagline?: string | null;
          description?: string | null;
          logo_light_id?: string | null;
          logo_dark_id?: string | null;
          og_image_id?: string | null;
          theme?: Json;
          contact?: Json;
          features?: Json;
          shipping_paise?: number;
          free_shipping_above?: number | null;
          currency_symbol?: string;
          default_mode?: string;
          allow_mode_toggle?: boolean;
          visibility?: string;
          is_default?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          logo_shows_name?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      discount_kind: "percent" | "amount";
      order_state: "placed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
      payment_state: "pending" | "paid" | "refunded" | "failed";
      publish_state: "draft" | "published";
    };
    CompositeTypes: Record<never, never>;
  };
};
