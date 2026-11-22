import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { he } from './he';

// Storage can be unavailable (private browsing, in-app browsers); the site must still load and switch language.
const readLanguage = () => { try { return window.localStorage.getItem('pgl-language'); } catch { return null; } };
const saveLanguage = (language: string) => { try { window.localStorage.setItem('pgl-language', language); } catch { /* not remembered */ } };
const savedLanguage = readLanguage();
if (savedLanguage === 'si') saveLanguage('en');
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
    saveLanguage(selected);
  }
  applyDocumentLocale(selected);
});

export default i18n;
