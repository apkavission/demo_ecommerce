"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/actions/admin";
import { idleState } from "@/lib/form-state";

/**
 * The panel's front door.
 *
 * The same account that reaches the company website and the rest of the estate —
 * there is no separate demo login, because a second account list is one you add
 * a colleague to twice and remove them from once.
 *
 * No branding from any variant here. This page belongs to us, not to Smile Care
 * Dental Studio, and dressing it in a variant's colours would be pretending an
 * invented shop has staff.
 */
export default function AdminLogin() {
  const [state, action, pending] = useActionState(signIn, idleState);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Store demo — panel
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your Apka Vission account. The same one works across the
          estate.
        </p>

        <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
