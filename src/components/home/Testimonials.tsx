import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Quote, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../ui/SectionHeader';
import ReviewCard from '../reviews/ReviewCard';
import ReviewSummary from '../reviews/ReviewSummary';
import { useCatalogue, viewTestimonial } from '../../lib/catalogue';
import { fetchReviews, type PublicReview, type ReviewSummary as Summary } from '../../lib/reviews';

const HOME_REVIEW_COUNT = 6;
const cardWidth = 'w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]';

/**
 * Client testimonials managed in the admin panel, followed by the latest published customer reviews.
 * Renders nothing until at least one testimonial or review is published, so the homepage never shows invented feedback.
 */
const Testimonials: React.FC = () => {
  const { t } = useTranslation();
  const testimonials = useCatalogue<Record<string, unknown>>('testimonial').map(viewTestimonial).filter((item) => item.quote.trim());
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchReviews({ pageSize: HOME_REVIEW_COUNT, signal: controller.signal })
      .then((result) => { setReviews(result.reviews); setSummary(result.summary); })
      // Reviews are an enhancement here; if they cannot load, the testimonials still show.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!testimonials.length && !reviews.length) return null;
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <SectionHeader eyebrow={t('home.testimonialsEyebrow')} title={t('home.testimonialsTitle')} centered />
        {summary && summary.count > 0 && <div className="mt-8"><ReviewSummary summary={summary} compact /></div>}
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {testimonials.map((item) => (
            <figure key={item.id} className={`flex flex-col ${cardWidth} rounded-sm border border-beige-200 bg-beige-50 p-7 shadow-card`}>
              <Quote size={28} className="mb-4 text-gold-500" aria-hidden="true" />
              {item.rating > 0 && (
                <div className="mb-3 flex gap-0.5" aria-label={`${item.rating} / 5`}>
                  {Array.from({ length: item.rating }, (_, index) => <Star key={index} size={14} className="fill-gold-500 text-gold-500" />)}
                </div>
              )}
              <blockquote className="flex-1 text-sm leading-relaxed text-navy-700">{item.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-beige-200 pt-5">
                {item.image && <img src={item.image} alt="" className="h-11 w-11 rounded-full object-cover" />}
                <div>
                  <p className="font-serif font-semibold text-navy-900">{item.name}</p>
                  {item.role && <p className="text-xs text-navy-500">{item.role}</p>}
                </div>
              </figcaption>
            </figure>
          ))}
          {reviews.map((review) => <ReviewCard key={`review-${review.id}`} review={review} surface="beige" className={cardWidth} />)}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {reviews.length > 0 && <Link to="/reviews" className="btn-outline">{t('reviews.readAll')}</Link>}
          <Link to="/reviews#write-review" className="btn-primary"><PenLine size={16} aria-hidden="true" /> {t('reviews.write')}</Link>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
