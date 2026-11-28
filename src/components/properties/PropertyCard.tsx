import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, ArrowRight, ArrowUpRight, Waves, MessageCircle } from 'lucide-react';
import type { Property } from '../../types';
import Badge from '../ui/Badge';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../../lib/localizedContent';
import { fillHebrew } from '../../lib/hebrewFallback';
import { landUnitLabel, placeLine, propertyTypeLabel, rentPeriodLabel } from '../../lib/propertyLabels';
import { useCompany, whatsappHref } from '../../lib/siteContent';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property: record }) => {
  const { t } = useTranslation();
  const company = useCompany();
  const [imgError, setImgError] = useState(false);
  // Listings still carrying the original English get the original Hebrew where theirs is missing.
  const property = fillHebrew('property', record.slug, record);
  const localizedName = getLocalizedText(property.name, property.name_he);

  const formatPrice = (property: Property): string => {
    if (property.priceUnit === 'USD') {
      return property.priceType === 'rent'
        ? `$${property.price.toLocaleString()}/${rentPeriodLabel(t, property.rentPeriod)}`
        : `$${property.price.toLocaleString()}`;
    }
    if (property.priceUnit === 'LKR') {
      if (property.price >= 1000000) {
        return `LKR ${(property.price / 1000000).toFixed(1)}M`;
      }
      return `LKR ${property.price.toLocaleString()}`;
    }
    return `${property.price}`;
  };

  const fallbackImage = `https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80`;

  return (
    <div className="lux-card group h-full bg-white rounded-sm shadow-card overflow-hidden border border-beige-200">
      {/* Image */}
      <div className="relative overflow-hidden h-56">
        <img
          src={imgError ? fallbackImage : property.image}
          alt={localizedName}
          loading="lazy"
          decoding="async"
          className="lux-zoom w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {/* Hover veil with a "view" chip; the whole photo opens the listing */}
        <Link
          to={`/properties/${property.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-navy-950/60 via-navy-950/15 to-transparent opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100"
        >
          <span className="flex h-14 w-14 scale-75 items-center justify-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-sm transition-transform duration-700 ease-luxe group-hover:scale-100">
            <ArrowUpRight size={22} />
          </span>
        </Link>
        <span aria-hidden="true" className="lux-rule absolute inset-x-0 bottom-0 h-0.5 bg-gold-gradient" />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Badge variant={property.priceType === 'sale' ? 'navy' : 'gold'}>
            {property.priceType === 'sale' ? t('property.forSale') : t('property.forRent')}
          </Badge>
          {property.isBeachfront && (
            <Badge variant="green">
              <Waves size={10} className="mr-1" /> {t('property.beachfront')}
            </Badge>
          )}
        </div>
        {/* Property Type */}
        <div className="absolute top-3 right-3">
          <Badge variant="beige">{propertyTypeLabel(t, property.propertyType)}</Badge>
        </div>
        {/* Status overlay for sold/rented */}
        {property.status !== 'available' && (
          <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center">
            <span className="text-white font-bold text-xl uppercase tracking-widest">
              {property.status === 'sold' ? t('property.sold') : property.status === 'rented' ? t('property.rented') : property.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Price */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-gold-600 font-bold text-xl font-serif">{formatPrice(property)}</p>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-serif font-semibold text-navy-900 text-lg mb-1.5 line-clamp-1 group-hover:text-gold-600 transition-colors">
          {localizedName}
        </h3>

        {/* Location */}
        <p className="flex items-center gap-1.5 text-navy-500 text-sm mb-4">
          <MapPin size={13} className="text-gold-500 flex-shrink-0" />
          {placeLine(t, property.location, property.district)}
        </p>

        {/* Stats */}
        {(property.bedrooms > 0 || property.landSize > 0) && (
          <div className="flex items-center gap-4 text-sm text-navy-600 pb-4 border-b border-beige-200 mb-4">
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bed size={14} className="text-gold-500" />
                {property.bedrooms} {t('property.bed', { count: property.bedrooms })}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bath size={14} className="text-gold-500" />
                {property.bathrooms} {t('property.bath', { count: property.bathrooms })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Square size={14} className="text-gold-500" />
              {property.landSize} {landUnitLabel(t, property.landUnit)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/properties/${property.slug}`}
            className="flex-1 btn-navy text-sm py-2.5 justify-center"
          >
            {t('property.viewDetails')} <ArrowRight size={14} />
          </Link>
          <a
            href={whatsappHref(company.whatsapp, `I'm interested in ${localizedName} in ${property.location}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 transition-colors"
            title={t('property.whatsapp')}
          >
            <MessageCircle size={14} />
            {t('property.enquire')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
