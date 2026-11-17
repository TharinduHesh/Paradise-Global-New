import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();
  return <>
    <title>{t('legal.termsTitle')} — Paradise Global Leisures</title>
    <div className="relative bg-navy-900 pb-16 pt-32"><div className="container-custom"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">{t('legal.label')}</p><h1 className="font-serif text-4xl font-bold text-white md:text-5xl">{t('legal.termsTitle')}</h1><p className="mt-4 text-white/60">{t('legal.effective')}</p></div></div>
    <main className="section-padding bg-beige-50"><article className="container-custom max-w-4xl"><div className="space-y-10 rounded-sm bg-white p-6 shadow-card md:p-10">
      <section><h2 className="legal-heading">{t('legal.using')}</h2><p>{t('legal.usingText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.property')}</h2><p>{t('legal.propertyText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.agreements')}</h2><p>{t('legal.agreementsText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.external')}</h2><p>{t('legal.externalText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.law')}</h2><p>{t('legal.lawText')} <Link className="text-gold-600 underline" to="/contact">{t('footer.contactUs')}</Link> {t('legal.lawSuffix')}</p></section>
    </div></article></main>
  </>
};

export default TermsOfService;