import { properties } from '../data/properties';
import { services, projects } from '../data/services';
import { serviceDetails } from '../data/serviceDetails';
import { destinations } from '../data/destinations';
import { en } from '../i18n/en';
import { he } from '../i18n/he';
import { pageImageDefaults } from './pageImages';

export interface BuiltInItem { slug: string; title: string; data: Record<string, unknown> }

type ServiceText = { title?: string; short?: string; description?: string; [feature: string]: string | undefined };
type DestinationText = { description?: string; highlights?: string[] };

const enServices = en.translation.services as Record<string, ServiceText>;
const heServices = he.translation.services as Record<string, ServiceText>;
const heDestinationText = (he.translation as unknown as { destinationContent: Record<string, DestinationText> }).destinationContent;
const heNames = he.translation.destinationNames as Record<string, string>;

/** Hebrew feature list: the translated features first, then any untranslated ones in English (as the site showed them). */
const hebrewFeatures = (slug: string, features: string[]) =>
  features.map((feature, index) => heServices[slug]?.[`feature${index + 1}`] ?? feature);

/** The homepage cards' own bullet points and link targets, as the homepage showed them before services were editable. */
const homepageHighlights: Record<string, string[]> = {
  'plan-approvals': ['Local Authority submissions', 'UDA & NHDA approvals', 'Coastal zone compliance', 'Progress monitoring'],
  'real-estate': ['Residential & commercial sales', 'Investment property advisory', 'Property valuations', 'Due diligence & market analysis'],
  'property-management': ['Airbnb & Booking.com listings', 'Guest management 24/7', 'Professional cleaning & upkeep', 'Monthly income reporting'],
  'legal-consultation': ['Title deed & due diligence', 'Sale & purchase agreements', 'Foreign ownership advisory', 'Lease agreement drafting'],
  construction: ['New villa & house construction', 'Commercial & hospitality builds', 'Renovation & extension projects', 'Quality assurance & inspections'],
};
const homepageLinks: Record<string, string> = { 'real-estate': '/properties', hospitality: '/destinations' };

const serviceItems = services.map((service) => ({
  slug: service.slug,
  title: service.title,
  data: {
    ...service,
    link: homepageLinks[service.slug] ?? '',
    highlights: homepageHighlights[service.slug] ?? service.features.slice(0, 4),
    highlights_he: hebrewFeatures(service.slug, service.features).slice(0, 4),
    title_he: heServices[service.slug]?.title ?? '',
    short: enServices[service.slug]?.short ?? '',
    short_he: heServices[service.slug]?.short ?? '',
    summary: enServices[service.slug]?.description ?? '',
    summary_he: heServices[service.slug]?.description ?? '',
    description_he: '',
    features_he: hebrewFeatures(service.slug, service.features),
    details: serviceDetails[service.slug] ?? '',
    details_he: '',
  },
}));

const destinationItems = destinations.map((destination) => ({
  slug: destination.slug,
  title: destination.name,
  data: {
    ...destination,
    name_he: heNames[destination.name] ?? '',
    district_he: heNames[destination.district] ?? '',
    description_he: heDestinationText[destination.slug]?.description ?? '',
    highlights_he: heDestinationText[destination.slug]?.highlights ?? [],
  },
}));

const mediaUrls = new Map<string, string>();
const addMedia = (url: string | undefined, usedIn: string) => {
  if (url && !mediaUrls.has(url)) mediaUrls.set(url, usedIn);
};
properties.forEach((property) => [property.image, ...(property.images ?? [])].forEach((url) => addMedia(url, `Property: ${property.name}`)));
destinations.forEach((destination) => addMedia(destination.image, `Destination: ${destination.name}`));
projects.forEach((project) => addMedia(project.image, `Project: ${project.title}`));
Object.entries(pageImageDefaults).forEach(([page, images]) => Object.values(images).forEach(({ label, url }) => addMedia(url, `Page: ${page} — ${label}`)));

/** Content that ships with the website. It is copied into the database once per type so admins can edit or delete it. */
export const builtInContent: Record<string, BuiltInItem[]> = {
  property: properties.map((item) => ({ slug: item.slug, title: item.name, data: { ...item } })),
  service: serviceItems,
  destination: destinationItems,
  project: projects.map((item) => ({ slug: item.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), title: item.title, data: { ...item } })),
  media: [...mediaUrls].map(([url, usedIn], index) => ({ slug: `image-${index + 1}`, title: usedIn, data: { url, alt: '', usedIn } })),
};

export { importedContentSettingKey } from './contentKeys';
