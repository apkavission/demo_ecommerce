import { describe, expect, it } from "vitest";
import { readableOn, renderDemoEmail } from "@/lib/email/layout";

/**
 * The frame an email from this demonstration business is rendered into.
 *
 * ---------------------------------------------------------------------------
 * **The header is coloured by data, and that is the whole risk.**
 *
 * Every other email in this estate has a fixed dark bar with a known logo on
 * it. This one takes whatever accent the variant carries and sets the business
 * name on it — so a pale yellow shop would put white type on white unless
 * something works out which way round to go. That calculation is what these
 * pin; a screenshot of one variant would agree with itself and say nothing
 * about the next.
 */

const BRAND = {
  businessName: "Saffron & Smoke",
  accent: "#0f766e",
  phone: "+91 98765 43210",
  email: "hello@saffron.test",
  address: "12 Main Road, Ranchi",
  siteUrl: "http://localhost:3000",
};

describe("readableOn", () => {
  it("puts white on a dark colour and black on a light one", () => {
    expect(readableOn("#0f766e")).toBe("#ffffff");
    expect(readableOn("#fde68a")).toBe("#111111");
  });

  it("tells apart two colours that look equally dark", () => {
    /* The case the eye gets wrong. A mid green and a mid blue read as the same
       darkness; white type is comfortable on one and marginal on the other. */
    expect(readableOn("#22c55e")).toBe("#111111");
    expect(readableOn("#2563eb")).toBe("#ffffff");
  });

  it("answers something readable for a colour it cannot parse", () => {
    /* A variant with a half-written accent must not produce an invisible
       business name. Mid grey takes white, which is the safer of the two. */
    expect(["#ffffff", "#111111"]).toContain(readableOn("not-a-colour"));
  });
});

describe("renderDemoEmail", () => {
  it("is branded as the business, not as us", () => {
    const html = renderDemoEmail({
      preheader: "We have your request",
      heading: "Your request is with us",
      brand: BRAND,
    });

    /* The name, twice: the header bar and the footer. Escaped, because this one
       has an ampersand in it. */
    expect(html.match(/Saffron &amp; Smoke/g)?.length).toBeGreaterThanOrEqual(2);

    /* Its colour, on the bar. */
    expect(html).toContain("background:#0f766e;border-radius:12px 12px 0 0");
  });

  it("always says it is a demonstration", () => {
    /*
      Never optional. A real-looking message from a business that does not exist
      is not a thing to send anybody, and the line is the difference between a
      demonstration and a deception.
    */
    const html = renderDemoEmail({
      preheader: "x",
      heading: "y",
      brand: BRAND,
    });

    expect(html).toContain("demonstration website built by Apka Vission");
  });

  it("puts what somebody typed through the escaper", () => {
    const html = renderDemoEmail({
      preheader: "x",
      heading: "y",
      rows: [["Name", `<script>alert(1)</script>`]],
      quote: { label: "What you told us", body: `a "quote" & an <angle>` },
      brand: BRAND,
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;quote&quot;");
  });

  it("keeps the shape of what they typed", () => {
    /* Somebody who pressed return between two thoughts meant to. */
    const html = renderDemoEmail({
      preheader: "x",
      heading: "y",
      quote: { label: "What you told us", body: "First line\nSecond line" },
      brand: BRAND,
    });

    expect(html).toContain("First line<br>Second line");
  });

  it("has one media query, and it stacks the rows", () => {
    /* The rows are label and value in two hard columns. On a phone — where most
       of these are read — they have to stack or the value squeezes to nothing. */
    const html = renderDemoEmail({
      preheader: "x",
      heading: "y",
      rows: [["Day", "2026-09-12"]],
      brand: BRAND,
    });

    expect(html.match(/@media/g)).toHaveLength(1);
    expect(html).toContain("max-width:480px");
    expect(html).toContain('class="stack"');
  });

  it("still lays out with the style block thrown away", () => {
    /* Several clients strip `<style>`. The layout is tables, so it must survive
       having no CSS at all beyond what is inline. */
    const html = renderDemoEmail({
      preheader: "x",
      heading: "Your request is with us",
      rows: [["Day", "2026-09-12"]],
      brand: BRAND,
    });

    const stripped = html.replace(/<style>[\s\S]*?<\/style>/, "");

    expect(stripped).toContain("2026-09-12");
    expect(stripped).toContain('role="presentation"');
  });

  it("leaves out every optional part that was not given", () => {
    /* An empty quoted box or a bare rule reads as a message somebody forgot to
       finish. */
    const html = renderDemoEmail({ preheader: "x", heading: "y", brand: BRAND });

    expect(html).not.toContain('class="stack"');
    expect(html).not.toContain("What you told us");
  });

  it("escapes what it puts in an attribute", () => {
    const html = renderDemoEmail({
      preheader: "x",
      heading: "y",
      button: { label: "Open", href: `https://x.test/?a="onload="alert(1)` },
      brand: BRAND,
    });

    expect(html).not.toContain(`"onload="`);
  });
});
