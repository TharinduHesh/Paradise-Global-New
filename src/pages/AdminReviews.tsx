import React, { useEffect, useState } from 'react';
import { Check, EyeOff, Globe, Mail, MessageSquareReply, Search, Send, Star, Trash2, X } from 'lucide-react';
import { api, Header, inputClass } from '../components/admin/adminUi';
import { reviewActions, reviewLimits, reviewServices, reviewStatuses, parseDbDate, type ReviewAction, type ReviewService, type ReviewStatus } from '../lib/reviews';

type AdminReview = {
  id: number; name: string; email: string; country: string; service: ReviewService | string; rating: number; message: string;
  status: ReviewStatus; admin_reply: string; admin_reply_he: string; replied_at: string | null; replied_by_name: string | null;
  published_at: string | null; created_at: string;
};
type Counts = Record<ReviewStatus, number>;

const statusLabels: Record<ReviewStatus, string> = { pending: 'Pending', published: 'Published', rejected: 'Rejected', hidden: 'Hidden' };
const statusStyles: Record<ReviewStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', published: 'bg-emerald-50 text-emerald-700', rejected: 'bg-red-50 text-red-700', hidden: 'bg-slate-100 text-slate-600',
};
const actionButtons: Record<ReviewAction, { label: string; Icon: typeof Check; style: string }> = {
  approve: { label: 'Approve & publish', Icon: Check, style: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  publish: { label: 'Publish', Icon: Check, style: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  unpublish: { label: 'Hide', Icon: EyeOff, style: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' },
  reject: { label: 'Reject', Icon: X, style: 'border border-red-200 bg-white text-red-600 hover:bg-red-50' },
};
const serviceLabel = (key: string) => (reviewServices as Record<string, string>)[key] ?? key;
const when = (value: string | null) => (value ? parseDbDate(value).toLocaleString() : '');

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((count) => <Star key={count} size={15} aria-hidden="true" className={count <= rating ? 'fill-[#c9a84c] text-[#c9a84c]' : 'text-slate-300'} />)}
  </span>
);

const ReviewManagement: React.FC = () => {
  const [status, setStatus] = useState<ReviewStatus | ''>('pending');
  const [filters, setFilters] = useState({ search: '', service: '', rating: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminReview[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, published: 0, rejected: 0, hidden: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [settledKey, setSettledKey] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Searching waits for a pause in typing so each keystroke does not query the database.
  useEffect(() => {
    const timer = window.setTimeout(() => { setFilters((current) => (current.search === search ? current : { ...current, search })); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams({ ...filters, status, page: String(page) }).toString();
  // While the last finished request differs from the current one, a load is in progress.
  const loading = settledKey !== `${query}#${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    api<{ reviews: AdminReview[]; hasMore: boolean; counts: Counts }>(`reviews?${query}`, { signal: controller.signal })
      .then((result) => { setItems(result.reviews); setHasMore(result.hasMore); setCounts(result.counts); })
      .catch((caught: Error) => { if (!controller.signal.aborted) setNotice({ ok: false, text: caught.message }); })
      .finally(() => { if (!controller.signal.aborted) setSettledKey(`${query}#${revision}`); });
    return () => controller.abort();
  }, [query, revision]);

  const changeFilter = (key: 'service' | 'rating', value: string) => { setFilters({ ...filters, [key]: value }); setPage(1); };
  const changeStatus = (value: ReviewStatus | '') => { setStatus(value); setPage(1); setReplyingId(null); };
  const refresh = () => {
    // The last review on a later page may have moved to another tab; step back so the page is not empty.
    if (items.length === 1 && page > 1) setPage(page - 1);
    setRevision((value) => value + 1);
  };

  const moderate = async (review: AdminReview, action: ReviewAction) => {
    if (action === 'reject' && !window.confirm(`Reject the review from ${review.name}? It will not be shown on the website.`)) return;
    setBusyId(review.id);
    setNotice(null);
    try {
      await api(`reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      setNotice({ ok: true, text: `Review from ${review.name} is now ${statusLabels[reviewActions[action].to].toLowerCase()}.` });
      refresh();
    } catch (caught) {
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : 'Unable to update the review.' });
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async (review: AdminReview, event: React.FormEvent) => {
    event.preventDefault();
    setBusyId(review.id);
    setNotice(null);
    try {
      const result = await api<{ translationFailed?: boolean }>(`reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ reply: replyDraft }) });
      setNotice(result.translationFailed
        ? { ok: false, text: 'Reply saved, but it could not be translated into Hebrew. Hebrew visitors will see the English reply.' }
        : { ok: true, text: replyDraft.trim() ? 'Reply saved. It appears under the review when the review is published.' : 'Reply removed.' });
      setReplyingId(null);
      setRevision((value) => value + 1);
    } catch (caught) {
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : 'Unable to save the reply.' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: AdminReview) => {
    if (!window.confirm(`Delete the review from ${review.name} permanently? This cannot be undone.`)) return;
    setBusyId(review.id);
    setNotice(null);
    try {
      await api(`reviews/${review.id}`, { method: 'DELETE' });
      setNotice({ ok: true, text: `Review from ${review.name} deleted.` });
      refresh();
    } catch (caught) {
      setNotice({ ok: false, text: caught instanceof Error ? caught.message : 'Unable to delete the review.' });
    } finally {
      setBusyId(null);
    }
  };

  const total = reviewStatuses.reduce((sum, key) => sum + counts[key], 0);
  const tabs: { value: ReviewStatus | ''; label: string; count: number }[] = [
    ...(['pending', 'published', 'hidden', 'rejected'] as const).map((value) => ({ value, label: statusLabels[value], count: counts[value] })),
    { value: '', label: 'All', count: total },
  ];

  return <>
    <Header title="Review Management" subtitle="Moderate customer reviews. Only published reviews appear on the website and count towards the rating." />

    <nav aria-label="Review status" className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button key={tab.label} type="button" onClick={() => changeStatus(tab.value)} aria-pressed={status === tab.value}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${status === tab.value ? 'border-[#0a1628] bg-[#0a1628] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
          {tab.label}
          <span className={`rounded-full px-2 py-0.5 text-xs ${status === tab.value ? 'bg-white/15' : tab.value === 'pending' && tab.count ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
        </button>
      ))}
    </nav>

    <div className="mb-5 flex flex-wrap gap-3">
      <label className="relative min-w-0 flex-1 basis-64">
        <span className="sr-only">Search reviews</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input className={`${inputClass} pl-9`} placeholder="Search name, email, country or text" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <select className={`${inputClass} sm:w-64`} aria-label="Filter by service" value={filters.service} onChange={(event) => changeFilter('service', event.target.value)}>
        <option value="">All services</option>
        {Object.entries(reviewServices).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <select className={`${inputClass} sm:w-40`} aria-label="Filter by rating" value={filters.rating} onChange={(event) => changeFilter('rating', event.target.value)}>
        <option value="">All ratings</option>
        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? '' : 's'}</option>)}
      </select>
    </div>

    {notice && <div role={notice.ok ? 'status' : 'alert'} className={`mb-5 rounded-lg px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>}

    <div className="space-y-4" aria-busy={loading}>
      {items.map((review) => {
        const busy = busyId === review.id;
        const actions = (Object.keys(reviewActions) as ReviewAction[]).filter((action) => (reviewActions[action].from as readonly ReviewStatus[]).includes(review.status));
        return (
          <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars rating={review.rating} />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[review.status]}`}>{statusLabels[review.status]}</span>
                  <span className="text-xs text-slate-400">REV-{String(review.id).padStart(5, '0')}</span>
                </div>
                <h2 className="mt-2 font-serif text-lg font-bold text-[#0a1628]">{review.name}</h2>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <a href={`mailto:${review.email}`} className="inline-flex items-center gap-1 hover:text-[#9a7425]"><Mail size={12} aria-hidden="true" />{review.email}</a>
                  {review.country && <span className="inline-flex items-center gap-1"><Globe size={12} aria-hidden="true" />{review.country}</span>}
                  <span>{serviceLabel(review.service)}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Received {when(review.created_at)}</p>
                {review.published_at && <p>First published {when(review.published_at)}</p>}
              </div>
            </div>

            <p dir="auto" className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{review.message}</p>

            {review.admin_reply && replyingId !== review.id && (
              <div className="mt-3 rounded-lg border-l-2 border-[#c9a84c] bg-[#f9f6f0] p-4 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9a7425]">Your reply{review.replied_by_name ? ` · ${review.replied_by_name}` : ''} · {when(review.replied_at)}</p>
                <p className="whitespace-pre-wrap text-slate-700">{review.admin_reply}</p>
                {review.admin_reply_he && <p dir="rtl" lang="he" className="mt-2 whitespace-pre-wrap border-t border-[#ece6d6] pt-2 text-slate-500">{review.admin_reply_he}</p>}
              </div>
            )}

            {replyingId === review.id && (
              <form onSubmit={(event) => void saveReply(review, event)} className="mt-3 space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Public reply (English — translated to Hebrew automatically)</span>
                  <textarea className={`${inputClass} min-h-28`} maxLength={reviewLimits.reply} value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)}
                    placeholder="Thank you for your kind words…" autoFocus />
                </label>
                <p className="text-xs text-slate-400">Leave empty and save to remove the reply. {replyDraft.length} / {reviewLimits.reply}</p>
                <div className="flex gap-2">
                  <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#0a1628] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Send size={15} aria-hidden="true" />{busy ? 'Saving…' : 'Save reply'}</button>
                  <button type="button" disabled={busy} onClick={() => setReplyingId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
                </div>
              </form>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {actions.map((action) => {
                const { label, Icon, style } = actionButtons[action];
                return <button key={action} type="button" disabled={busy} onClick={() => void moderate(review, action)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${style}`}><Icon size={15} aria-hidden="true" />{label}</button>;
              })}
              {replyingId !== review.id && <button type="button" disabled={busy} onClick={() => { setReplyingId(review.id); setReplyDraft(review.admin_reply); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <MessageSquareReply size={15} aria-hidden="true" />{review.admin_reply ? 'Edit reply' : 'Reply'}</button>}
              <button type="button" disabled={busy} onClick={() => void remove(review)} aria-label={`Delete review from ${review.name}`} title="Delete review"
                className="ml-auto rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={16} /></button>
            </div>
          </article>
        );
      })}
      {!loading && !items.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        {filters.search || filters.service || filters.rating ? 'No reviews match these filters.' : status ? `No ${statusLabels[status].toLowerCase()} reviews.` : 'No reviews yet.'}
      </div>}
      {loading && !items.length && <p className="p-8 text-center text-sm text-slate-400">Loading reviews…</p>}
    </div>

    {(page > 1 || hasMore) && <div className="mt-5 flex items-center gap-4 text-sm">
      <button disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
      <span>Page {page}</span>
      <button disabled={!hasMore || loading} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
    </div>}
  </>;
};

export default ReviewManagement;
