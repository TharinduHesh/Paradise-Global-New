import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../ui/SectionHeader';
import ReviewCard from '../reviews/ReviewCard';
import ReviewSummary from '../reviews/ReviewSummary';
import { fetchReviews, type ReviewPage } from '../../lib/reviews';

const HOME_REVIEW_COUNT = 6;

/**
 * Homepage Customer Reviews: the genuine average rating and the latest published reviews. Always shown, so visitors can
 * find the review form; with no published reviews it invites the first one instead of showing any placeholder feedback.
 */
const CustomerReviews: React.FC = () => {
  const { t } = useTranslation();
  // undefined while loading, null if the reviews could not be loaded.
  const [data, setData] = useState<ReviewPage | null>();

  useEffect(() => {
    const controller = new AbortController();
    fetchReviews({ pageSize: HOME_REVIEW_COUNT, signal: controller.signal })
      .then(setData)
      .catch(() => { if (!controller.signal.aborted) setData(null); });
    return () => controller.abort();
  }, []);

  const reviews = data?.reviews ?? [];
  const empty = data !== undefined && data !== null && data.summary.count === 0;

  return (
    <section className="section-padding bg-beige-50">
      <div className="container-custom">
        <SectionHeader eyebrow={t('reviews.eyebrow')} title={t('reviews.title')} subtitle={t('reviews.subtitle')} centered />

        {data && data.summary.count > 0 && <div className="mt-8"><ReviewSummary summary={data.summary} compact /></div>}

        {reviews.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        )}

        {empty && (
          <div className="mx-auto mt-12 max-w-xl rounded-sm border border-dashed border-beige-300 bg-white px-6 py-12 text-center shadow-card">
            <Star size={36} className="mx-auto mb-4 text-gold-400" aria-hidden="true" />
            <p className="font-serif text-2xl font-bold text-navy-900">{t('reviews.noReviewsText')}</p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {reviews.length > 0 && <Link to="/reviews" className="btn-outline">{t('reviews.readAll')}</Link>}
          <Link to="/reviews#write-review" className="btn-primary"><PenLine size={16} aria-hidden="true" /> {t('reviews.write')}</Link>
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews;
