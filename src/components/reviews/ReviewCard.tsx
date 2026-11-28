import React from 'react';
import { MapPin, MessageSquareQuote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StarDisplay } from './StarRating';
import { formatReviewDate, type PublicReview } from '../../lib/reviews';
import { getLocalizedText } from '../../lib/localizedContent';

/** One published customer review, with the company's reply when there is one. */
const ReviewCard: React.FC<{ review: PublicReview; className?: string; surface?: 'white' | 'beige' }> = ({ review, className = '', surface = 'white' }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const reply = getLocalizedText(review.reply, review.replyHe, language);
  const date = formatReviewDate(review.publishedAt, language);
  return (
    <article className={`flex flex-col rounded-sm border border-beige-200 p-7 shadow-card ${surface === 'beige' ? 'bg-beige-50' : 'bg-white'} ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <StarDisplay rating={review.rating} size="sm" label={t('reviews.outOf', { rating: review.rating })} />
        {date && <time dateTime={review.publishedAt.replace(' ', 'T')} className="text-xs text-navy-400">{date}</time>}
      </div>
      {/* Reviews are shown exactly as written; dir="auto" lays out English and Hebrew text correctly either way. */}
      <p dir="auto" className="flex-1 whitespace-pre-line text-sm leading-relaxed text-navy-700">{review.message}</p>
      {reply && (
        <div className={`mt-5 rounded-sm border-s-2 border-gold-400 px-4 py-3 ${surface === 'beige' ? 'bg-white' : 'bg-beige-50'}`}>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-700">
            <MessageSquareQuote size={14} aria-hidden="true" /> {t('reviews.reply')}
          </p>
          <p dir="auto" className="whitespace-pre-line text-sm leading-relaxed text-navy-600">{reply}</p>
        </div>
      )}
      <footer className="mt-6 border-t border-beige-200 pt-5">
        <p dir="auto" className="font-serif font-semibold text-navy-900">{review.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-500">
          <span>{t(`reviews.services.${review.service}`)}</span>
          {review.country && <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gold-500" aria-hidden="true" /><span dir="auto">{review.country}</span></span>}
        </p>
      </footer>
    </article>
  );
};

export default ReviewCard;
