import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound mail from a demonstration site.
 *
 * ---------------------------------------------------------------------------
 * **It fails quietly, and that is deliberate.**
 *
 * Everywhere else in this estate a failed send is worth shouting about. Here it
 * is not: the enquiry is already saved, the visitor has already been told it
 * arrived, and the panel already shows it. An email that does not go is a
 * missing courtesy, not lost work — so nothing about it is allowed to turn a
 * successful booking into an error on somebody's screen.
 *
 * With no SMTP configured it does nothing at all and says so in the log. A demo
 * has to run on a laptop with no credentials.
 *
 * ---------------------------------------------------------------------------
 * **Its own copy, not the website's.** No project here imports another's code.
 * The credentials are the same mailbox because the company has one mailbox, not
 * because these two applications share anything.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Who it appears to be from — the demo business, not us. */
  fromName?: string;
}

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "no-address" | "failed" };

let transport: Transporter | null = null;

function configured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter(): Transporter {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
  });

  return transport;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (!configured()) {
    console.info("[mail] no SMTP configured; not sending:", message.subject);
    return { sent: false, reason: "not-configured" };
  }

  if (!message.to.trim()) return { sent: false, reason: "no-address" };

  /*
    The address is ours; only the display name is the demo business's.

    Sending as an address on a domain we do not control is how a message ends
    up in spam or refused outright — SPF and DKIM are checked against the
    envelope domain, not against the name beside it.
  */
  const address = process.env.EMAIL_FROM ?? (process.env.SMTP_USER as string);
  const from = message.fromName ? `"${message.fromName.replace(/"/g, "")}" <${address}>` : address;

  try {
    await transporter().sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { sent: true };
  } catch (error) {
    /* Logged, never surfaced. See the note at the top of this file. */
    console.error("[mail] failed:", error instanceof Error ? error.message : error);
    return { sent: false, reason: "failed" };
  }
}
