"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { placeOrder, sendMessage, type PlacedOrder } from "@/lib/actions/public";
import { idleState, type FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

/**
 * The two forms that write something down.
 *
 * **Every message lands under the input it belongs to**, not in a list at the
 * top. A summary at the top of a nine-field form is a scavenger hunt, and the
 * field that is wrong is the one nobody can find.
 *
 * **Nothing is disabled while it submits except the button.** Disabling the
 * fields loses whatever somebody was mid-way through correcting if the request
 * fails, which is exactly when they are least willing to type it again.
 */

const FIELD =
  "block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm " +
  "placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>

      <div className="mt-1.5">{children}</div>

      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

function Banner({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        state.status === "error"
          ? "bg-red-500/10 text-red-700 dark:text-red-300"
          : "bg-accent-soft text-accent",
      )}
    >
      {state.message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                    */
/* -------------------------------------------------------------------------- */

const initialOrder: PlacedOrder = { status: "idle" };

export function CheckoutForm({ variant, base }: { variant: string; base: string }) {
  const [state, action, pending] = useActionState(placeOrder, initialOrder);

  /*
    The confirmation replaces the form rather than sitting above it.

    A filled-in address still on screen under the words "order placed" invites a
    second submit, and the second one is a duplicate order somebody has to ring
    up about.
  */
  if (state.status === "success" && state.orderCode) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>

        <h2 className="font-display mt-5 text-xl font-semibold">That is ordered</h2>

        <p className="measure mx-auto mt-2 text-sm text-muted">
          Your order number is{" "}
          <span className="font-mono font-semibold text-text">{state.orderCode}</span>.
          Nothing will actually be dispatched — this is a demonstration shop.
        </p>

        <Link
          href={`${base}/order/${state.orderCode}`}
          className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg"
        >
          See the order
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variant" value={variant} />

      <Banner state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" error={state.fieldErrors?.name}>
          <input id="name" name="name" required maxLength={160} className={FIELD} />
        </Field>

        <Field label="Phone" name="phone" error={state.fieldErrors?.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            maxLength={20}
            inputMode="tel"
            className={FIELD}
          />
        </Field>
      </div>

      <Field
        label="Email"
        name="email"
        error={state.fieldErrors?.email}
        hint="Optional. For the confirmation, if you want one."
      >
        <input id="email" name="email" type="email" maxLength={254} className={FIELD} />
      </Field>

      <Field label="Address" name="address_line" error={state.fieldErrors?.address_line}>
        <textarea
          id="address_line"
          name="address_line"
          required
          rows={3}
          maxLength={400}
          placeholder="Flat, building, street, landmark"
          className={FIELD}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Town or city" name="city" error={state.fieldErrors?.city}>
          <input id="city" name="city" required maxLength={120} className={FIELD} />
        </Field>

        <Field label="PIN code" name="pincode" error={state.fieldErrors?.pincode}>
          <input
            id="pincode"
            name="pincode"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            className={FIELD}
          />
        </Field>
      </div>

      <Field
        label="Anything we should know"
        name="note"
        error={state.fieldErrors?.note}
        hint="Optional. Delivery instructions, a gift message."
      >
        <textarea id="note" name="note" rows={2} maxLength={600} className={FIELD} />
      </Field>

      <div className="rounded-lg bg-surface-2 px-4 py-3 text-xs text-muted">
        Payment is cash on delivery in this demonstration. No card details are
        asked for anywhere on this site, and no money is taken.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Placing the order" : "Place the order"}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Writing in                                                                  */
/* -------------------------------------------------------------------------- */

export function ContactForm({ variant }: { variant: string }) {
  const [state, action, pending] = useActionState(sendMessage, idleState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variant" value={variant} />

      <Banner state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" error={state.fieldErrors?.name}>
          <input id="name" name="name" required maxLength={160} className={FIELD} />
        </Field>

        <Field label="Phone" name="phone" error={state.fieldErrors?.phone} hint="Optional.">
          <input id="phone" name="phone" type="tel" maxLength={20} className={FIELD} />
        </Field>
      </div>

      <Field label="Email" name="email" error={state.fieldErrors?.email}>
        <input id="email" name="email" type="email" maxLength={254} className={FIELD} />
      </Field>

      <Field label="Message" name="body" error={state.fieldErrors?.body}>
        <textarea id="body" name="body" required rows={5} maxLength={2000} className={FIELD} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Sending" : "Send"}
      </button>
    </form>
  );
}
