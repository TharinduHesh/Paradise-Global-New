import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import builtInHeroImage from '../../Blue Hour Villa on Sri Lanka’s Coast.png';
import { usePageImage } from '../../lib/siteContent';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  const heroImage = usePageImage('home', 'hero') || builtInHeroImage;
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Parallax */}
      <div
        ref={heroRef}
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{
          backgroundImage: `url("${heroImage}")`,
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/55 via-navy-900/25 to-transparent" />

      {/* Gold accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-gradient opacity-70" />

      {/* Content */}
      <div className="relative container-custom py-32 lg:py-40">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <div className="h-px w-12 bg-gold-400" />
            <p className="text-gold-400 text-sm font-medium uppercase tracking-[0.2em]">
              {t('home.eyebrow')}
            </p>
          </div>

          {/* Main heading */}
          <h1 className="font-serif text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-4 animate-fade-up">
            {t('home.title')}
          </h1>

          {/* Tagline */}
          <p className="text-white/90 text-xl md:text-2xl font-serif italic mb-6 animate-fade-up animate-delay-100">
            {t('home.tagline')}
          </p>

          {/* Description */}
          <p className="text-white/70 text-base md:text-lg leading-relaxed mb-10 max-w-2xl animate-fade-up animate-delay-200">
            {t('home.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up animate-delay-300">
            <Link
              to="/properties"
              className="btn-primary text-base px-8 py-4 group"
            >
              {t('home.explore')}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="btn-outline text-base px-8 py-4"
            >
              {t('home.consultation')}
            </Link>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-white/20 animate-fade-up animate-delay-400">
            {[
              { value: '150+', label: t('home.managed') },
              { value: '8', label: t('home.destinations') },
              { value: '10+', label: t('home.experience') },
              { value: '98%', label: t('home.satisfaction') },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-serif text-gold-400 text-3xl font-bold">{value}</p>
                <p className="text-white/60 text-sm mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-gold-400 transition-colors animate-bounce"
        aria-label={t('common.scrollDown')}
      >
        <span className="text-xs uppercase tracking-widest">{t('common.scrollDown')}</span>
        <ChevronDown size={20} />
      </button>
    </section>
  );
};

export default Hero;
