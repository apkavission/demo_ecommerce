import "server-only";

import { renderDemoEmail } from "@/lib/email/layout";
import { sendMail } from "@/lib/email/mailer";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { clientEnv } from "@/lib/env";
import type { VariantContact } from "@/types/database";

/**
 * The confirmation that goes out when an order is placed.
 *
 * ---------------------------------------------------------------------------
 * **Why a demonstration shop sends real email.**
 *
 * An order confirmation that never arrives is the single most alarming thing an
 * online shop can do — the customer has just given an address and a phone
 * number and heard nothing back. The demo exists to make the opposite point,
 * and it makes it best by doing it: somebody being shown this puts their own
 * address in, and thirty seconds later their phone has a confirmation from
 * *their* shop, in *their* colour, with the order number on it.
 *
 * ---------------------------------------------------------------------------
 * **Different from the other five demos, on purpose.**
 *
 * The other demos acknowledge a *request* — "we have this, somebody will come
 * back to you". An order is not a request: it is a thing that has happened, it
 * has a number, and the number is what the customer quotes when they ring. So
 * this message leads with the code and repeats the address it is going to,
 * because a wrong address is the mistake worth catching in the first minute.
 *
 * ---------------------------------------------------------------------------
 * **It can never break the order.** The order is placed and the basket is gone
 * before this runs. Every failure is swallowed: a missing confirmation is a
 * missing courtesy, not a lost sale.
 */

export interface OrderAcknowledgement {
  variantSlug: string;
  to: string | null;
  name: string;
  orderCode: string;
  phone: string;
  addressLine: string;
  city: string;
  pincode: string;
  note?: string | null;
}

export async function acknowledgeOrder(input: OrderAcknowledgement): Promise<void> {
  if (!input.to?.trim()) return;

  try {
    const supabase = await createClient();

    const { data: variant } = await supabase
      .from("variants")
      .select("business_name, theme, contact")
      .eq("slug", input.variantSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!variant) return;

    const theme = readTheme(variant.theme);
    const contact = (variant.contact ?? {}) as VariantContact;
    const firstName = input.name.trim().split(/\s+/)[0] || input.name;

    /* One block, the way an address is written on a parcel. Three separate rows
       would be three things to read instead of one thing to check. */
    const deliverTo = [input.addressLine, `${input.city} ${input.pincode}`.trim()]
      .filter(Boolean)
      .join("\n");

    const rows: Array<[string, string]> = [
      ["Order", input.orderCode],
      ["Phone", input.phone],
    ];

    const html = renderDemoEmail({
      preheader: `${firstName}, your order ${input.orderCode} is placed.`,
      heading: "Your order is placed",
      intro:
        "Here is the order number and where it is going. Check the address now — it is much easier to change before it is packed.",
      rows,
      quote: { label: "Going to", body: deliverTo },
      note: input.note?.trim()
        ? `You asked us to note: ${input.note.trim()}`
        : "Quote the order number if you ring or write in about this.",
      brand: {
        businessName: variant.business_name,
        /* The light palette: the email is a light document, and the dark
           accent would be the wrong colour on white. */
        accent: theme.light.accent,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        address: contact.address ?? null,
        siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
      },
    });

    const text = [
      `Hello ${firstName},`,
      "",
      `Your order ${input.orderCode} is placed.`,
      "",
      "Going to:",
      deliverTo,
      "",
      `Phone: ${input.phone}`,
      ...(input.note?.trim() ? ["", `You asked us to note: ${input.note.trim()}`] : []),
      "",
      variant.business_name,
      "",
      "This is a demonstration website built by Rahvian.",
    ].join("\n");

    await sendMail({
      to: input.to,
      subject: `Order ${input.orderCode} — ${variant.business_name}`,
      /* From the shop, by name. The address is still ours — see the note in
         `mailer.ts` about SPF. */
      fromName: variant.business_name,
      text,
      html,
    });
  } catch (error) {
    /* Logged and swallowed. See the note at the top of this file. */
    console.error(
      "[acknowledge] could not send:",
      error instanceof Error ? error.message : error,
    );
  }
}
