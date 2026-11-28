import { builtInContent } from './builtInContent';

/**
 * Fills in missing Hebrew for catalogue records that still carry the website's original English.
 *
 * Records imported into the admin catalogue before full Hebrew existed have empty or partly English `_he` fields. For each
 * `<field>_he` the original record translates, this uses the original Hebrew only when:
 * - the record's own Hebrew is missing (blank, or a list with untranslated entries), and
 * - the record's English for that field is still exactly the original English.
 * So anything an admin has written or edited is never replaced.
 */

const HEBREW = /[֐-׿]/;

const isMissing = (value: unknown) => {
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0 || value.some((entry) => typeof entry === 'string' && entry.trim() && !HEBREW.test(entry));
  return value === undefined || value === null;
};
const hasContent = (value: unknown) => (typeof value === 'string' ? Boolean(value.trim()) : Array.isArray(value) && value.length > 0);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function fillHebrew<T extends object>(type: string, slug: string, data: T, title?: string): T {
  const original = builtInContent[type]?.find((item) => item.slug === slug);
  if (!original) return data;
  const record = data as Record<string, unknown>;
  let filled: Record<string, unknown> | null = null;
  for (const [key, hebrew] of Object.entries(original.data)) {
    if (!key.endsWith('_he') || !hasContent(hebrew) || !isMissing(record[key])) continue;
    const field = key.slice(0, -3);
    // The name/title may live on the record itself rather than in its data.
    const english = record[field] ?? ((field === 'name' || field === 'title') ? title : undefined);
    const originalEnglish = original.data[field] ?? ((field === 'name' || field === 'title') ? original.title : undefined);
    if (english === undefined || !same(english, originalEnglish)) continue;
    filled ??= { ...record };
    filled[key] = hebrew;
  }
  return (filled ?? data) as T;
}
