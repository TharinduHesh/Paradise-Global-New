import type { Transition, Variants } from 'motion/react';

/**
 * One motion language for the whole site. CSS animations in index.css use the same curves
 * (--ease-luxe / --ease-inout), so JS- and CSS-driven motion feel identical.
 */
export const EASE_LUXE = [0.22, 1, 0.36, 1] as const; // long, soft deceleration
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const; // curtains and wipes

export const DURATION = {
  fast: 0.35,
  base: 0.7,
  slow: 1.1,
  cinematic: 1.6,
} as const;

/** Delay between siblings in a staggered group. */
export const STAGGER = 0.09;

// Only set `delay` when asked: an explicit delay would override the stagger a parent passes down.
export const luxe = (duration: number = DURATION.base, delay = 0): Transition => (delay ? { duration, delay, ease: EASE_LUXE } : { duration, ease: EASE_LUXE });

/** Default "in view" settings: animate once, a little before the element is fully on screen. */
export const VIEWPORT = { once: true, amount: 0.15, margin: '0px 0px -8% 0px' } as const;

export type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';

const offsets: Record<RevealVariant, Record<string, number | string>> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: -48 },
  right: { x: 48 },
  fade: {},
  scale: { scale: 0.94 },
};

export const revealVariants = (variant: RevealVariant = 'up', duration: number = DURATION.base, delay = 0): Variants => ({
  hidden: { opacity: 0, ...offsets[variant] },
  visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: luxe(duration, delay) },
});

export const staggerContainer = (stagger = STAGGER, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

/** True when the document is laid out right-to-left (Hebrew). */
export const isRtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
