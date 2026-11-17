import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { FileCheck, Home, Building2, Scale, PenTool, HardHat } from 'lucide-react';
import CTABanner from '../components/home/CTABanner';
import { services } from '../data/services';
import type { Service } from '../types';
import { getPublishedContent } from '../lib/publishedContent';
import { useTranslation } from 'react-i18next';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileCheck, Home, Building2, Scale, PenTool, HardHat
};

const Services: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Service[]>(services);
  useEffect(() => {
    getPublishedContent<Service>('service')
      .then((published) => { if (published.length) setItems(published.map((item) => ({ ...item.data, id: item.id, slug: item.slug, title: item.title }))); })
      .catch(() => undefined);
  }, []);
  return (
    <>
      <title>Our Services — Paradise Global Leisures</title>

      {/* Page Header */}
      <div className="relative pt-32 pb-20 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')` }} />
        <div className="relative container-custom text-center">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">{t('home.servicesEyebrow')}</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">{t('nav.services')}</h1>
          <div className="gold-divider" />
          <p className="text-white/70 text-lg mt-5 max-w-2xl mx-auto">
            {t('home.servicesSubtitle')}
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <section className="section-padding bg-beige-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 gap-12">
            {items.map((service, idx) => {
              const Icon = iconMap[service.icon] || FileCheck;
              const isEven = idx % 2 === 0;

              return (
                <div key={service.id} className="bg-white rounded-sm shadow-card border border-beige-200 overflow-hidden">
                  <div className={`grid grid-cols-1 lg:grid-cols-2 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    {/* Image Side */}
                    <div className={`relative h-64 lg:h-auto overflow-hidden ${!isEven ? 'lg:order-2' : ''}`}>
                      <div className="absolute inset-0 bg-navy-900 flex items-center justify-center">
                        {service.image && <img src={service.image} alt={service.title} className="absolute inset-0 h-full w-full object-cover opacity-50" />}
                        <Icon size={80} className="relative text-gold-500/30" />
                        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" style={{ opacity: 0.85 }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Icon size={60} className="text-gold-400 mx-auto mb-4" />
                            <p className="text-white/60 text-sm uppercase tracking-widest">Service {String(idx + 1).padStart(2, '0')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Side */}
                    <div className={`p-8 lg:p-10 ${!isEven ? 'lg:order-1' : ''}`}>
                      <p className="text-gold-500 text-xs uppercase tracking-widest font-medium mb-3">
                        Service {String(idx + 1).padStart(2, '0')}
                      </p>
                      <h2 className="font-serif text-navy-900 text-2xl md:text-3xl font-bold mb-4">
                        {t(`services.${service.slug}.title`, { defaultValue: service.title })}
                      </h2>
                      <p className="text-navy-600 leading-relaxed mb-6">
                        {t(`services.${service.slug}.description`, { defaultValue: service.description })}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {service.features.map((feature, featureIndex) => (
                          <div key={feature} className="flex items-start gap-2.5">
                            <CheckCircle size={15} className="text-gold-500 flex-shrink-0 mt-0.5" />
                            <span className="text-navy-700 text-sm">{t(`services.${service.slug}.feature${featureIndex + 1}`, { defaultValue: feature })}</span>
                          </div>
                        ))}
                      </div>

                      <Link
                        to={`/services/${service.slug}`}
                        className="btn-primary inline-flex"
                      >
                        {t('common.learnMore')} <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
};

export default Services;
