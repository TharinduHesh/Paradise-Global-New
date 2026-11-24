import { serviceIcons } from './serviceIcons';

/** How each record type is edited in Website Management. Fields not listed here are kept untouched when saving. */
export type FieldKind = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'list' | 'image' | 'images' | 'json';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  hebrew?: boolean;
  help?: string;
  optional?: boolean;
}

export interface TypeSchema {
  label: string;
  singular: string;
  titleLabel: string;
  /** The data field the website reads the record's name from. */
  titleField: 'name' | 'title';
  publishLabels: [string, string, string, string];
  fields: FieldDef[];
}

const visibility: TypeSchema['publishLabels'] = ['Published', 'Draft', 'Publish', 'Unpublish'];

export const contentSchemas: Record<string, TypeSchema> = {
  property: {
    label: 'Properties', singular: 'property', titleLabel: 'Property name', titleField: 'name', publishLabels: visibility,
    fields: [
      { key: 'name_he', label: 'Property name (Hebrew)', kind: 'text', hebrew: true },
      { key: 'location', label: 'Location', kind: 'text' },
      { key: 'district', label: 'District', kind: 'text', help: 'Used by the location filter, e.g. Galle or Matara.' },
      { key: 'propertyType', label: 'Property type', kind: 'select', options: ['Villa', 'House', 'Land', 'Apartment', 'Commercial', 'Hotel'] },
      { key: 'status', label: 'Availability', kind: 'select', options: ['available', 'sold', 'rented'] },
      { key: 'priceType', label: 'Listing type', kind: 'select', options: ['sale', 'rent'] },
      { key: 'rentPeriod', label: 'Rent period', kind: 'select', options: ['', 'night', 'month'], optional: true },
      { key: 'price', label: 'Price', kind: 'number' },
      { key: 'priceUnit', label: 'Currency', kind: 'select', options: ['USD', 'LKR'] },
      { key: 'bedrooms', label: 'Bedrooms', kind: 'number' },
      { key: 'bathrooms', label: 'Bathrooms', kind: 'number' },
      { key: 'landSize', label: 'Land size', kind: 'number' },
      { key: 'landUnit', label: 'Land unit', kind: 'select', options: ['perches', 'acres', 'sq ft'] },
      { key: 'buildingSize', label: 'Building size (sq ft)', kind: 'number', optional: true },
      { key: 'yearBuilt', label: 'Year built', kind: 'number', optional: true },
      { key: 'isBeachfront', label: 'Beachfront', kind: 'checkbox' },
      { key: 'isFeatured', label: 'Feature on homepage', kind: 'checkbox' },
      { key: 'image', label: 'Main image', kind: 'image' },
      { key: 'images', label: 'Gallery images', kind: 'images' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'description_he', label: 'Description (Hebrew)', kind: 'textarea', hebrew: true },
      { key: 'features', label: 'Features', kind: 'list' },
      { key: 'features_he', label: 'Features (Hebrew)', kind: 'list', hebrew: true },
    ],
  },
  service: {
    label: 'Services', singular: 'service', titleLabel: 'Service / division name', titleField: 'title',
    publishLabels: ['Active', 'Inactive', 'Activate', 'Deactivate'],
    fields: [
      { key: 'title_he', label: 'Name (Hebrew)', kind: 'text', hebrew: true },
      { key: 'icon', label: 'Icon', kind: 'select', options: Object.keys(serviceIcons) },
      { key: 'image', label: 'Image', kind: 'image', optional: true },
      { key: 'link', label: 'Homepage link', kind: 'text', optional: true, help: 'Optional. Where the homepage cards link to, e.g. /properties. Leave blank to use the service page.' },
      { key: 'short', label: 'Short tagline (homepage strip)', kind: 'text' },
      { key: 'short_he', label: 'Short tagline (Hebrew)', kind: 'text', hebrew: true },
      { key: 'summary', label: 'Summary (homepage card)', kind: 'textarea' },
      { key: 'summary_he', label: 'Summary (Hebrew)', kind: 'textarea', hebrew: true },
      { key: 'highlights', label: 'Homepage bullet points', kind: 'list' },
      { key: 'highlights_he', label: 'Homepage bullet points (Hebrew)', kind: 'list', hebrew: true },
      { key: 'description', label: 'Full description (service pages)', kind: 'textarea' },
      { key: 'description_he', label: 'Full description (Hebrew)', kind: 'textarea', hebrew: true },
      { key: 'features', label: 'Features (service pages)', kind: 'list' },
      { key: 'features_he', label: 'Features (Hebrew)', kind: 'list', hebrew: true },
      { key: 'details', label: 'Detailed page content (service pages)', kind: 'textarea', optional: true, help: 'Shown on the service page. Start a part with "# Title", a section with "## Heading"; leave a blank line between paragraphs. The last section of each part is shown as the call to action.' },
      { key: 'details_he', label: 'Detailed page content (Hebrew)', kind: 'textarea', optional: true, hebrew: true },
      { key: 'process', label: 'Process steps', kind: 'json', optional: true, help: 'List of steps: [{ "step": 1, "title": "", "description": "", "icon": "MessageSquare" }].' },
    ],
  },
  destination: {
    label: 'Destinations', singular: 'destination', titleLabel: 'Destination name', titleField: 'name', publishLabels: visibility,
    fields: [
      { key: 'name_he', label: 'Name (Hebrew)', kind: 'text', hebrew: true },
      { key: 'district', label: 'District', kind: 'text' },
      { key: 'district_he', label: 'District (Hebrew)', kind: 'text', hebrew: true },
      { key: 'propertyCount', label: 'Number of properties shown', kind: 'number' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'description_he', label: 'Description (Hebrew)', kind: 'textarea', hebrew: true },
      { key: 'highlights', label: 'Highlights', kind: 'list' },
      { key: 'highlights_he', label: 'Highlights (Hebrew)', kind: 'list', hebrew: true },
    ],
  },
  project: {
    label: 'Projects', singular: 'project', titleLabel: 'Project title', titleField: 'title', publishLabels: visibility,
    fields: [
      { key: 'title_he', label: 'Title (Hebrew)', kind: 'text', hebrew: true },
      { key: 'location', label: 'Location', kind: 'text' },
      { key: 'type', label: 'Project type', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'select', options: ['completed', 'ongoing', 'upcoming'] },
      { key: 'year', label: 'Year', kind: 'number' },
      { key: 'client', label: 'Client', kind: 'text', optional: true },
      { key: 'area', label: 'Area', kind: 'text', optional: true },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'description_he', label: 'Description (Hebrew)', kind: 'textarea', hebrew: true },
    ],
  },
  testimonial: {
    label: 'Testimonials', singular: 'testimonial', titleLabel: 'Client name', titleField: 'name', publishLabels: visibility,
    fields: [
      { key: 'role', label: 'Client detail (e.g. "Villa owner, Galle")', kind: 'text', optional: true },
      { key: 'role_he', label: 'Client detail (Hebrew)', kind: 'text', hebrew: true, optional: true },
      { key: 'quote', label: 'Testimonial', kind: 'textarea' },
      { key: 'quote_he', label: 'Testimonial (Hebrew)', kind: 'textarea', hebrew: true },
      { key: 'rating', label: 'Star rating (0–5)', kind: 'number' },
      { key: 'image', label: 'Client photo', kind: 'image', optional: true },
    ],
  },
  media: {
    label: 'Media library', singular: 'image', titleLabel: 'Image name', titleField: 'name', publishLabels: visibility,
    fields: [
      { key: 'url', label: 'Image', kind: 'image' },
      { key: 'alt', label: 'Alt text (describes the image)', kind: 'text', optional: true },
      { key: 'usedIn', label: 'Where it is used / notes', kind: 'text', optional: true },
    ],
  },
};

export const blankValue = (field: FieldDef): unknown => {
  switch (field.kind) {
    case 'number': return field.optional ? undefined : 0;
    case 'checkbox': return false;
    case 'list': case 'images': return [];
    case 'select': return field.optional ? '' : field.options?.[0] ?? '';
    case 'json': return field.optional ? undefined : [];
    default: return '';
  }
};

export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
