import React from 'react';
import { useTranslation } from 'react-i18next';
import { StarDisplay } from './StarRating';
import type { ReviewSummary as Summary } from '../../lib/reviews';

/** Average rating, published review count and the per-star breakdown. Built from published reviews only. */
const ReviewSummary: React.FC<{ summary: Summary; compact?: boolean }> = ({ summary, compact = false }) => {
  const { t, i18n } = useTranslation();
  const average = new Intl.NumberFormat(i18n.language === 'he' ? 'he-IL' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.average);
  const headline = (
    <div className={`flex items-center gap-4 ${compact ? 'justify-center' : ''}`}>
      <p className="font-serif text-5xl font-bold leading-none text-navy-900">{average}</p>
      <div>
        <StarDisplay rating={summary.average} size="lg" label={t('reviews.outOf', { rating: average })} />
        <p className="mt-1 text-sm text-navy-500">{t('reviews.basedOn', { count: summary.count })}</p>
      </div>
    </div>
  );
  if (compact) return headline;
  return (
    <div className="rounded-sm border border-beige-200 bg-white p-7 shadow-card">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gold-600">{t('reviews.average')}</p>
      {headline}
      <ul className="mt-6 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.breakdown[stars - 1];
          const share = summary.count ? (count / summary.count) * 100 : 0;
          return (
            <li key={stars} className="flex items-center gap-3 text-sm" aria-label={t('reviews.breakdownLabel', { stars: t('reviews.starsCount', { count: stars }), count })}>
              <span className="w-16 shrink-0 text-navy-600" aria-hidden="true">{t('reviews.starsCount', { count: stars })}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-beige-100" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold-500" style={{ width: `${share}%` }} />
              </span>
              <span className="w-8 shrink-0 text-end text-navy-500" aria-hidden="true">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReviewSummary;
