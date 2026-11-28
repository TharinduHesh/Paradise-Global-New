/**
 * Customer reviews: shared by the public pages, the admin console and the Pages Functions (functions/api/reviews.ts and
 * the admin router), so limits and service keys stay identical on both sides.
 */

/** Services a review can be about. The key is stored in D1; labels come from i18n (`reviews.services.<key>`). */
export const reviewServices = {
  'real-estate': 'Paradise Real Estate',
  'plan-approvals': 'Paradise Development Solutions',
  'property-management': 'Paradise Property Management',
  'legal-consultation': 'Paradise Legal Solutions',
  hospitality: 'Paradise Hospitality Collection',
  construction: 'Paradise Design & Construction',
  general: 'General experience',
} as const;

export type ReviewService = keyof typeof reviewServices;
export const isReviewService = (value: unknown): value is ReviewService =>
  typeof value === 'string' && Object.hasOwn(reviewServices, value);

export const reviewStatuses = ['pending', 'published', 'rejected', 'hidden'] as const;
export type ReviewStatus = typeof reviewStatuses[number];

/** Moderation actions and the statuses each one may start from. */
export const reviewActions = {
  approve: { from: ['pending'], to: 'published' },
  publish: { from: ['hidden', 'rejected'], to: 'published' },
  unpublish: { from: ['published'], to: 'hidden' },
  reject: { from: ['pending', 'published', 'hidden'], to: 'rejected' },
} as const satisfies Record<string, { from: readonly ReviewStatus[]; to: ReviewStatus }>;
export type ReviewAction = keyof typeof reviewActions;

export const reviewLimits = {
  name: 100, email: 254, country: 60, message: 2000, minMessage: 10, reply: 2000,
} as const;

/** A review as the public API returns it: never the email, IP hash or moderation status. */
export interface PublicReview {
  id: number;
  name: string;
  country: string;
  service: ReviewService;
  rating: number;
  message: string;
  reply: string;
  replyHe: string;
  repliedAt: string | null;
  publishedAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Published reviews per star, index 0 = one star … index 4 = five stars. */
  breakdown: [number, number, number, number, number];
}

export interface ReviewPage { reviews: PublicReview[]; summary: ReviewSummary; hasMore: boolean; siteKey: string | null }

export interface ReviewSubmission {
  name: string;
  email: string;
  country: string;
  service: ReviewService | '';
  rating: number;
  message: string;
  /** Honeypot: hidden from people, so anything typed here comes from a bot. */
  website: string;
}

/** D1 stores UTC "YYYY-MM-DD HH:MM:SS"; this reads it as UTC. */
export const parseDbDate = (value: string) => new Date(`${value.replace(' ', 'T')}${/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? '' : 'Z'}`);

export const formatReviewDate = (value: string, language: string) => {
  const date = parseDbDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const errorFrom = async (response: Response, fallback: string) => {
  try {
    const body = await response.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
};

export const fetchReviews = async (options: { page?: number; pageSize?: number; service?: string; signal?: AbortSignal } = {}): Promise<ReviewPage> => {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.service) params.set('service', options.service);
  const response = await fetch(`/api/reviews?${params}`, { signal: options.signal });
  if (!response.ok) throw new Error(await errorFrom(response, 'Unable to load reviews.'));
  return await response.json() as ReviewPage;
};

export class ReviewSubmitError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export const submitReview = async (review: ReviewSubmission, turnstileToken: string | null): Promise<void> => {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...review, turnstileToken }),
  });
  if (!response.ok) throw new ReviewSubmitError(await errorFrom(response, 'Unable to submit your review.'), response.status);
};
