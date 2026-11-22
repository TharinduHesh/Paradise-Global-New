import { useLayoutEffect, type RefObject } from 'react';
import { isIntroDone, subscribeIntro } from './intro';

/*
 * Page-wide scroll reveal, so every page (including CMS-driven ones) gets the same entrance language
 * without hand-wiring each block:
 *
 *  - the page header (first block holding the <h1>) is tagged `data-page-header`; CSS plays its entrance.
 *  - each direct child of a `.container-custom` fades up as it enters the viewport; grids reveal their
 *    items individually, and items that enter together are staggered.
 *  - large photographs (300px+ tall) get an architectural clip reveal.
 *
 * Anything inside `[data-motion="manual"]` is animated by its own component and skipped here.
 * State lives in data attributes (React never touches those), and they are removed once an element has
 * settled so its own hover transitions take over again. Nothing is hidden for visitors who prefer
 * reduced motion, or when IntersectionObserver is unavailable.
 */

const STAGGER_MS = 90;
const MAX_STAGGER_STEPS = 6;
const SETTLE_MS = { item: 1000, image: 1700 };
const LARGE_IMAGE_PX = 300;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useAutoReveal(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined' || reducedMotion()) return;

    const timers = new Set<number>();
    // A clipped image has no visible area, so the observer would never fire for it: watch its frame instead.
    const watchedFor = new Map<Element, Element[]>();
    let waiting: Element[] = [];

    const settle = (element: HTMLElement) => {
      const isImage = element.hasAttribute('data-reveal-img');
      const delay = parseFloat(element.style.getPropertyValue('--reveal-delay')) || 0;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        element.removeAttribute('data-reveal');
        element.removeAttribute('data-reveal-img');
        element.removeAttribute('data-revealed');
        element.style.removeProperty('--reveal-delay');
      }, delay + (isImage ? SETTLE_MS.image : SETTLE_MS.item));
      timers.add(timer);
    };

    const show = (elements: Element[]) => {
      // Elements arriving together reveal in reading order, one step apart.
      elements
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach((element, index) => {
          const el = element as HTMLElement;
          el.style.setProperty('--reveal-delay', `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
          el.setAttribute('data-revealed', '');
          settle(el);
        });
    };

    const observer = new IntersectionObserver((entries) => {
      const sentinels = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
      if (!sentinels.length) return;
      sentinels.forEach((element) => observer.unobserve(element));
      const entering = sentinels.flatMap((sentinel) => watchedFor.get(sentinel) ?? [sentinel]);
      if (isIntroDone()) show(entering);
      else waiting.push(...entering); // hold until the loading screen has lifted
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    const unsubscribe = subscribeIntro(() => {
      show(waiting);
      waiting = [];
    });

    const isManual = (element: Element) => element.closest('[data-motion="manual"]') !== null;

    const tag = (element: Element, attribute: 'data-reveal' | 'data-reveal-img') => {
      if (element.hasAttribute('data-reveal') || element.hasAttribute('data-reveal-img') || isManual(element)) return;
      element.setAttribute(attribute, '');
      const sentinel = attribute === 'data-reveal-img' && element.parentElement ? element.parentElement : element;
      watchedFor.set(sentinel, [...(watchedFor.get(sentinel) ?? []), element]);
      observer.observe(sentinel);
    };

    const scanned = new WeakSet<Element>();
    let header: Element | null = null;

    const scan = () => {
      if (document.documentElement.hasAttribute('data-lang-settling')) return; // don't re-animate a language switch

      if (!header) {
        header = Array.from(root.children).find((child) => child.querySelector('h1')) ?? null;
        // Only treat it as a header when it is the navy page banner, not e.g. a 404 message.
        if (header && header.classList.contains('pt-32')) header.setAttribute('data-page-header', '');
        else header = null;
      }

      root.querySelectorAll('.container-custom').forEach((container) => {
        if (header?.contains(container) || isManual(container)) return;
        Array.from(container.children).forEach((child) => {
          if (scanned.has(child)) return;
          scanned.add(child);
          if (child.classList.contains('grid') && child.children.length > 1) {
            Array.from(child.children).forEach((item) => tag(item, 'data-reveal'));
          } else {
            tag(child, 'data-reveal');
          }
        });
      });

      root.querySelectorAll('img').forEach((image) => {
        if (scanned.has(image) || header?.contains(image)) return;
        if (image.offsetHeight < LARGE_IMAGE_PX) return; // re-checked on the next scan, e.g. once loaded
        scanned.add(image);
        tag(image, 'data-reveal-img');
      });
    };

    scan();

    // Content that arrives later (CMS data, filters) is picked up on the next frame.
    let frame = 0;
    const mutations = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; scan(); });
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      unsubscribe();
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      // Leave nothing hidden behind (and let a re-run, e.g. under StrictMode, tag afresh).
      root.querySelectorAll('[data-reveal], [data-reveal-img]').forEach((element) => {
        element.removeAttribute('data-reveal');
        element.removeAttribute('data-reveal-img');
        element.removeAttribute('data-revealed');
        (element as HTMLElement).style.removeProperty('--reveal-delay');
      });
    };
  }, [rootRef]);
}
