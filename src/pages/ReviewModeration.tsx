import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { StarDisplay } from '../components/reviews/StarRating';
import { parseDbDate } from '../lib/reviews';

/**
 * Confirmation page for the Approve / Reject links in the new-review email. Utility page only: no site navigation,
 * English only, not indexed. The one-time token arrives in the URL fragment (#token=…), which is never sent to a server;
 * it is removed from the address bar at once. Opening the page changes nothing: the review is only approved or rejected
 * when the manager presses the confirm button, which sends an explicit POST.
 */

type Action = 'approve' | 'reject';
interface Preview { action: Action; review: { name: string; country: string; rating: number; message: string; status: string; submittedAt: string } }
type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; preview: Preview }
  | { kind: 'done'; action: Action };

const MAX_REASON = 500;
const readToken = () => /(?:^#|&)token=([0-9a-f]{64})(?:&|$)/.exec(window.location.hash)?.[1] ?? null;

const call = async (body: Record<string, unknown>) => {
  const response = await fetch('/api/review-moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || 'Unable to complete the request. Please try again.');
  return result;
};

const submittedText = (value: string) => {
  const date = parseDbDate(value);
  return Number.isNaN(date.getTime()) ? value
    : `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(date)} (Sri Lanka time)`;
};

const ReviewModeration: React.FC = () => {
  // Read once; the fragment is then cleared so the token does not linger in the address bar or history.
  const [token] = useState(readToken);
  const [state, setState] = useState<State>(() => (token ? { kind: 'loading' } : { kind: 'error', message: 'This moderation link is incomplete or not valid. Please use the button in the email, or moderate the review from the Manager Dashboard.' }));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    if (!token) return;
    call({ token, step: 'preview' })
      .then((result) => setState({ kind: 'ready', preview: result as unknown as Preview }))
      .catch((error: Error) => setState({ kind: 'error', message: error.message }));
  }, [token]);

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state.kind !== 'ready' || !token) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { action } = state.preview;
      await call({ token, step: 'confirm', action, ...(action === 'reject' && reason.trim() ? { reason: reason.trim() } : {}) });
      setState({ kind: 'done', action });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to complete the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-beige-50 px-4 py-10 sm:py-16" dir="ltr" lang="en">
      <title>Review Moderation — Paradise Global Leisures</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />

      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-sm border border-beige-200 bg-white shadow-card">
        <header className="bg-navy-900 px-6 py-7 text-center">
          <img src="/logo.png?v=gold" alt="Paradise Global Leisures" className="mx-auto h-16 w-16 object-contain" />
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-gold-400">Review Moderation</p>
        </header>
        <div className="h-0.5 bg-gold-500" />

        <div className="px-6 py-8 sm:px-10">
          {state.kind === 'loading' && <p className="py-10 text-center text-sm text-navy-400" aria-live="polite">Checking your secure link…</p>}

          {state.kind === 'error' && (
            <div className="py-6 text-center" role="alert">
              <XCircle size={44} className="mx-auto mb-4 text-red-400" aria-hidden="true" />
              <h1 className="mb-3 font-serif text-2xl font-bold text-navy-900">Link unavailable</h1>
              <p className="text-navy-500">{state.message}</p>
            </div>
          )}

          {state.kind === 'done' && (
            <div className="py-6 text-center" role="status">
              <CheckCircle2 size={48} className={`mx-auto mb-4 ${state.action === 'approve' ? 'text-emerald-500' : 'text-navy-400'}`} aria-hidden="true" />
              <h1 className="mb-3 font-serif text-2xl font-bold text-navy-900">
                {state.action === 'approve' ? 'Review approved and published successfully.' : 'Review rejected successfully.'}
              </h1>
              <p className="text-navy-500">
                {state.action === 'approve' ? 'It is now visible on the website.' : 'It will not be shown on the website.'}
              </p>
            </div>
          )}

          {state.kind === 'ready' && (() => {
            const { action, review } = state.preview;
            const approving = action === 'approve';
            return (
              <form onSubmit={confirm}>
                <h1 className="text-center font-serif text-2xl font-bold text-navy-900">{approving ? 'Approve this review?' : 'Reject this review?'}</h1>
                <p className="mt-2 text-center text-sm text-navy-500">
                  {approving ? 'Approving publishes the review on the website straight away.' : 'A rejected review is never shown on the website.'}
                </p>

                <figure className="mt-8 flex flex-col items-center rounded-sm bg-beige-50 px-5 py-7 text-center">
                  <span aria-hidden="true" className="block h-8 font-serif text-6xl font-bold leading-[0.9] text-gold-500">&ldquo;</span>
                  <StarDisplay rating={review.rating} size="sm" label={`${review.rating} out of 5 stars`} className="mt-4" />
                  <blockquote dir="auto" className="mt-4 whitespace-pre-line text-base italic leading-relaxed text-navy-800">{review.message}</blockquote>
                  <span aria-hidden="true" className="mt-5 block h-px w-12 bg-gold-400" />
                  <figcaption className="mt-4">
                    <p dir="auto" className="font-semibold text-navy-900">{review.name}</p>
                    {review.country && <p dir="auto" className="mt-1 text-sm text-gold-600">{review.country}</p>}
                  </figcaption>
                </figure>

                <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-navy-400">Submitted</dt><dd className="text-navy-800">{submittedText(review.submittedAt)}</dd>
                  <dt className="text-navy-400">Status</dt><dd><span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending approval</span></dd>
                </dl>

                {!approving && (
                  <label className="mt-6 block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-600">Reason <span className="normal-case text-navy-400">(optional, visible to staff only)</span></span>
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={MAX_REASON} rows={3}
                      className="w-full resize-none rounded-sm border border-beige-300 px-4 py-3 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400" />
                  </label>
                )}

                {submitError && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}

                <button type="submit" disabled={submitting}
                  className={`mt-7 flex w-full items-center justify-center gap-2 rounded-sm px-6 py-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${approving ? 'bg-gold-500 text-navy-900 hover:bg-gold-400' : 'bg-navy-900 text-white hover:bg-navy-800'}`}>
                  {submitting ? 'Please wait…' : approving ? 'Confirm approval and publish' : 'Confirm rejection'}
                </button>
              </form>
            );
          })()}

          <div className="mt-8 border-t border-beige-200 pt-6 text-center">
            <a href="/admin/reviews" className="text-sm font-medium text-navy-700 underline decoration-gold-500 underline-offset-4 hover:text-gold-600">Open Manager Dashboard</a>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-navy-400">
              <ShieldCheck size={14} className="text-gold-500" aria-hidden="true" /> Secure one-time link · expires 48 hours after the email was sent
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ReviewModeration;
