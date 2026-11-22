import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';
import { properties as staticProperties } from '../data/properties';
import type { Property } from '../types';
import type { PropertyFilters as FiltersType } from '../types';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_INOUT, EASE_LUXE } from '../lib/motion';

const defaultFilters: FiltersType = {
  priceType: 'all',
  location: '',
  propertyType: '',
  minPrice: 0,
  maxPrice: 9999999,
  bedrooms: '',
  isBeachfront: false,
};

const Properties: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FiltersType>(defaultFilters);
  const [properties, setProperties] = useState<Property[]>(staticProperties);
  useEffect(() => {
    fetch('/api/content?type=property')
      .then((response) => response.ok ? response.json() as Promise<{ items: { data: Property }[]; managed?: boolean }> : Promise.reject(new Error('Content unavailable')))
      .then((result) => { if (result.items.length || result.managed) setProperties(result.items.map((item) => item.data)); })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (filters.priceType !== 'all' && p.priceType !== filters.priceType) return false;
      if (filters.location && !p.location.toLowerCase().includes(filters.location.toLowerCase()) && !p.district.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.propertyType && p.propertyType !== filters.propertyType) return false;
      if (filters.isBeachfront && !p.isBeachfront) return false;
      if (filters.bedrooms) {
        const min = filters.bedrooms === '5+' ? 5 : Number(filters.bedrooms);
        if (filters.bedrooms === '5+' ? p.bedrooms < 5 : p.bedrooms !== min) return false;
      }
      // Price filter (only for USD properties)
      if (p.priceUnit === 'USD' && p.price > filters.maxPrice) return false;
      return true;
    });
  }, [filters, properties]);

  return (
    <>
      <title>{t('nav.properties')} — Paradise Global Leisures</title>

      {/* Page Header */}
      <div className="relative pt-32 pb-20 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')` }} />
        <div className="relative container-custom">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">{t('propertiesPage.eyebrow')}</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">{t('propertiesPage.title')}</h1>
          <div className="gold-divider-left" />
          <p className="text-white/70 text-lg mt-5 max-w-2xl">
            {t('propertiesPage.subtitle')}
          </p>
        </div>
      </div>

      <section className="section-padding bg-beige-50">
        <div className="container-custom">
          <PropertyFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
          />

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-navy-600 text-sm">
              {t('propertiesPage.showing')} <motion.span key={filtered.length} className="inline-block font-semibold text-navy-900" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_LUXE }}>{filtered.length}</motion.span> {t('propertiesPage.of')}{' '}
              <span className="font-semibold text-navy-900">{properties.length}</span> {t('propertiesPage.properties')}
            </p>
          </div>

          {/* Cards glide to their new places as filters change; leavers fade back, newcomers rise in */}
          <div data-motion="manual" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((property, index) => (
                <motion.div
                  key={property.id}
                  layout
                  initial={{ opacity: 0, y: 40, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE_LUXE, delay: Math.min(index, 8) * 0.06 } }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3, ease: EASE_INOUT } }}
                  transition={{ layout: { duration: 0.6, ease: EASE_LUXE } }}
                >
                  <PropertyCard property={property} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filtered.length === 0 && (
            <motion.div
              data-motion="manual"
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUXE, delay: 0.2 } }}
            >
              <Search size={48} className="text-beige-400 mx-auto mb-4" />
              <h3 className="font-serif text-navy-700 text-xl mb-2">{t('propertiesPage.noResults')}</h3>
              <p className="text-navy-500 text-sm mb-6">{t('propertiesPage.adjust')}</p>
              <button
                onClick={() => setFilters(defaultFilters)}
                className="btn-primary"
              >
                {t('propertiesPage.clear')}
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
};

export default Properties;
