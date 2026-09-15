"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The three pieces of motion that need a browser.
 *
 * ---------------------------------------------------------------------------
 * **Everything else on this site animates in CSS**, and that is the right
 * default: the reveals are a class the layout's inline script adds before first
 * paint, the entrances are keyframes, and neither ships a byte of React. These
 * three cannot be done that way — a scrollbar's position, a number counting to
 * itself, and the pointer's coordinates are not things a stylesheet can know.
 *
 * ---------------------------------------------------------------------------
 * **Each one is dead weight rather than a dependency.** The progress line is
 * `aria-hidden` and decorative; the counter renders its final value on the
 * server and only *then* counts; the spotlight sets two custom properties that
 * default to something sensible. Turn JavaScript off and the site is the same
 * site with less light in it — which is the standing rule here, because a page
 * that needs script to be readable fails worst for the people least able to
 * work around it.
 *
 * ---------------------------------------------------------------------------
 * **And all three stand down for reduced motion.** Not "run faster" — stand
 * down. The blanket CSS rule cannot reach a `requestAnimationFrame` loop, so
 * each of these asks the question itself.
 */

/** Whether this browser has been asked to stop moving things. */
function wantsStillness(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * How far down the page the reader has got.
 *
 * Two pixels of accent across the very top, scaled by the fraction scrolled.
 * Written to a custom property rather than to `style.width`, so the paint is a
 * transform on the compositor and the line cannot cause a layout on every
 * frame of a scroll.
 *
 * Read inside `requestAnimationFrame` because `scrollY` and `scrollHeight` are
 * both layout reads: doing them in the scroll handler itself is the textbook
 * way to make a smooth page stutter on a cheap laptop, which is what a
 * prospect is holding.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wantsStillness()) return;

    let frame = 0;

    const paint = () => {
      frame = 0;
      const element = bar.current;
      if (!element) return;

      const root = document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;

      /* A page shorter than the window has nothing to report, and dividing by
         zero here would paint a full bar on every short page. */
      const fraction = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;

      element.style.setProperty("--progress", String(fraction));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div ref={bar} className="progress" aria-hidden />;
}

/**
 * A number that counts up to itself, once, when it is reached.
 *
 * ---------------------------------------------------------------------------
 * **The final value is what the server renders**, and that is the whole safety
 * of this component. The markup that arrives says "14"; the count is something
 * that happens to it afterwards if a browser is willing. A counter written the
 * other way round — starting at zero and depending on script to arrive at the
 * truth — prints "0 years of experience" to every crawler, every reader with
 * JavaScript off, and everybody whose bundle failed, and it looks correct in
 * the only browser it was tested in.
 *
 * **It counts when it is seen, not when it mounts.** The statistics on the
 * first screen are usually already in view, in which case the observer fires
 * immediately; on a phone, where they sit below the fold, counting on mount
 * would mean the movement was over before anybody scrolled to it.
 */
export function Counter({
  value,
  suffix = "",
  duration = 1100,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element || wantsStillness() || value <= 0) return;

    let frame = 0;
    let started = false;

    const run = () => {
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);

        /* Fast at the start and settling at the end, which is how a mechanical
           counter behaves and why this reads as a dial rather than as a linear
           interpolation. */
        const eased = 1 - Math.pow(1 - progress, 3);

        setShown(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(step);
      };

      frame = requestAnimationFrame(step);
    };

    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started) continue;
          started = true;
          seen.disconnect();
          setShown(0);
          run();
        }
      },
      { threshold: 0.4 },
    );

    seen.observe(element);

    return () => {
      seen.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={host} className="figure">
      {shown}
      {suffix}
    </span>
  );
}

/**
 * The accent, pooled under the pointer, in whichever card it is over.
 *
 * ---------------------------------------------------------------------------
 * **One listener for a whole grid, not one per card.** Six service cards with
 * six `pointermove` handlers is six React subscriptions and six closures for an
 * effect that is two numbers; this listens on the grid and writes the
 * coordinates onto whichever `.spot` the event came from. A row of twenty
 * cards costs exactly what a row of three does.
 *
 * **Coordinates as percentages of the card**, so the gradient does not have to
 * know how wide the card is, and a card that reflows to one column on a phone
 * needs nothing recalculated.
 *
 * **Nothing happens without a fine pointer.** On a touch screen the pool would
 * appear where the last tap landed and stay there after the finger had gone,
 * which reads as a rendering fault rather than as a highlight. The stylesheet
 * refuses it too; this refuses to do the work in the first place.
 */
export function Spotlight({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;

  /**
   * What the wrapper actually is.
   *
   * Every grid this is used on is a list of things — six treatments, nine
   * people, nine reviews — and a list of things is a `<ul>`. Wrapping the list
   * in a `<div>` to hang a listener on it would either break the grid or put a
   * non-`<li>` between the list and its items, which a screen reader announces
   * as a list with one item in it.
   */
  as?: "div" | "ul";
}) {
  const host = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (wantsStillness()) return;

    const onMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>(".spot");
      if (!card || !element.contains(card)) return;

      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((event.clientX - box.left) / box.width) * 100}%`);
      card.style.setProperty("--my", `${((event.clientY - box.top) / box.height) * 100}%`);
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    return () => element.removeEventListener("pointermove", onMove);
  }, []);

  const Tag = as;

  return (
    <Tag ref={host as React.Ref<HTMLDivElement & HTMLUListElement>} className={className}>
      {children}
    </Tag>
  );
}
