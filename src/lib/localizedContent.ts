import i18n from '../i18n';

export type LocalizedRecord = Record<string, unknown>;

export function getLocalizedText(
  value: string,
  hebrewValue: string | undefined,
  language = i18n.resolvedLanguage ?? i18n.language,
): string {
  if (language === 'he' && hebrewValue?.trim()) return hebrewValue;
  return value;
}

export function getLocalizedList(
  values: string[],
  hebrewValues: string[] | undefined,
  language = i18n.resolvedLanguage ?? i18n.language,
): string[] {
  if (language === 'he' && hebrewValues?.length) return hebrewValues;
  return values;
}

export function getLocalizedField(
  item: LocalizedRecord,
  field: string,
  language = i18n.resolvedLanguage ?? i18n.language,
): unknown {
  if (language === 'he') {
    const hebrewValue = item[`${field}_he`];
    if (typeof hebrewValue === 'string' && hebrewValue.trim()) return hebrewValue;
    if (Array.isArray(hebrewValue) && hebrewValue.length) return hebrewValue;
  }
  return item[field];
}
