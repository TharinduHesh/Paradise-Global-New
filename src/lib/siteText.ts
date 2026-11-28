import { en } from '../i18n/en';
import { he } from '../i18n/he';
import { pageImageDefaults } from './pageImages';

/**
 * Website text is edited as groups. A 'page' group is the text (and images) of one page; a 'translation' group is
 * site-wide text such as the menu or footer. The bundled English/Hebrew text is the original; the catalogue record for a
 * group stores only the admin's changes, so deleting the record restores the original.
 */
export interface TextGroup { slug: string; title: string; namespaces: string[]; images?: string }

export const pageGroups: TextGroup[] = [
  { slug: 'home', title: 'Homepage', namespaces: ['home', 'why'], images: 'home' },
  { slug: 'about', title: 'About Us', namespaces: ['about'], images: 'about' },
  { slug: 'services', title: 'Services pages', namespaces: ['serviceDetail'], images: 'services' },
  { slug: 'properties', title: 'Property pages', namespaces: ['propertiesPage', 'filters', 'property'] },
  { slug: 'destinations', title: 'Hospitality Collection page', namespaces: ['destinationsPage'] },
  { slug: 'contact', title: 'Contact page', namespaces: ['contact'], images: 'contact' },
  { slug: 'reviews', title: 'Reviews page & review form', namespaces: ['reviews'] },
  { slug: 'projects', title: 'Projects page', namespaces: [], images: 'projects' },
  { slug: 'legal', title: 'Privacy Policy & Terms', namespaces: ['legal'] },
];

export const translationGroups: TextGroup[] = [
  { slug: 'navigation', title: 'Navigation menu & language switcher', namespaces: ['nav', 'language'] },
  { slug: 'footer', title: 'Footer', namespaces: ['footer'] },
  { slug: 'common', title: 'Buttons, messages & maintenance page', namespaces: ['common', 'notFound', 'maintenance'] },
  { slug: 'place-names', title: 'Place names', namespaces: ['destinationNames'] },
];

export const textGroups: Record<string, TextGroup[]> = { page: pageGroups, translation: translationGroups };

export type FlatText = Record<string, string>;
export interface TextOverrides { en?: FlatText; he?: FlatText; images?: Record<string, string> }

const resources = { en: en.translation as Record<string, unknown>, he: he.translation as Record<string, unknown> };

const flatten = (value: unknown, prefix: string, out: FlatText) => {
  if (typeof value === 'string') out[prefix] = value;
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => flatten(child, `${prefix}.${key}`, out));
  return out;
};

/** The original text of a group, keyed like `home.heroTitle` or `about.teamList.0.name`. */
export const originalText = (group: TextGroup, language: 'en' | 'he'): FlatText => {
  const out: FlatText = {};
  group.namespaces.forEach((namespace) => flatten(resources[language][namespace], namespace, out));
  return out;
};

export const originalImages = (group: TextGroup): Record<string, { label: string; url: string }> =>
  group.images ? pageImageDefaults[group.images] ?? {} : {};

/** Turns `{ 'about.teamList.0.name': 'x' }` into `{ about: { teamList: [{ name: 'x' }] } }` for i18next. */
export const unflatten = (flat: FlatText) => {
  const root: Record<string, unknown> = {};
  Object.entries(flat).forEach(([path, text]) => {
    const parts = path.split('.');
    let node: Record<string, unknown> = root;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) { node[part] = text; return; }
      node[part] ??= /^\d+$/.test(parts[index + 1]) ? [] : {};
      node = node[part] as Record<string, unknown>;
    });
  });
  return root;
};
