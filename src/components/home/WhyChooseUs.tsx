import React from 'react';
import { Shield, Star, Clock, Users, Award, TrendingUp } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import { useTranslation } from 'react-i18next';
import { usePageImage } from '../../lib/siteContent';
import { motion } from 'motion/react';
import { EASE_INOUT } from '../../lib/motion';
import { Counter, Reveal, RevealImage, Stagger, StaggerItem } from '../motion/primitives';

const reasons = [
  {
    icon: Shield,
    title: 'Trusted & Transparent',
    description: 'Full transparency throughout every transaction. We act in your best interest, always, with clear communication and honest advice.',
  },
  {
    icon: Star,
    title: 'Premium Local Expertise',
    description: 'Deep knowledge of Sri Lanka\'s Southern Coast property market, regulations, and opportunities that only comes from years on the ground.',
  },
  {
    icon: Clock,
    title: 'End-to-End Service',
    description: 'We manage every stage of your property journey, so you don\'t have to coordinate between multiple service providers.',
  },
  {
    icon: Users,
    title: 'International Standards',
    description: 'Our team brings international best practices to every project, ensuring quality and professionalism that exceeds expectations.',
  },
  {
    icon: Award,
    title: 'Proven Track Record',
    description: 'Over a decade of successfully completed projects, satisfied clients, and properties delivering exceptional returns.',
  },
  {
    icon: TrendingUp,
    title: 'Investment Intelligence',
    description: 'We provide data-driven market insights to help you identify and capitalise on the best investment opportunities.',
  },
];

const WhyChooseUs: React.FC = () => {
  const { t } = useTranslation();
  const image = usePageImage('home', 'why');
  return (
    <section className="section-padding bg-beige-50">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Image */}
          <div className="relative" data-motion="manual">
            <RevealImage
              src={image}
              alt={t('home.teamAlt')}
              direction="left"
              className="rounded-sm h-80 md:h-[420px]"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/50 to-transparent" />
            </RevealImage>
            {/* Floating stat card */}
            <Reveal variant="up" delay={650} className="absolute -bottom-6 -right-6 rtl:right-auto rtl:-left-6 bg-white shadow-card-hover rounded-sm p-6 max-w-[200px]">
              <p className="font-serif text-4xl font-bold text-gold-500"><Counter value="10+" /></p>
              <p className="text-navy-700 font-semibold text-sm mt-1">{t('home.yearsServing')}</p>
            </Reveal>
            {/* Gold accent frame draws itself */}
            <svg aria-hidden="true" className="absolute -top-4 -left-4 rtl:left-auto rtl:-right-4 h-24 w-24 overflow-visible text-gold-400 opacity-60" viewBox="0 0 96 96" fill="none">
              <motion.rect
                x="1" y="1" width="94" height="94" rx="2" stroke="currentColor" strokeWidth="2"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: EASE_INOUT, delay: 0.5 }}
              />
            </svg>
          </div>

          {/* Right: Content */}
          <div data-motion="manual">
            <SectionHeader
              eyebrow={t('home.whyEyebrow')}
              title={t('home.whyTitle')}
              subtitle={t('home.whySubtitle')}
            />

            <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10" delay={0.2}>
              {reasons.map(({ icon: Icon, title, description }, index) => (
                <StaggerItem key={title} className="group flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-sm bg-gold-50 border border-gold-200 flex items-center justify-center transition-all duration-500 ease-luxe group-hover:bg-gold-100 group-hover:-translate-y-0.5 group-hover:shadow-gold">
                    <Icon size={20} className="text-gold-600 transition-transform duration-500 ease-luxe group-hover:scale-110" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy-900 text-sm mb-1">{t(`why.${index}.title`, { defaultValue: title })}</h4>
                    <p className="text-navy-500 text-xs leading-relaxed">{t(`why.${index}.description`, { defaultValue: description })}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
