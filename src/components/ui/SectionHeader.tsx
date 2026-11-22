import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE_INOUT, VIEWPORT, isRtl, luxe, revealVariants, staggerContainer } from '../../lib/motion';
import { useIntroDone } from '../motion/intro';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
  className?: string;
}

// Title rises out of a mask; the gold rule draws in beneath it.
const titleMask = {
  hidden: { clipPath: 'inset(-10% -5% 110% -5%)', y: '35%' },
  visible: { clipPath: 'inset(-10% -5% -15% -5%)', y: '0%', transition: luxe(DURATION.slow) },
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  centered = false,
  light = false,
  className = '',
}) => {
  const ready = useIntroDone();
  const originX = centered ? 0.5 : isRtl() ? 1 : 0;
  return (
    <motion.div
      data-motion="manual"
      className={`${centered ? 'text-center' : ''} ${className}`}
      initial="hidden"
      whileInView={ready ? 'visible' : undefined}
      viewport={VIEWPORT}
      variants={staggerContainer(0.12)}
    >
      {eyebrow && (
        <motion.p className="text-gold-500 font-medium text-sm uppercase tracking-widest mb-2" variants={revealVariants('up', DURATION.base)}>
          {eyebrow}
        </motion.p>
      )}
      <h2 className={`font-serif text-3xl md:text-4xl font-bold leading-tight ${light ? 'text-white' : 'text-navy-900'}`}>
        <motion.span className="block" variants={titleMask}>{title}</motion.span>
      </h2>
      <motion.div
        className={centered ? 'gold-divider' : 'gold-divider-left'}
        style={{ originX }}
        variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE_INOUT } } }}
      />
      {subtitle && (
        <motion.p
          className={`mt-5 text-lg leading-relaxed max-w-2xl ${centered ? 'mx-auto' : ''} ${light ? 'text-white/70' : 'text-navy-600'}`}
          variants={revealVariants('up', DURATION.base)}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

export default SectionHeader;
