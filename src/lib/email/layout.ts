import "server-only";

/**
 * The frame an email from a demonstration business is rendered into.
 *
 * ---------------------------------------------------------------------------
 * **Branded as that business, not as us.**
 *
 * The header is the business's own accent colour with its own name on it, and
 * the footer carries its phone and address. A prospect reading this is meant to
 * see their business answering their customer — a message headed "Apka Vission"
 * would be a message about us, at the exact moment the demo is trying to be
 * about them.
 *
 * The one line that is ours sits at the very bottom, small and honest: this is
 * a demonstration. Leaving it out would make a real-looking message from a
 * business that does not exist, which is not a thing to send anybody.
 *
 * ---------------------------------------------------------------------------
 * **No logo image.** These businesses are invented and have no mark, and an
 * empty image box in the header is worse than none. The name is set as type, in
 * the colour the variant carries — which also means nothing to attach, nothing
 * to rasterise, and nothing that depends on "show images".
 *
 * ---------------------------------------------------------------------------
 * Tables and inline styles, as email requires: Gmail rewrites the document and
 * Outlook renders through Word. The single `<style>` block holds only the
 * mobile rule, which cannot be inlined, and the layout stays readable without
 * it.
 */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const PAGE_BG = "#f4f5f7";
const CARD_BG = "#ffffff";
const BORDER = "#e4e7ec";
const TEXT = "#0b1220";
const MUTED = "#475467";
const SUBTLE = "#667085";

export interface DemoEmailBrand {
  businessName: string;
  /** The variant's own accent. Everything coloured follows it. */
  accent: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  siteUrl: string;
}

export interface DemoEmailOptions {
  preheader: string;
  heading: string;
  intro?: string;
  rows?: Array<[string, string]>;
  /** A quoted block — what the person wrote, in their words. */
  quote?: { label: string; body: string } | null;
  note?: string;
  button?: { label: string; href: string } | null;
  brand: DemoEmailBrand;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/**
 * Black or white, whichever can be read on the business's colour.
 *
 * The WCAG relative-luminance formula rather than an eyeball. A mid green and a
 * mid blue look equally dark and are not — and the header bar is whatever
 * colour somebody chose for that variant, so this is the only thing standing
 * between a business name and an unreadable one.
 */
export function readableOn(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;

  const channel = (at: number) => {
    const value = Number.parseInt(full.slice(at, at + 2), 16);
    const v = (Number.isNaN(value) ? 128 : value) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);

  return luminance > 0.179 ? "#111111" : "#ffffff";
}

export function renderDemoEmail(options: DemoEmailOptions): string {
  const { brand } = options;
  const onAccent = readableOn(brand.accent);

  const rows = (options.rows ?? [])
    .map(
      ([label, value], index) => `
      <tr>
        <td class="stack" style="padding:${index === 0 ? "0" : "10px"} 16px 0 0;font:400 13px/1.5 ${FONT};color:${SUBTLE};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
        <td class="stack" style="padding:${index === 0 ? "0" : "10px"} 0 0 0;font:600 14px/1.5 ${FONT};color:${TEXT};vertical-align:top">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  const quote = options.quote
    ? `<tr><td style="padding:26px 0 0 0">
        <p style="margin:0 0 6px;font:400 13px/1.5 ${FONT};color:${SUBTLE}">${escapeHtml(options.quote.label)}</p>
        <div style="margin:0;padding:14px 16px;background:${PAGE_BG};border-left:3px solid ${brand.accent};border-radius:6px;font:400 14px/1.65 ${FONT};color:${TEXT}">${withBreaks(options.quote.body)}</div>
      </td></tr>`
    : "";

  const button = options.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px">
        <tr>
          <td align="center" style="background:${brand.accent};border-radius:8px">
            <a href="${escapeHtml(options.button.href)}" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${FONT};color:${onAccent};text-decoration:none">${escapeHtml(options.button.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const contact = [brand.phone, brand.email].filter(Boolean).map((one) => escapeHtml(one as string)).join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(options.heading)}</title>
<style>
  /* The only rule that cannot be inlined. A client that strips it falls back to
     the two-column table, which stays readable to about 320px. */
  @media only screen and (max-width:480px) {
    .wrap { padding: 16px 12px !important; }
    .card-pad { padding: 24px 20px !important; }
    .stack { display: block !important; width: 100% !important; padding-right: 0 !important; white-space: normal !important; }
    .stack + .stack { padding-top: 2px !important; }
    .h1 { font-size: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};-webkit-font-smoothing:antialiased">

<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(options.preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG}">
  <tr>
    <td class="wrap" align="center" style="padding:32px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate">

        <tr>
          <td align="center" style="background:${brand.accent};border-radius:12px 12px 0 0;padding:26px 24px">
            <p style="margin:0;font:700 20px/1.3 ${FONT};color:${onAccent};letter-spacing:-0.01em">${escapeHtml(brand.businessName)}</p>
          </td>
        </tr>

        <tr>
          <td class="card-pad" style="background:${CARD_BG};border:1px solid ${BORDER};border-top:0;border-radius:0 0 12px 12px;padding:32px 32px 28px">
            <h1 class="h1" style="margin:0;font:600 22px/1.3 ${FONT};color:${TEXT}">${escapeHtml(options.heading)}</h1>
            ${options.intro ? `<p style="margin:10px 0 0;font:400 15px/1.6 ${FONT};color:${MUTED}">${escapeHtml(options.intro)}</p>` : ""}

            ${button}

            ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;border-top:1px solid ${BORDER}"><tr><td colspan="2" style="height:20px;line-height:20px;font-size:0">&nbsp;</td></tr>${rows}</table>` : ""}
            ${quote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${quote}</table>` : ""}

            ${options.note ? `<p style="margin:26px 0 0;padding-top:20px;border-top:1px solid ${BORDER};font:400 12px/1.6 ${FONT};color:${SUBTLE}">${escapeHtml(options.note)}</p>` : ""}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:22px 24px 6px">
            <p style="margin:0;font:600 13px/1.5 ${FONT};color:${TEXT}">${escapeHtml(brand.businessName)}</p>
            ${brand.address ? `<p style="margin:6px 0 0;font:400 12px/1.6 ${FONT};color:${SUBTLE}">${escapeHtml(brand.address)}</p>` : ""}
            ${contact ? `<p style="margin:6px 0 0;font:400 12px/1.6 ${FONT};color:${SUBTLE}">${contact}</p>` : ""}
          </td>
        </tr>

        <!-- The one line that is ours. Small, and never left out: a real-looking
             message from a business that does not exist is not a thing to send
             anybody. -->
        <tr>
          <td align="center" style="padding:14px 24px 0">
            <p style="margin:0;font:400 11px/1.6 ${FONT};color:${SUBTLE}">
              This is a demonstration website built by Apka Vission. ${escapeHtml(brand.businessName)} is an example business.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
