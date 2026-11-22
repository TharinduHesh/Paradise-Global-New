import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageImage, useCompany, whatsappHref } from '../../lib/siteContent';

const CTABanner: React.FC = () => {
  const { t } = useTranslation();
  const company = useCompany();
  const background = usePageImage('home', 'cta');
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url('${background}')` }}
      />
      <div className="absolute inset-0 bg-navy-900/85" />

      {/* Gold line decorations */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />

      <div className="relative container-custom text-center">
        <p className="text-gold-400 text-sm font-medium uppercase tracking-[0.2em] mb-4">
          {t('home.ctaEyebrow')}
        </p>
        <h2 className="font-serif text-white text-3xl md:text-4xl lg:text-5xl font-bold mb-6 max-w-3xl mx-auto leading-tight">
          {t('home.ctaTitle')}
        </h2>
        <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">
          {t('home.ctaSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/properties" className="btn-primary text-base px-8 py-4">
            {t('home.explore')} <ArrowRight size={18} />
          </Link>
          <Link to="/contact" className="btn-outline text-base px-8 py-4">
            {t('home.consultation')} <ArrowRight size={18} />
          </Link>
          <a
            href={whatsappHref(company.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors text-base"
          >
            <Phone size={18} /> {t('home.whatsapp')}
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
