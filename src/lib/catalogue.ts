import { builtInContent } from './builtInContent';
import { usePublishedList, type PublishedItem } from './publishedContent';
import { getLocalizedList, getLocalizedText } from './localizedContent';
import type { Destination, ProcessStep, Project } from '../types';

/**
 * Published catalogue records for a type. Until the catalogue answers (or if it is unavailable) the website's
 * original records are shown, so pages never render empty.
 */
export function useCatalogue<T>(type: string): PublishedItem<T>[] {
  const fallback = (builtInContent[type] ?? []).map((item, index) => ({ id: `built-in-${index}`, slug: item.slug, title: item.title, data: item.data as T }));
  return usePublishedList<T, PublishedItem<T>>(type, fallback, (item) => item);
}

const text = (value: unknown) => typeof value === 'string' ? value : '';
const list = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())) : [];
const localized = (data: Record<string, unknown>, field: string, fallback = '') => getLocalizedText(text(data[field]) || fallback, text(data[`${field}_he`]));
const localizedList = (data: Record<string, unknown>, field: string) => getLocalizedList(list(data[field]), list(data[`${field}_he`]));

export interface ServiceView {
  id: string; slug: string; title: string; short: string; summary: string; description: string;
  features: string[]; highlights: string[]; details: string; icon: string; image: string; href: string; process: ProcessStep[];
}

export const viewService = (item: PublishedItem<Record<string, unknown>>): ServiceView => {
  const data = item.data;
  const description = localized(data, 'description');
  const summary = localized(data, 'summary') || description;
  const features = localizedList(data, 'features');
  const highlights = localizedList(data, 'highlights');
  return {
    id: item.id,
    slug: item.slug,
    title: getLocalizedText(item.title, text(data.title_he)),
    short: localized(data, 'short') || summary,
    summary,
    description,
    features,
    highlights: highlights.length ? highlights : features.slice(0, 4),
    details: localized(data, 'details'),
    icon: text(data.icon) || 'FileCheck',
    image: text(data.image),
    href: text(data.link).trim() || `/services/${item.slug}`,
    process: Array.isArray(data.process) ? data.process as ProcessStep[] : [],
  };
};

export const viewDestination = (item: PublishedItem<Record<string, unknown>>): Destination & { districtLabel: string } => ({
  ...(item.data as unknown as Destination),
  id: item.id,
  slug: item.slug,
  name: getLocalizedText(item.title, text(item.data.name_he)),
  districtLabel: localized(item.data, 'district'),
  description: localized(item.data, 'description'),
  highlights: localizedList(item.data, 'highlights'),
});

export const viewProject = (item: PublishedItem<Record<string, unknown>>): Project => ({
  ...(item.data as unknown as Project),
  id: item.id,
  title: getLocalizedText(item.title, text(item.data.title_he)),
  description: localized(item.data, 'description'),
});

export interface TestimonialView { id: string; name: string; role: string; quote: string; rating: number; image: string }

export const viewTestimonial = (item: PublishedItem<Record<string, unknown>>): TestimonialView => ({
  id: item.id,
  name: item.title,
  role: localized(item.data, 'role'),
  quote: localized(item.data, 'quote'),
  rating: Math.max(0, Math.min(5, Number(item.data.rating) || 0)),
  image: text(item.data.image),
});
