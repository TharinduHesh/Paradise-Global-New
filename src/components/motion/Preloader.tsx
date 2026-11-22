import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_INOUT, EASE_LUXE } from '../../lib/motion';
import { introPending, markIntroDone, rememberIntroSeen } from './intro';

const MIN_VISIBLE_MS = 1600; // long enough for the logo reveal to read
const MAX_VISIBLE_MS = 3200; // never hold visitors back on a slow connection
const WORDMARK = 'PARADISE GLOBAL LEISURES';

/**
 * Branded loading screen, shown once per session on the first public page view. The logo is revealed
 * through an opening iris, the wordmark settles in, and the whole panel lifts away like a curtain while
 * the page underneath starts its own entrance.
 */
const Preloader: React.FC = () => {
  const [visible, setVisible] = useState(introPending);

  useEffect(() => {
    if (!introPending) return;
    rememberIntroSeen();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const started = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setVisible(false);
      markIntroDone(); // the page starts its entrance while the curtain lifts
      root.style.overflow = previousOverflow;
    };
    const finishAfterMinimum = () => {
      window.setTimeout(finish, Math.max(0, MIN_VISIBLE_MS - (performance.now() - started)));
    };

    const fallback = window.setTimeout(finish, MAX_VISIBLE_MS);
    if (document.readyState === 'complete') finishAfterMinimum();
    else window.addEventListener('load', finishAfterMinimum, { once: true });

    // Only tidy up here: StrictMode runs this effect twice in development, and a real unmount means
    // the site itself went away (e.g. the maintenance page took over).
    return () => {
      finished = true;
      window.clearTimeout(fallback);
      window.removeEventListener('load', finishAfterMinimum);
      root.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          role="status"
          aria-live="polite"
          aria-label="Loading Paradise Global Leisures"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-navy-950"
          exit={{ y: '-100%', transition: { duration: 1, ease: EASE_INOUT } }}
        >
          {/* Soft gold glow behind the mark */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-gold-500/10 blur-3xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: EASE_LUXE }}
          />

          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.img
              src="/logo.png?v=gold"
              alt=""
              width={768}
              height={809}
              className="h-28 w-auto sm:h-36"
              initial={{ clipPath: 'circle(0% at 50% 50%)', scale: 1.18, filter: 'blur(6px)' }}
              animate={{ clipPath: 'circle(75% at 50% 50%)', scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.4, ease: EASE_LUXE, delay: 0.15 }}
            />

            <motion.p
              aria-hidden="true"
              className="mt-7 whitespace-nowrap font-serif text-[11px] font-medium text-white/85 sm:text-sm"
              initial={{ opacity: 0, letterSpacing: '0.7em' }}
              animate={{ opacity: 1, letterSpacing: '0.38em' }}
              transition={{ duration: 1.6, ease: EASE_LUXE, delay: 0.55 }}
            >
              {WORDMARK}
            </motion.p>

            {/* Progress hairline */}
            <div aria-hidden="true" className="mt-6 h-px w-40 overflow-hidden bg-white/10 sm:w-56">
              <motion.div
                className="h-full w-full origin-left bg-gold-gradient"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: MIN_VISIBLE_MS / 1000, ease: EASE_INOUT, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Gold edge that trails the curtain as it lifts */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gold-gradient opacity-70" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
