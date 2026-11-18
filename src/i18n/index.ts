import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { he } from './he';

const savedLanguage = window.localStorage.getItem('pgl-language');
const selectedLanguage = savedLanguage === 'he' ? 'he' : 'en';
if (savedLanguage === 'si') window.localStorage.setItem('pgl-language', 'en');

void i18n.use(initReactI18next).init({
  resources: { en, he },
  lng: selectedLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const applyDocumentLocale = (language: string) => {
  const selected = language === 'he' ? 'he' : 'en';
  document.documentElement.lang = selected;
  document.documentElement.dir = selected === 'he' ? 'rtl' : 'ltr';
};

applyDocumentLocale(selectedLanguage);
i18n.on('languageChanged', (language) => {
  const selected = language === 'he' ? 'he' : 'en';
  window.localStorage.setItem('pgl-language', selected);
  applyDocumentLocale(selected);
});

export default i18n;
