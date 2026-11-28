import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../ui/SectionHeader';
import ReviewCarousel from '../reviews/ReviewCarousel';
import { fetchReviews, type PublicReview } from '../../lib/reviews';

const HOME_REVIEW_COUNT = 12;
const textLink = 'text-lg text-navy-900 underline decoration-navy-900/60 decoration-1 underline-offset-[6px] transition-colors hover:text-gold-600 hover:decoration-gold-500';

/**
 * Homepage "Words from our clients": the latest published reviews in an editorial carousel. Always shown so visitors can
 * reach the review form; with no published reviews it invites the first one instead of showing placeholder feedback.
 */
const CustomerReviews: React.FC = () => {
  const { t } = useTranslation();
  // undefined while loading, null if the reviews could not be loaded.
  const [reviews, setReviews] = useState<PublicReview[] | null>();

  useEffect(() => {
    const controller = new AbortController();
    fetchReviews({ pageSize: HOME_REVIEW_COUNT, signal: controller.signal })
      .then((result) => setReviews(result.reviews))
      .catch(() => { if (!controller.signal.aborted) setReviews(null); });
    return () => controller.abort();
  }, []);

  const hasReviews = Boolean(reviews?.length);
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <SectionHeader eyebrow={`— ${t('reviews.homeEyebrow')} —`} title={t('reviews.homeTitle')} centered />

        <div className="mt-14">
          {hasReviews && <ReviewCarousel reviews={reviews!} />}
          {reviews?.length === 0 && (
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <span aria-hidden="true" className="block h-10 select-none font-serif text-7xl font-bold leading-[0.9] text-gold-500">&ldquo;</span>
              <p className="mt-6 text-xl italic leading-relaxed text-navy-800">{t('reviews.noReviewsText')}</p>
              <span aria-hidden="true" className="mt-6 block h-px w-12 bg-gold-400" />
            </div>
          )}
        </div>

        {reviews !== undefined && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {hasReviews && <Link to="/reviews" className={textLink}>{t('reviews.viewAll')}</Link>}
            {hasReviews && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold-500" />}
            <Link to="/reviews#write-review" className={textLink}>{t('reviews.write')}</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerReviews;
