import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { useTranslation } from 'react-i18next';
import { useCatalogue, viewService } from '../../lib/catalogue';
import { serviceIcon } from '../../lib/serviceIcons';

const ServicesOverview: React.FC = () => {
  const { t } = useTranslation();
  const visibleServices = useCatalogue<Record<string, unknown>>('service').map(viewService);
  return (
    <section className="section-padding bg-beige-50">
      <div className="container-custom">
        <SectionHeader
          eyebrow={t('home.servicesEyebrow')}
          title={t('home.servicesTitle')}
          subtitle={t('home.servicesSubtitle')}
          centered
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {visibleServices.map(({ id, icon, title: localizedTitle, summary: localizedDescription, highlights: localizedBullets, href }, index) => {
            const Icon = serviceIcon(icon);
            const number = String(index + 1).padStart(2, '0');
            return (
            <div
              key={id}
              className="group bg-white rounded-sm shadow-card border border-beige-200 overflow-hidden card-hover flex flex-col"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gold-500" />

              <div className="p-7 flex flex-col flex-1">
                {/* Header row */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-sm border-2 border-gold-200 bg-gold-50 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                    <Icon size={26} className="text-gold-600" />
                  </div>
                  <span className="font-serif text-5xl font-bold text-beige-300 leading-none select-none">
                    {number}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif font-bold text-navy-900 text-xl mb-3 group-hover:text-gold-600 transition-colors">
                  {localizedTitle}
                </h3>

                {/* Description */}
                <p className="text-navy-500 text-sm leading-relaxed mb-5">
                  {localizedDescription}
                </p>

                {/* Bullet points */}
                <ul className="space-y-2 mb-6 flex-1">
                  {localizedBullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-navy-700">
                      <CheckCircle size={14} className="flex-shrink-0 text-gold-600" />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={href}
                  className="flex items-center gap-2 text-sm font-semibold text-gold-600 group-hover:gap-3 transition-all duration-200 mt-auto pt-5 border-t border-beige-200"
                >
                  {t('common.learnMore')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center bg-navy-900 rounded-sm p-8 md:p-12">
          <p className="text-gold-400 text-sm uppercase tracking-widest font-medium mb-3">{t('home.servicesCtaEyebrow')}</p>
          <h3 className="font-serif text-white text-2xl md:text-3xl font-bold mb-4">
            {t('home.servicesCtaTitle')}
          </h3>
          <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-8">
            {t('home.servicesCtaText')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/contact" className="btn-primary">
              {t('home.freeConsultation')} <ArrowRight size={16} />
            </Link>
            <Link to="/services" className="btn-outline">
              {t('home.exploreServices')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesOverview;
