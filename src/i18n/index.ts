import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { he } from './he';

const savedLanguage = window.localStorage.getItem('pgl-language');
if (savedLanguage === 'si') window.localStorage.setItem('pgl-language', 'en');
const selectedLanguage = savedLanguage === 'he' ? 'he' : 'en';

void i18n.use(initReactI18next).init({
  resources: { en, he },
  lng: selectedLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Re-render when admin-edited text is added at runtime (see SiteContentProvider).
  react: { bindI18nStore: 'added' },
});

const applyDocumentLocale = (language: string) => {
  const selected = language === 'he' ? 'he' : 'en';
  document.documentElement.lang = selected;
  document.documentElement.dir = selected === 'he' ? 'rtl' : 'ltr';
};

applyDocumentLocale(selectedLanguage);
i18n.on('languageChanged', (language) => {
  const selected = language === 'he' ? 'he' : 'en';
  if (!window.location.pathname.startsWith('/admin')) {
    window.localStorage.setItem('pgl-language', selected);
  }
  applyDocumentLocale(selected);
});

export default i18n;
