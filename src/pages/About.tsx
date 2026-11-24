import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Globe, Users, TrendingUp, ArrowRight, CheckCircle, MapPin } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import CTABanner from '../components/home/CTABanner';
import { useTranslation } from 'react-i18next';
import { Counter } from '../components/motion/primitives';
import { usePageImage } from '../lib/siteContent';

const teamMembers = [
  {
    name: 'Managing Director',
    role: 'Founder & CEO',
    image: 'https://images.unsplash.com/photo-1560250097-0dc05888d69a?w=400&q=80',
    bio: 'Over 15 years in Sri Lankan property development and international real estate investment.',
  },
  {
    name: 'Head of Real Estate',
    role: 'Senior Property Consultant',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80',
    bio: 'Specialist in coastal property acquisitions with an extensive network across Southern Sri Lanka.',
  },
  {
    name: 'Chief Architect',
    role: 'Lead Architect & Designer',
    image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=400&q=80',
    bio: 'Chartered architect with expertise in tropical luxury design and sustainable construction.',
  },
  {
    name: 'Legal Director',
    role: 'Property Law Specialist',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
    bio: 'Attorney-at-law with 12+ years specialising in property law, title deeds, and foreign investment.',
  },
];

const values = [
  { icon: Award, title: 'Excellence', description: 'We pursue excellence in every project, holding ourselves to the highest standards of quality and professionalism.' },
  { icon: Globe, title: 'Global Perspective', description: 'International thinking combined with deep local expertise — the best of both worlds for our clients.' },
  { icon: Users, title: 'Client-First', description: 'Your success is our success. We build long-term relationships built on trust, transparency, and results.' },
  { icon: TrendingUp, title: 'Innovation', description: 'We continuously evolve our services and technology to stay ahead in the market for your benefit.' },
];

const About: React.FC = () => {
  const { t, i18n } = useTranslation();
  const profileSections = t('about.profileSections', { returnObjects: true }) as unknown as { title: string; text: string }[];
  // The profile may only exist in English; keep it left to right on the Hebrew site.
  const profileLang = i18n.language === 'he' && !i18n.getResource('he', 'translation', 'about.profileTitle') ? 'en' : undefined;
  const headerImage = usePageImage('about', 'header');
  const storyImage = usePageImage('about', 'story');
  const teamImages = [usePageImage('about', 'team0'), usePageImage('about', 'team1'), usePageImage('about', 'team2'), usePageImage('about', 'team3')];
  return (
    <>
      <title>{t('about.title')} — Paradise Global Leisures</title>

      {/* Page Header */}
      <div className="relative pt-32 pb-20 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('${headerImage}')` }} />
        <div className="relative container-custom text-center">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">{t('about.title')}</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">Paradise Global Leisures</h1>
          <div className="gold-divider" />
          <p className="text-white/70 text-lg mt-5 max-w-2xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeader
                eyebrow={t('about.story')}
                title={t('about.storyTitle')}
                subtitle={t('about.storyText')}
              />
              <div className="mt-8 space-y-4">
                {[1, 2, 3, 4].map((pointNumber) => (
                  <div key={pointNumber} className="flex gap-3">
                    <CheckCircle size={18} className="text-gold-500 flex-shrink-0 mt-0.5" />
                    <p className="text-navy-600 text-sm">{t(`about.point${pointNumber}`)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex gap-4">
                <Link to="/services" className="btn-primary">{t('about.services')} <ArrowRight size={16} /></Link>
                <Link to="/contact" className="btn-navy">{t('about.contact')}</Link>
              </div>
            </div>
            <div className="relative">
              <img
                src={storyImage}
                alt="Sri Lanka coastal property"
                className="w-full h-80 object-cover rounded-sm shadow-2xl md:h-[420px]"
              />
              <div className="absolute -bottom-6 -left-6 bg-navy-900 text-white rounded-sm p-6 shadow-xl">
                <p className="font-serif text-4xl font-bold text-gold-400">2014</p>
                <p className="text-white/70 text-sm">{t('about.established')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company profile */}
      <section className="section-padding bg-beige-50" lang={profileLang} dir={profileLang === 'en' ? 'ltr' : undefined}>
        <div className="container-custom">
          <SectionHeader eyebrow={t('about.profileEyebrow')} title={t('about.profileTitle')} subtitle={t('about.profileIntro')} />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {profileSections.map((section) => (
              <article key={section.title} className="rounded-sm border border-beige-200 bg-white p-6 shadow-card">
                <h3 className="mb-3 font-serif text-xl font-semibold text-navy-900">{section.title}</h3>
                <p className="text-sm leading-relaxed text-navy-600">{section.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4 rounded-sm bg-navy-900 p-6 text-white md:flex-row md:items-center md:gap-8 md:p-8">
            <div className="flex items-center gap-3">
              <MapPin size={22} className="shrink-0 text-gold-400" />
              <h3 className="font-serif text-xl font-semibold text-gold-400">{t('about.officeTitle')}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/75">
              {t('about.officeCompany')} <span className="text-white/40">|</span> {t('about.officeRegistration')}<br />
              {t('about.officeAddress')}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionHeader
            eyebrow={t('about.drives')}
            title={t('about.values')}
            centered
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {values.map(({ icon: Icon }, index) => (
              <div key={index} className="bg-white p-6 rounded-sm shadow-card border border-beige-200 text-center group hover:border-gold-300 transition-colors">
                <div className="w-14 h-14 rounded-full bg-gold-50 border-2 border-gold-200 flex items-center justify-center mx-auto mb-4 group-hover:bg-gold-100 transition-colors">
                  <Icon size={24} className="text-gold-600" />
                </div>
                <h3 className="font-serif font-semibold text-navy-900 text-lg mb-3">{t(`about.valuesList.${index}.title`)}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{t(`about.valuesList.${index}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding bg-beige-50">
        <div className="container-custom">
          <SectionHeader
            title={t('about.team')}
            subtitle={t('about.teamSubtitle')}
            centered
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {teamMembers.map((member, index) => (
              <div key={member.name} className="group text-center">
                <div className="relative overflow-hidden rounded-sm mb-4 shadow-card">
                  <img
                    src={teamImages[index] ?? member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-serif font-semibold text-navy-900 text-lg">{t(`about.teamList.${index}.name`)}</h3>
                <p className="text-gold-600 text-sm font-medium mb-2">{t(`about.teamList.${index}.role`)}</p>
                <p className="text-navy-500 text-xs leading-relaxed">{t(`about.teamList.${index}.bio`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-navy-900">
        <div className="container-custom">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[0, 1, 2, 3].map((index) => (
              <div key={index}>
                <p className="font-serif text-gold-400 text-4xl md:text-5xl font-bold"><Counter value={t(`about.stats.${index}.value`)} /></p>
                <p className="text-white/60 text-sm mt-2">{t(`about.stats.${index}.label`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
};

export default About;
