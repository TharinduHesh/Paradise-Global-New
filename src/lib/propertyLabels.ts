import type { TFunction } from 'i18next';

/**
 * Display labels for property values that are stored in English (they also drive filters), translated for the current
 * language. Unknown values are shown as stored.
 */
export const placeName = (t: TFunction, name: string | undefined) => (name ? t(`destinationNames.${name}`, { defaultValue: name }) : '');

/** "Mirissa, Matara"; the district is left out when it is the same as the location. */
export const placeLine = (t: TFunction, location: string, district: string) =>
  district && district !== location ? `${placeName(t, location)}, ${placeName(t, district)}` : placeName(t, location);

export const propertyTypeLabel = (t: TFunction, type: string) => t(`filters.propertyTypes.${type}`, { defaultValue: type });

const unitKey = (unit: string) => unit.toLowerCase().replace(/[^a-z]/g, '');
export const landUnitLabel = (t: TFunction, unit: string | undefined) => (unit ? t(`property.landUnits.${unitKey(unit)}`, { defaultValue: unit }) : '');

export const rentPeriodLabel = (t: TFunction, period: string | undefined) => (period ? t(`property.rentPeriods.${period}`, { defaultValue: period }) : '');
