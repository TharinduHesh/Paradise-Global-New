import React, { useCallback, useState } from 'react';
import { CheckCircle, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '../ui/Turnstile';
import { StarRatingInput } from './StarRating';
import { ReviewSubmitError, reviewLimits, submitReview, type ReviewSubmission } from '../../lib/reviews';

const emptyForm: ReviewSubmission = { name: '', email: '', country: '', rating: 0, message: '', website: '' };
const fieldClass = 'w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 placeholder-navy-300 bg-white focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors';
const labelClass = 'block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide';
const LINKS = /https?:\/\/|www\./gi;

interface ReviewFormProps {
  /** Turnstile site key: undefined while loading, null when the security check is not configured. */
  siteKey: string | null | undefined;
}

/** Public review form. Reviews are saved as pending; nothing appears on the site until an admin publishes it. */
const ReviewForm: React.FC<ReviewFormProps> = ({ siteKey }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ReviewSubmission>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetAttempt, setWidgetAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [ratingMissing, setRatingMissing] = useState(false);

  const handleVerificationError = useCallback(() => {
    setTurnstileToken(null);
    setError(t('contact.securityLoadError'));
  }, [t]);

  const update = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (siteKey === undefined || (siteKey && !turnstileToken)) return;
    setError('');
    if (!form.rating) { setRatingMissing(true); setError(t('reviews.form.ratingRequired')); return; }
    const message = form.message.trim();
    if (message.length < reviewLimits.minMessage) { setError(t('reviews.form.minLength', { count: reviewLimits.minMessage })); return; }
    if ((message.match(LINKS) ?? []).length > 1) { setError(t('reviews.form.links')); return; }
    setSubmitting(true);
    try {
      await submitReview(form, turnstileToken);
      setSubmitted(true);
      setForm(emptyForm);
    } catch (caught) {
      const status = caught instanceof ReviewSubmitError ? caught.status : 0;
      setError(status === 403 ? t('reviews.form.securityError') : t('reviews.form.error'));
      setWidgetAttempt((attempt) => attempt + 1);
    } finally {
      setTurnstileToken(null);
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center" role="status">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-500" aria-hidden="true" />
        </div>
        <h3 className="mb-3 font-serif text-2xl font-bold text-navy-900">{t('reviews.form.success')}</h3>
        <p className="mb-8 max-w-md text-base text-navy-500">{t('reviews.form.successText')}</p>
        <button type="button" onClick={() => setSubmitted(false)} className="btn-outline">{t('reviews.form.another')}</button>
      </div>
    );
  }

  const ratingWords = [1, 2, 3, 4, 5].map((count) => t(`reviews.form.ratingWord${count}`));
  return (
    <>
      <h3 className="mb-2 font-serif text-2xl font-bold text-navy-900">{t('reviews.form.title')}</h3>
      <p className="mb-6 text-sm text-navy-500">{t('reviews.form.subtitle')}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <StarRatingInput
          value={form.rating}
          onChange={(rating) => { setForm((previous) => ({ ...previous, rating })); setRatingMissing(false); }}
          legend={t('reviews.form.rating')}
          starLabel={(count) => t('reviews.form.starLabel', { count })}
          descriptions={ratingWords}
          required
          invalid={ratingMissing}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="review-name" className={labelClass}>{t('reviews.form.name')} *</label>
            <input id="review-name" name="name" required maxLength={reviewLimits.name} autoComplete="name" value={form.name} onChange={update}
              placeholder={t('reviews.form.placeholders.name')} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="review-email" className={labelClass}>{t('reviews.form.email')} *</label>
            <input id="review-email" name="email" type="email" required maxLength={reviewLimits.email} autoComplete="email" value={form.email} onChange={update}
              placeholder={t('reviews.form.placeholders.email')} aria-describedby="review-email-note" className={fieldClass} />
            <p id="review-email-note" className="mt-1.5 text-xs text-navy-400">{t('reviews.form.emailNote')}</p>
          </div>
        </div>

        <div>
          <label htmlFor="review-country" className={labelClass}>{t('reviews.form.country')} <span className="normal-case text-navy-400">({t('reviews.form.optional')})</span></label>
          <input id="review-country" name="country" maxLength={reviewLimits.country} autoComplete="country-name" value={form.country} onChange={update}
            placeholder={t('reviews.form.placeholders.country')} className={fieldClass} />
        </div>

        <div>
          <label htmlFor="review-message" className={labelClass}>{t('reviews.form.message')} *</label>
          <textarea id="review-message" name="message" required minLength={reviewLimits.minMessage} maxLength={reviewLimits.message} rows={6}
            value={form.message} onChange={update} placeholder={t('reviews.form.messagePlaceholder')} dir="auto"
            aria-describedby="review-message-count" className={`${fieldClass} resize-none`} />
          <p id="review-message-count" className="mt-1 text-end text-xs text-navy-400">
            {t('reviews.form.characters', { count: form.message.length, max: reviewLimits.message })}
          </p>
        </div>

        {/* Honeypot: invisible to people and skipped by keyboard and screen readers; bots that fill it are ignored. */}
        <div className="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update} /></label>
        </div>

        {siteKey && <Turnstile key={widgetAttempt} siteKey={siteKey} action="review" onToken={setTurnstileToken} onError={handleVerificationError} />}
        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={submitting || siteKey === undefined || Boolean(siteKey && !turnstileToken)}
          className="btn-primary w-full justify-center py-4 text-base disabled:cursor-not-allowed disabled:opacity-60">
          <Send size={18} aria-hidden="true" /> {submitting ? t('common.loading') : t('reviews.form.submit')}
        </button>
        <p className="text-center text-xs text-navy-400">{t('reviews.form.privacy')}</p>
      </form>
    </>
  );
};

export default ReviewForm;
