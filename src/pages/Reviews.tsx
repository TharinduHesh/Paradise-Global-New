import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PenLine, ShieldCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../components/ui/SectionHeader';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';
import ReviewSummary from '../components/reviews/ReviewSummary';
import { fetchReviews, type PublicReview, type ReviewSummary as Summary } from '../lib/reviews';
import { usePageImage } from '../lib/siteContent';

const PAGE_SIZE = 9;
export const WRITE_REVIEW_ID = 'write-review';

/** Published customer reviews, the genuine rating summary and the review form. */
const Reviews: React.FC = () => {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const headerImage = usePageImage('contact', 'header');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  // The request that last finished; while it differs from the current one, a load is in progress.
  const requestKey = String(page);
  const [settledKey, setSettledKey] = useState('');
  const loading = settledKey !== requestKey;
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const key = String(page);
    fetchReviews({ page, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((result) => {
        setError('');
        setReviews((previous) => (page === 1 ? result.reviews : [...previous, ...result.reviews]));
        setSummary(result.summary);
        setSiteKey(result.siteKey);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(t('reviews.loadError'));
        // Without the summary the form can still be used; a missing key means no security check is configured.
        setSiteKey((current) => (current === undefined ? null : current));
      })
      .finally(() => { if (!controller.signal.aborted) setSettledKey(key); });
    return () => controller.abort();
  }, [page, t]);

  useEffect(() => {
    if (hash === `#${WRITE_REVIEW_ID}`) window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [hash]);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const hasPublished = Boolean(summary?.count);

  return (
    <>
      <title>{`${t('reviews.title')} — Paradise Global Leisures`}</title>

      <div className="relative overflow-hidden bg-navy-900 pb-20 pt-32">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('${headerImage}')` }} />
        <div className="container-custom relative text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">{t('reviews.eyebrow')}</p>
          <h1 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">{t('reviews.title')}</h1>
          <div className="gold-divider" />
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">{t('reviews.subtitle')}</p>
          <button type="button" onClick={scrollToForm} className="btn-primary mt-8"><PenLine size={18} aria-hidden="true" /> {t('reviews.write')}</button>
        </div>
      </div>

      <section className="section-padding bg-beige-50">
        <div className="container-custom grid grid-cols-1 gap-10 lg:grid-cols-3">
          <aside className="space-y-6">
            {hasPublished && summary && <ReviewSummary summary={summary} />}
            <div className="flex gap-3 rounded-sm border border-beige-200 bg-white p-5 text-sm text-navy-500 shadow-card">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold-600" aria-hidden="true" />
              <p>{t('reviews.moderationNote')}</p>
            </div>
            <button type="button" onClick={scrollToForm} className="btn-outline w-full justify-center"><PenLine size={16} aria-hidden="true" /> {t('reviews.write')}</button>
          </aside>

          <div className="lg:col-span-2">
            {error && <p role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            {reviews.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
              </div>
            )}

            {!loading && !error && reviews.length === 0 && (
              <div className="rounded-sm border border-dashed border-beige-300 bg-white px-6 py-14 text-center">
                <Star size={36} className="mx-auto mb-4 text-gold-400" aria-hidden="true" />
                <h2 className="mb-2 font-serif text-2xl font-bold text-navy-900">{t('reviews.noReviews')}</h2>
                <p className="mb-6 text-navy-500">{t('reviews.noReviewsText')}</p>
                <button type="button" onClick={scrollToForm} className="btn-primary">{t('reviews.write')}</button>
              </div>
            )}

            {loading && <p className="py-10 text-center text-sm text-navy-400" aria-live="polite">{t('common.loading')}</p>}

            {hasMore && !loading && (
              <div className="mt-8 text-center">
                <button type="button" onClick={() => setPage((value) => value + 1)} className="btn-outline">{t('reviews.loadMore')}</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="container-custom">
          <div ref={formRef} id={WRITE_REVIEW_ID} className="mx-auto max-w-3xl scroll-mt-28">
            <SectionHeader eyebrow={t('reviews.eyebrow')} title={t('reviews.write')} centered />
            <div className="mt-10 rounded-sm border border-beige-200 bg-white p-6 shadow-card sm:p-8">
              <ReviewForm siteKey={siteKey} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Reviews;
