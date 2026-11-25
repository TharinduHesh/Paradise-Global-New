import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';
import { getPublishedContent } from './publishedContent';
import { pageImageDefaults } from './pageImages';
import { unflatten, type TextOverrides } from './siteText';

import { defaultCompany, type CompanyInfo } from './companyInfo';

export { defaultCompany, type CompanyInfo };

interface SiteContent { images: Record<string, Record<string, string>>; company: CompanyInfo }
const SiteContentContext = createContext<SiteContent>({ images: {}, company: defaultCompany });

/** Loads admin-edited page text, page images and business info, and applies them over the website's original content. */
export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>({ images: {}, company: defaultCompany });
  useEffect(() => {
    let active = true;
    Promise.all([getPublishedContent<TextOverrides>('page'), getPublishedContent<TextOverrides>('translation')])
      .then(([pages, translations]) => {
        if (!active) return;
        const images: SiteContent['images'] = {};
        [...pages, ...translations].forEach((record) => {
          (['en', 'he'] as const).forEach((language) => {
            const text = record.data[language];
            if (text && Object.keys(text).length) i18n.addResourceBundle(language, 'translation', unflatten(text), true, true);
          });
          if (record.data.images) images[record.slug] = record.data.images;
        });
        setContent((current) => ({ ...current, images }));
      })
      .catch(() => undefined);
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ settings: { company?: Partial<CompanyInfo> } }> : Promise.reject())
      .then((result) => {
        if (!active) return;
        const saved = Object.fromEntries(Object.entries(result.settings.company ?? {}).filter(([, value]) => typeof value === 'string' && value.trim()));
        setContent((current) => ({ ...current, company: { ...defaultCompany, ...saved } }));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
};

/** A page image: the admin's replacement if there is one, otherwise the original. */
export const usePageImage = (page: string, key: string) => {
  const { images } = useContext(SiteContentContext);
  return images[page]?.[key]?.trim() || pageImageDefaults[page]?.[key]?.url || '';
};

export const useCompany = () => useContext(SiteContentContext).company;

/** Address and hours split into display lines (address on commas, hours on semicolons). */
export const companyLines = (company: CompanyInfo, field: 'address' | 'hours') => {
  return company[field].split(field === 'address' ? /\s*[,\n]\s*/ : /\s*[;\n]\s*/).filter(Boolean);
};

/** Splits the phone setting into separate numbers, e.g. "Uvindu - 077… / Chandika - 077…" gives two entries. */
export const phoneNumbers = (phone: string) => phone.split(/\s*[/;\n]\s*/).map((entry) => entry.replace(/\s+/g, ' ').trim()).filter(Boolean);

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '').replace(/^0/, '+94')}`;
export const whatsappHref = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, '').replace(/^0/, '94')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
