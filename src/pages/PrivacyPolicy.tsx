import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();
  return <>
    <title>{t('legal.privacyTitle')} — Paradise Global Leisures</title>
    <div className="relative bg-navy-900 pb-16 pt-32"><div className="container-custom"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">Legal</p><h1 className="font-serif text-4xl font-bold text-white md:text-5xl">{t('legal.privacyTitle')}</h1><p className="mt-4 text-white/60">{t('legal.effective')}</p></div></div>
    <main className="section-padding bg-beige-50"><article className="container-custom max-w-4xl"><div className="space-y-10 rounded-sm bg-white p-6 shadow-card md:p-10">
      <section><h2 className="legal-heading">{t('legal.information')}</h2><p>When you submit an enquiry, Paradise Global Leisures collects your name, email address, and message. If you choose to provide them, we also collect your phone or WhatsApp number, the service you are interested in, and your preferred property location. Our hosting and security services may process technical information such as IP addresses and request logs.</p></section>
      <section><h2 className="legal-heading">{t('legal.use')}</h2><p>We use enquiry details to respond to you, understand your property needs, discuss relevant services, and follow up on your request. We use technical information to operate, troubleshoot, and protect the website.</p></section>
      <section><h2 className="legal-heading">{t('legal.storage')}</h2><p>We use Cloudflare to host the website and store enquiries. This may involve processing outside Sri Lanka. Authorized team members may access your enquiry to handle your request. We may share relevant details with service providers where needed to respond to your request or where required by law.</p></section>
      <section><h2 className="legal-heading">{t('legal.retention')}</h2><p>We keep enquiry information for as long as reasonably necessary to handle your request, maintain relevant business records, and meet applicable legal obligations.</p></section>
      <section><h2 className="legal-heading">{t('legal.requests')}</h2><p>You can use our <Link className="text-gold-600 underline" to="/contact">{t('footer.contactUs')}</Link> page to ask about your information, request access, correction, or deletion, or raise a privacy concern. We may verify your identity before responding and will handle requests in accordance with applicable law.</p></section>
    </div></article></main>
  </>
};

export default PrivacyPolicy;