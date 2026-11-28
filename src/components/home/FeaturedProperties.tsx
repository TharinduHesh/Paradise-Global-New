import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHeader from '../ui/SectionHeader';
import PropertyCard from '../properties/PropertyCard';
import { properties as staticProperties } from '../../data/properties';
import type { Property } from '../../types';
import { useTranslation } from 'react-i18next';

const FeaturedProperties: React.FC = () => {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>(staticProperties);
  useEffect(() => {
    fetch('/api/content?type=property')
      .then((response) => response.ok ? response.json() as Promise<{ items: { data: Property }[]; managed?: boolean }> : Promise.reject(new Error('Content unavailable')))
      .then((result) => { if (result.items.length || result.managed) setProperties(result.items.map((item) => item.data)); })
      .catch(() => undefined);
  }, []);
  const featured = properties.filter((p) => p.isFeatured).slice(0, 3);

  return (
    <section className="section-padding !pt-12 md:!pt-16 bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <SectionHeader
            eyebrow={t('home.featuredEyebrow')}
            title={t('home.featuredTitle')}
            subtitle={t('home.featuredSubtitle')}
          />
          <Link to="/properties" className="btn-navy flex-shrink-0 self-start md:self-auto">
            {t('home.allProperties')} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
