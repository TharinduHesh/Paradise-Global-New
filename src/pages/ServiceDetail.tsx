import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import CTABanner from '../components/home/CTABanner';
import { useTranslation } from 'react-i18next';
import { useCatalogue, viewService } from '../lib/catalogue';
import { serviceIcon } from '../lib/serviceIcons';

const ServiceDetail: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const record = useCatalogue<Record<string, unknown>>('service').find((item) => item.slug === slug);
  const service = record && viewService(record);

  if (!service) return <div className="container-custom py-40 text-center"><h1 className="font-serif text-3xl font-bold text-navy-900">{t('serviceDetail.notFound', { defaultValue: 'Service not found' })}</h1><Link to="/services" className="btn-primary mt-6">{t('serviceDetail.viewServices', { defaultValue: 'View services' })}</Link></div>;

  const { title, description } = service;


  return <>
    <title>{title} — Paradise Global Leisures</title>
    <div className="relative overflow-hidden bg-navy-900 pb-20 pt-32">
      {service.image && <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${service.image}")` }} />}
      <div className="absolute inset-0 bg-navy-900/60" />
      <div className="relative container-custom">
        <nav className="mb-6 flex items-center gap-2 text-sm text-white/50"><Link to="/" className="hover:text-gold-400">{t('nav.home')}</Link><span>/</span><Link to="/services" className="hover:text-gold-400">{t('nav.services')}</Link><span>/</span><span className="text-gold-400">{title}</span></nav>
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">{t('home.servicesEyebrow')}</p>
        <h1 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">{title}</h1>
        <div className="gold-divider-left" /><p className="mt-5 max-w-2xl text-lg text-white/70">{description}</p>
      </div>
    </div>
    <section className="section-padding bg-beige-50"><div className="container-custom grid gap-12 lg:grid-cols-2">
      <div><p className="mb-3 text-xs font-medium uppercase tracking-widest text-gold-600">{t('serviceDetail.offer', { defaultValue: 'What we offer' })}</p><h2 className="mb-6 font-serif text-3xl font-bold text-navy-900">{t('serviceDetail.goals', { defaultValue: 'A service shaped around your goals' })}</h2>{service.features.map((feature) => <div key={feature} className="mb-4 flex items-start gap-3"><CheckCircle size={17} className="mt-0.5 flex-shrink-0 text-gold-500" /><p className="text-sm text-navy-700">{feature}</p></div>)}</div>
      <div className="rounded-sm bg-white p-8 shadow-card">{React.createElement(serviceIcon(service.icon), { className: "mb-5 text-gold-500", size: 38 })}<h2 className="mb-3 font-serif text-2xl font-bold text-navy-900">{t('serviceDetail.discuss', { defaultValue: "Let's discuss your project" })}</h2><p className="mb-7 text-sm leading-relaxed text-navy-500">{t('serviceDetail.speak', { defaultValue: 'Speak with our team and take the next step with confidence.' })}</p><Link to="/contact" className="btn-primary">{t('nav.consultation')} <ArrowRight size={16} /></Link></div>
    </div></section>
    <CTABanner />
  </>;
};

export default ServiceDetail;
