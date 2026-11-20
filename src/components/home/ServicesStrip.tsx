import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Home, Building2, Scale, PenTool, HardHat, ArrowRight } from 'lucide-react';
import { getPublishedContent } from '../../lib/publishedContent';
import type { Service } from '../../types';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../../lib/localizedContent';

const services = [
  {
    icon: FileCheck,
    title: 'Paradise Development Solutions',
    short: 'Approval assistance and authority coordination',
    href: '/services/plan-approvals',
  },
  {
    icon: Home,
    title: 'Paradise Real Estate',
    short: 'Buy, sell, lease & invest',
    href: '/properties',
  },
  {
    icon: Building2,
    title: 'Paradise Property Care',
    short: 'Reliable management and maintenance',
    href: '/services/property-management',
  },
  {
    icon: Scale,
    title: 'Paradise Legal Solutions',
    short: 'Legal coordination and property advice',
    href: '/services/legal-consultation',
  },
  {
    icon: Building2,
    title: 'Paradise Hospitality Collection',
    short: 'Hotels, resorts, villas & destinations',
    href: '/destinations',
  },
  {
    icon: HardHat,
    title: 'Paradise Design & Construction',
    short: 'Architecture, engineering & construction',
    href: '/services/construction',
  },
];

const ServicesStrip: React.FC = () => {
  const { t } = useTranslation();
  const [visibleServices, setVisibleServices] = useState(services);
  useEffect(() => {
    getPublishedContent<Service>('service')
      .then((published) => {
        if (published.length) {
          setVisibleServices(published.map((item) => ({
            icon: ({ FileCheck, Home, Building2, Scale, PenTool, HardHat } as Record<string, typeof FileCheck>)[item.data.icon] ?? FileCheck,
            title: getLocalizedText(item.title, item.data.title_he),
            short: getLocalizedText(item.data.description, item.data.description_he),
            href: `/services/${item.slug}`,
          })));
        }
      })
      .catch(() => undefined);
  }, []);
  return (
    <section className="bg-navy-950 border-t border-white/10">
      {/* Label bar */}
      <div className="border-b border-white/10 py-3">
        <div className="container-custom flex items-center justify-between">
          <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.2em]">
            {t('home.coreServices')}
          </p>
          <Link
            to="/services"
            className="flex items-center gap-1.5 text-white/50 text-xs hover:text-gold-400 transition-colors"
          >
            {t('home.viewAll')} <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* 6 service tiles */}
      <div className="container-custom">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-white/10">
          {visibleServices.map(({ icon: Icon, title, short, href }) => {
            const slug = href.split('/').pop() ?? '';
            return (
            <Link
              key={title}
              to={href}
              className="group flex flex-col items-center text-center gap-3 px-4 py-6 border border-transparent transition-all duration-300 hover:border-gold-400 hover:bg-gold-900/20"
            >
              <div className="w-12 h-12 rounded-full border border-gold-400/40 text-gold-400 flex items-center justify-center transition-all duration-300 group-hover:border-gold-400 group-hover:bg-gold-500/10 group-hover:scale-110">
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-sm text-white group-hover:text-gold-400 transition-colors leading-tight mb-1">
                  {t(`services.${slug}.title`, { defaultValue: title })}
                </p>
                <p className="text-white/40 text-xs leading-tight group-hover:text-white/60 transition-colors">
                  {t(`services.${slug}.short`, { defaultValue: short })}
                </p>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesStrip;
