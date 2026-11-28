import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { StarDisplay } from './StarRating';
import type { PublicReview } from '../../lib/reviews';

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 40;

/** Reviews visible at once: three on desktop (≥1024px), two on tablets (≥768px), one on phones. */
const desktop = '(min-width: 1024px)';
const tablet = '(min-width: 768px)';
const subscribe = (onChange: () => void) => {
  const queries = [window.matchMedia(desktop), window.matchMedia(tablet)];
  queries.forEach((query) => query.addEventListener('change', onChange));
  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
};
const readPerView = () => (window.matchMedia(desktop).matches ? 3 : window.matchMedia(tablet).matches ? 2 : 1);
const usePerView = () => useSyncExternalStore(subscribe, readPerView, () => 3);

/** One review in the editorial style: gold quote mark, stars, italic text, a thin gold rule, name and country. */
const ReviewQuote: React.FC<{ review: PublicReview }> = ({ review }) => {
  const { t } = useTranslation();
  return (
    <figure className="flex h-full flex-col items-center px-4 text-center sm:px-8">
      <span aria-hidden="true" className="block h-10 select-none font-serif text-7xl font-bold leading-[0.9] text-gold-500">&ldquo;</span>
      <StarDisplay rating={review.rating} size="sm" label={t('reviews.outOf', { rating: review.rating })} className="mt-6" />
      <blockquote dir="auto" className="mt-5 line-clamp-6 text-lg italic leading-relaxed text-navy-800">{review.message}</blockquote>
      <span aria-hidden="true" className="mt-6 block h-px w-12 bg-gold-400" />
      <figcaption className="mt-5">
        <p dir="auto" className="text-lg font-semibold text-navy-900">{review.name}</p>
        {review.country && <p dir="auto" className="mt-1.5 text-sm text-gold-600">{review.country}</p>}
      </figcaption>
    </figure>
  );
};

/**
 * Accessible review carousel. Slides one review at a time, autoplays every six seconds and pauses while the pointer is
 * over it, while anything in it has keyboard focus and during a swipe. With reduced motion it neither autoplays nor
 * animates. When every review already fits on screen it shows them centred, without controls.
 */
const ReviewCarousel: React.FC<{ reviews: PublicReview[] }> = ({ reviews }) => {
  const { t, i18n } = useTranslation();
  const rtl = (i18n.resolvedLanguage ?? i18n.language) === 'he';
  const perView = usePerView();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const touchStart = useRef<number | null>(null);

  const positions = Math.max(1, reviews.length - perView + 1);
  const current = Math.min(index, positions - 1);
  const sliding = positions > 1;
  const paused = hovered || focused || swiping;

  const go = (next: number) => setIndex((next + positions) % positions);
  const previous = () => go(current - 1);
  const advance = () => go(current + 1);

  // Each change of slide restarts the timer, so a manual step always gets a full six seconds before the next one.
  useEffect(() => {
    if (!sliding || paused || reduceMotion) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (Math.min(value, positions - 1) + 1) % positions), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, sliding, paused, reduceMotion, positions]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!sliding) return;
    // Arrow keys follow the reading direction: in Hebrew, the left arrow moves forward.
    if (event.key === 'ArrowRight') { event.preventDefault(); if (rtl) previous(); else advance(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (rtl) advance(); else previous(); }
  };

  const onTouchStart = (event: React.TouchEvent) => { touchStart.current = event.touches[0].clientX; setSwiping(true); };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setSwiping(false);
    if (start === null || !sliding) return;
    const distance = event.changedTouches[0].clientX - start;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    // Swiping towards the start of the line reveals the next review.
    if ((distance < 0) !== rtl) advance(); else previous();
  };

  const offset = (rtl ? 1 : -1) * current * (100 / perView);
  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('reviews.carousel.label')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onKeyDown={onKeyDown}
    >
      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStart.current = null; setSwiping(false); }}>
        <div
          aria-live={paused ? 'polite' : 'off'}
          className={`flex items-start ${sliding ? '' : 'justify-center'} ${reduceMotion ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]'}`}
          style={sliding ? { transform: `translateX(${offset}%)` } : undefined}
        >
          {reviews.map((review, position) => {
            const visible = position >= current && position < current + perView;
            return (
              <div
                key={review.id}
                role="group"
                aria-roledescription="slide"
                aria-label={t('reviews.carousel.slide', { current: position + 1, total: reviews.length })}
                aria-hidden={!visible || undefined}
                inert={!visible}
                className={`shrink-0 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: `${100 / perView}%` }}
              >
                <ReviewQuote review={review} />
              </div>
            );
          })}
        </div>
      </div>

      {sliding && (
        <div className="mt-10 flex items-center justify-center gap-5">
          <button type="button" onClick={previous} aria-label={t('reviews.carousel.previous')}
            className="rounded-full p-2 text-gold-600 transition-colors hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
            <ArrowLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: positions }, (_, dot) => (
              <button key={dot} type="button" onClick={() => go(dot)} aria-label={t('reviews.carousel.goTo', { number: dot + 1 })} aria-current={dot === current || undefined}
                className="group rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
                <span className={`block h-2.5 w-2.5 rounded-full border border-gold-500 transition-colors duration-300 ${dot === current ? 'bg-gold-500' : 'bg-transparent group-hover:bg-gold-200'}`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={advance} aria-label={t('reviews.carousel.next')}
            className="rounded-full p-2 text-gold-600 transition-colors hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
            <ArrowRight size={18} aria-hidden="true" className="rtl:-scale-x-100" />
          </button>
        </div>
      )}
    </section>
  );
};

export default ReviewCarousel;
