import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import builtInHeroImage from '../../Blue Hour Villa on Sri Lanka’s Coast.png';
import { usePageImage } from '../../lib/siteContent';
import { EASE_INOUT, EASE_LUXE, isRtl, luxe } from '../../lib/motion';
import { useIntroDone } from '../motion/intro';
import { Counter, Magnetic, SplitWords } from '../motion/primitives';

/*
 * Entrance choreography (seconds after the page is ready):
 *   0.15  gold sliver sweeps across on a diagonal, the photograph follows it in and eases out of a zoom
 *   0.60  eyebrow rule draws, heading rises word by word
 *   0.85  tagline, description, buttons and stats lift into place
 * Afterwards the photo keeps a slow Ken Burns drift, and the whole hero parallaxes as you scroll away.
 */

const BASE_DELAY = 0.15;

// Diagonal wipe, mirrored for right-to-left reading.
const diagonal = (rtl: boolean) => rtl
  ? { hidden: 'polygon(100% 0%, 100% 0%, 125% 100%, 125% 100%)', shown: 'polygon(100% 0%, -25% 0%, 0% 100%, 125% 100%)' }
  : { hidden: 'polygon(0% 0%, 0% 0%, -25% 100%, -25% 100%)', shown: 'polygon(0% 0%, 125% 0%, 100% 100%, -25% 100%)' };

const rise = (delay: number) => ({
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: luxe(0.9, BASE_DELAY + delay) },
});

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const heroImage = usePageImage('home', 'hero') || builtInHeroImage;
  const ready = useIntroDone();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const play = ready ? 'visible' : 'hidden';
  const sweep = diagonal(isRtl());
  const wipe = reduce ? { hidden: sweep.shown, shown: sweep.shown } : sweep; // no sweeping edge for reduced motion

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: reduce ? 'auto' : 'smooth' });
  };

  const stats = [
    { value: '150+', label: t('home.managed') },
    { value: '8', label: t('home.destinations') },
    { value: '10+', label: t('home.experience') },
    { value: '98%', label: t('home.satisfaction') },
  ];

  return (
    <section ref={sectionRef} data-motion="manual" className="relative min-h-screen flex items-center overflow-hidden bg-navy-950">
      {/* Background: parallax layer → diagonal reveal → entrance zoom → endless Ken Burns drift */}
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: reduce ? 0 : backgroundY }}>
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-gold-gradient"
          initial={{ clipPath: wipe.hidden }}
          animate={ready ? { clipPath: wipe.shown } : undefined}
          transition={{ duration: 1.5, ease: EASE_INOUT, delay: BASE_DELAY }}
        />
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={{ clipPath: wipe.hidden }}
          animate={ready ? { clipPath: wipe.shown } : undefined}
          transition={{ duration: 1.5, ease: EASE_INOUT, delay: BASE_DELAY + 0.12 }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.25 }}
            animate={ready ? { scale: 1 } : undefined}
            transition={{ duration: 2.8, ease: EASE_LUXE, delay: BASE_DELAY }}
          >
            <div className="hero-kenburns absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${heroImage}")` }} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Gradient Overlay */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 1.4, delay: BASE_DELAY + 0.6 }}
      >
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/55 via-navy-900/25 to-transparent rtl:bg-gradient-to-l" />
      </motion.div>

      {/* Gold accent line */}
      <motion.div
        aria-hidden="true"
        className="absolute start-0 top-0 bottom-0 w-1 origin-top bg-gold-gradient opacity-70"
        initial={{ scaleY: 0 }}
        animate={ready ? { scaleY: 1 } : undefined}
        transition={{ duration: 1.4, ease: EASE_LUXE, delay: BASE_DELAY + 0.5 }}
      />

      {/* Content */}
      <motion.div className="relative container-custom w-full py-32 lg:py-40" style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}>
        <motion.div className="max-w-3xl" initial="hidden" animate={play}>
          {/* Eyebrow */}
          <motion.div className="flex items-center gap-3 mb-6" variants={rise(0.35)}>
            <motion.span
              aria-hidden="true"
              className="block h-px w-12 origin-left bg-gold-400 rtl:origin-right"
              variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: luxe(1, BASE_DELAY + 0.45) } }}
            />
            <p className="text-gold-400 text-sm font-medium uppercase tracking-[0.2em]">
              {t('home.eyebrow')}
            </p>
          </motion.div>

          {/* Main heading — words rise from behind a mask */}
          <h1 className="font-serif text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-4">
            <SplitWords text={t('home.title')} play={ready} delay={BASE_DELAY + 0.45} stagger={0.09} />
          </h1>

          {/* Tagline */}
          <motion.p className="text-white/90 text-xl md:text-2xl font-serif italic mb-6" variants={rise(0.85)}>
            {t('home.tagline')}
          </motion.p>

          {/* Description */}
          <motion.p className="text-white/70 text-base md:text-lg leading-relaxed mb-10 max-w-2xl" variants={rise(0.95)}>
            {t('home.description')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="flex flex-col sm:flex-row gap-4" variants={rise(1.05)}>
            <Magnetic className="flex sm:inline-flex">
              <Link to="/properties" className="btn-primary flex-1 justify-center text-base px-8 py-4">
                {t('home.explore')}
                <ArrowRight size={18} />
              </Link>
            </Magnetic>
            <Magnetic className="flex sm:inline-flex">
              <Link to="/contact" className="btn-outline flex-1 justify-center text-base px-8 py-4">
                {t('home.consultation')}
              </Link>
            </Magnetic>
          </motion.div>

          {/* Stats Row */}
          <motion.div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-white/20" variants={rise(1.15)}>
            {stats.map(({ value, label }) => (
              <div key={value}>
                <p className="font-serif text-gold-400 text-3xl font-bold"><Counter value={value} /></p>
                <p className="text-white/60 text-sm mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue: a gold bead travels down a fine line */}
      <motion.button
        type="button"
        onClick={scrollToContent}
        className="group absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/55 hover:text-gold-400 transition-colors"
        aria-label={t('common.scrollDown')}
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: BASE_DELAY + 1.6 }}
      >
        <span className="text-[11px] uppercase tracking-[0.3em]">{t('common.scrollDown')}</span>
        <span aria-hidden="true" className="scroll-cue relative block h-12 w-px overflow-hidden bg-white/20" />
      </motion.button>
    </section>
  );
};

export default Hero;
