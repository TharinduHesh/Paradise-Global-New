import React from 'react';
import { Quote, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeader from '../ui/SectionHeader';
import { useCatalogue, viewTestimonial } from '../../lib/catalogue';

/** Client testimonials managed in the admin panel. Renders nothing until at least one is published. */
const Testimonials: React.FC = () => {
  const { t } = useTranslation();
  const testimonials = useCatalogue<Record<string, unknown>>('testimonial').map(viewTestimonial).filter((item) => item.quote.trim());
  if (!testimonials.length) return null;
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <SectionHeader eyebrow={t('home.testimonialsEyebrow')} title={t('home.testimonialsTitle')} centered />
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {testimonials.map((item) => (
            <figure key={item.id} className="flex w-full flex-col md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] rounded-sm border border-beige-200 bg-beige-50 p-7 shadow-card">
              <Quote size={28} className="mb-4 text-gold-500" aria-hidden="true" />
              {item.rating > 0 && (
                <div className="mb-3 flex gap-0.5" aria-label={`${item.rating} / 5`}>
                  {Array.from({ length: item.rating }, (_, index) => <Star key={index} size={14} className="fill-gold-500 text-gold-500" />)}
                </div>
              )}
              <blockquote className="flex-1 text-sm leading-relaxed text-navy-700">{item.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-beige-200 pt-5">
                {item.image && <img src={item.image} alt="" className="h-11 w-11 rounded-full object-cover" />}
                <div>
                  <p className="font-serif font-semibold text-navy-900">{item.name}</p>
                  {item.role && <p className="text-xs text-navy-500">{item.role}</p>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
