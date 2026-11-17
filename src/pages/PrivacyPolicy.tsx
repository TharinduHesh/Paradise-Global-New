import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  return <>
    <title>{t('legal.privacyTitle')} — Paradise Global Leisures</title>
    <div className="relative bg-navy-900 pb-16 pt-32"><div className="container-custom"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">{t('legal.label')}</p><h1 className="font-serif text-4xl font-bold text-white md:text-5xl">{t('legal.privacyTitle')}</h1><p className="mt-4 text-white/60">{t('legal.effective')}</p></div></div>
    <main className="section-padding bg-beige-50"><article className="container-custom max-w-4xl"><div className="space-y-10 rounded-sm bg-white p-6 shadow-card md:p-10">
      <section><h2 className="legal-heading">{t('legal.information')}</h2><p>{t('legal.informationText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.use')}</h2><p>{t('legal.useText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.storage')}</h2><p>{t('legal.storageText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.retention')}</h2><p>{t('legal.retentionText')}</p></section>
      <section><h2 className="legal-heading">{t('legal.requests')}</h2><p>{t('legal.requestsText')} <Link className="text-gold-600 underline" to="/contact">{t('footer.contactUs')}</Link> {t('legal.requestsSuffix')}</p></section>
    </div></article></main>
  </>
};

export default PrivacyPolicy;