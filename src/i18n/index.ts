import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { si } from './si';

const savedLanguage = window.localStorage.getItem('pgl-language');

void i18n.use(initReactI18next).init({
  resources: { en, si },
  lng: savedLanguage === 'si' ? 'si' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language === 'si' ? 'si' : 'en';
i18n.on('languageChanged', (language) => {
  const selected = language === 'si' ? 'si' : 'en';
  window.localStorage.setItem('pgl-language', selected);
  document.documentElement.lang = selected;
});

export default i18n;
