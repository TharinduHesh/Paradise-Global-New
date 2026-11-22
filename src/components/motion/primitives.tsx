import React, { useEffect, useRef, useState } from 'react';
import {
  animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from 'motion/react';
import {
  DURATION, EASE_INOUT, EASE_LUXE, STAGGER, VIEWPORT, isRtl, luxe, revealVariants, staggerContainer,
  type RevealVariant,
} from '../../lib/motion';
import { useIntroDone } from './intro';

/*
 * Reusable motion building blocks. Everything here marks itself `data-motion="manual"` so the
 * page-wide auto reveal (useAutoReveal) leaves it alone, and all of it settles to a static,
 * fully visible state for visitors who prefer reduced motion (see MotionConfig in Layout).
 */

type DivProps = { children?: React.ReactNode; className?: string; style?: React.CSSProperties };

/** Fades/slides its content in the first time it scrolls into view. `delay` is in milliseconds. */
export const Reveal: React.FC<DivProps & { delay?: number; variant?: RevealVariant; duration?: number }> = ({
  children, className, style, delay = 0, variant = 'up', duration = DURATION.base,
}) => {
  const ready = useIntroDone();
  const variants = revealVariants(variant, duration, delay / 1000);
  return (
    <motion.div
      data-motion="manual"
      className={className}
      style={style}
      initial="hidden"
      whileInView={ready ? 'visible' : undefined}
      viewport={VIEWPORT}
      variants={variants}
    >
      {children}
    </motion.div>
  );
};

/** Parent for a staggered group: children wrapped in <StaggerItem> enter one after another. */
export const Stagger: React.FC<DivProps & { stagger?: number; delay?: number; as?: 'div' | 'ul' }> = ({
  children, className, style, stagger = STAGGER, delay = 0, as = 'div',
}) => {
  const ready = useIntroDone();
  const Component = as === 'ul' ? motion.ul : motion.div;
  return (
    <Component
      data-motion="manual"
      className={className}
      style={style}
      initial="hidden"
      whileInView={ready ? 'visible' : undefined}
      viewport={VIEWPORT}
      variants={staggerContainer(stagger, delay)}
    >
      {children}
    </Component>
  );
};

export const StaggerItem: React.FC<DivProps & { variant?: RevealVariant; as?: 'div' | 'li' }> = ({
  children, className, style, variant = 'up', as = 'div',
}) => {
  const Component = as === 'li' ? motion.li : motion.div;
  return <Component className={className} style={style} variants={revealVariants(variant)}>{children}</Component>;
};

const clipFrom = (direction: 'up' | 'left' | 'right') => {
  if (direction === 'left') return isRtl() ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
  if (direction === 'right') return isRtl() ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)';
  return 'inset(100% 0% 0% 0%)';
};

/**
 * Architectural image reveal: the frame wipes open while the photo inside settles from a slight zoom.
 * `className` sizes the frame; `imgClassName` styles the image.
 */
export const RevealImage: React.FC<{
  src: string; alt: string; className?: string; imgClassName?: string;
  direction?: 'up' | 'left' | 'right'; delay?: number; children?: React.ReactNode;
}> = ({ src, alt, className = '', imgClassName = '', direction = 'up', delay = 0, children }) => {
  const ready = useIntroDone();
  // The in-view trigger sits on an unclipped outer frame: a fully clipped element never counts as visible.
  return (
    <motion.div
      data-motion="manual"
      className={`relative ${className}`}
      initial="hidden"
      whileInView={ready ? 'visible' : undefined}
      viewport={VIEWPORT}
    >
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[inherit]"
      variants={{
        hidden: { clipPath: clipFrom(direction) },
        visible: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: DURATION.slow + 0.2, ease: EASE_INOUT, ...(delay ? { delay } : {}) } },
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${imgClassName}`}
        variants={{
          hidden: { scale: 1.25 },
          visible: { scale: 1, transition: { duration: DURATION.cinematic, ease: EASE_LUXE, ...(delay ? { delay } : {}) } },
        }}
      />
      {children}
    </motion.div>
    </motion.div>
  );
};

/**
 * Background image that drifts slower than the page as it scrolls past. Fills its positioned parent.
 * `speed` is the share of the element's height it travels (0.15 = ±15%).
 */
export const ParallaxBackground: React.FC<{ src: string; speed?: number; className?: string }> = ({
  src, speed = 0.15, className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);
  return (
    <div ref={ref} aria-hidden="true" className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-x-0 bg-cover bg-center will-change-transform"
        style={{
          backgroundImage: `url("${src}")`,
          top: `${-speed * 100}%`,
          bottom: `${-speed * 100}%`,
          y: reduce ? 0 : y,
        }}
      />
    </div>
  );
};

const NUMBER_PATTERN = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/**
 * Counts a statistic up from zero when it scrolls into view ("150+", "98%", "$2.5M"). Screen readers and
 * search engines get the final value straight away; values that aren't numeric are shown as-is.
 */
const parseStat = (value: string) => {
  const match = value.match(NUMBER_PATTERN);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const target = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(target) || target <= 0) return null;
  const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
  const grouped = digits.includes(',');
  return (progress: number) => {
    const fixed = (target * progress).toFixed(decimals);
    const shown = grouped ? Number(fixed).toLocaleString('en-US', { minimumFractionDigits: decimals }) : fixed;
    return `${prefix}${shown}${suffix}`;
  };
};

export const Counter: React.FC<{ value: string; className?: string; duration?: number }> = ({ value, className, duration = 2.2 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const ready = useIntroDone();
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const render = parseStat(value);
  const animatable = render !== null && !reduce;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!animatable || !inView || !ready) return;
    const controls = animate(0, 1, { duration, ease: EASE_LUXE, onUpdate: setProgress });
    return () => controls.stop();
  }, [animatable, inView, ready, duration]);

  const display = animatable ? render(progress) : value;

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="tabular-nums">{display}</span>
    </span>
  );
};

/**
 * Splits a heading into words that rise from behind a mask one after another. The words stay real text
 * separated by spaces, so screen readers and search engines read the heading normally.
 */
export const SplitWords: React.FC<{ text: string; className?: string; stagger?: number; delay?: number; play?: boolean }> = ({
  text, className = '', stagger = 0.08, delay = 0, play = true,
}) => {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate={play ? 'visible' : 'hidden'}
      variants={staggerContainer(stagger, delay)}
    >
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <motion.span
              className="inline-block will-change-transform"
              variants={{
                hidden: { y: '110%', rotate: 4 },
                visible: { y: '0%', rotate: 0, transition: luxe(1.1) },
              }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </motion.span>
  );
};

const finePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/**
 * Lets a call-to-action lean gently toward the cursor. Only active on devices with a precise pointer;
 * on touch screens and with reduced motion it renders as a plain wrapper.
 */
export const Magnetic: React.FC<{ children: React.ReactNode; strength?: number; className?: string }> = ({
  children, strength = 0.28, className = 'inline-flex',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const enabled = !reduce && finePointer();

  const onMove = (event: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!enabled || !rect) return;
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={enabled ? { x: springX, y: springY } : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
};
