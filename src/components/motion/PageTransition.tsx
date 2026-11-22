import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE_INOUT, EASE_LUXE } from '../../lib/motion';
import { useAutoReveal } from './useAutoReveal';

/*
 * Cinematic page change: the old page sinks back and fades while a navy curtain with a gold leading edge
 * sweeps up over it; the curtain then lifts away and the new page settles in from a gentle zoom.
 * About 0.85s end to end. The navbar stays above the curtain. Reduced motion gets a plain crossfade.
 */

const CURTAIN_MS = 850;

const pageVariants = {
  initial: { opacity: 0, y: 28, scale: 1.02 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE_LUXE, delay: 0.32 } },
  exit: { opacity: 0, y: -18, scale: 0.985, transition: { duration: 0.32, ease: EASE_INOUT } },
};

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useAutoReveal(ref);
  return (
    <motion.div
      ref={ref}
      data-page=""
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ transformOrigin: '50% 40vh' }}
    >
      {children}
    </motion.div>
  );
};

const RouteCurtain: React.FC = () => (
  <motion.div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-40 bg-navy-950"
    initial={{ y: '100%' }}
    animate={{ y: ['100%', '0%', '0%', '-100%'] }}
    transition={{ duration: CURTAIN_MS / 1000, times: [0, 0.38, 0.48, 1], ease: [EASE_INOUT, 'linear', EASE_INOUT] }}
  >
    <div className="absolute inset-x-0 top-0 h-[2px] bg-gold-gradient shadow-gold" />
    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gold-gradient shadow-gold" />
    <motion.img
      src="/logo.png?v=gold"
      alt=""
      className="absolute left-1/2 top-1/2 h-16 w-auto -translate-x-1/2 -translate-y-1/2 opacity-0"
      animate={{ opacity: [0, 0, 0.9, 0] }}
      transition={{ duration: CURTAIN_MS / 1000, times: [0, 0.3, 0.45, 0.62] }}
    />
  </motion.div>
);

/** Wraps the routed page. `routeKey` changes per page (the pathname). */
const PageTransition: React.FC<{ routeKey: string; children: React.ReactNode }> = ({ routeKey, children }) => {
  const reduce = useReducedMotion();
  // The first page view has its own entrance (loading screen / hero), so the curtain only plays on navigation.
  const [first, setFirst] = useState(routeKey);
  const [navigations, setNavigations] = useState(0);
  if (first !== routeKey) {
    setFirst(routeKey);
    setNavigations((count) => count + 1);
  }

  return (
    <>
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
      >
        <PageShell key={routeKey}>{children}</PageShell>
      </AnimatePresence>
      {navigations > 0 && !reduce && <RouteCurtain key={navigations} />}
    </>
  );
};

export default PageTransition;
