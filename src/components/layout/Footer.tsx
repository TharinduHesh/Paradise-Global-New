import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FacebookIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 8h3V4h-3c-3.3 0-5 1.7-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.7.3-1 1-1Z" />
  </svg>
);

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-white">
      {/* Main Footer */}
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="mb-5 flex h-24 items-center">
              <img src="/logo.png?v=gold" alt="Paradise Global Leisures" className="h-28 w-28 object-contain max-sm:h-24 max-sm:w-24" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              {[
                { icon: FacebookIcon, href: '#', label: 'Facebook' },
                { icon: InstagramIcon, href: '#', label: 'Instagram' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-gold-400 hover:border-gold-400 transition-colors duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-serif text-white font-semibold text-lg mb-5">{t('footer.services')}</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Paradise Real Estate', href: '/properties' },
                { label: 'Paradise Development Solutions', href: '/services/plan-approvals' },
                { label: 'Paradise Property Care', href: '/services/property-management' },
                { label: 'Paradise Hospitality Collection', href: '/destinations' },
                { label: 'Paradise Legal Solutions', href: '/services/legal-consultation' },
                { label: 'Paradise Design & Construction', href: '/services/construction' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-2 text-white/60 text-sm hover:text-gold-400 transition-colors duration-200 group"
                  >
                    <ArrowRight size={12} className="text-gold-500 group-hover:translate-x-1 transition-transform" />
                    {t(`nav.${{
                      'Paradise Real Estate': 'realEstate',
                      'Paradise Development Solutions': 'planApprovals',
                      'Paradise Property Care': 'propertyManagement',
                      'Paradise Hospitality Collection': 'destinations',
                      'Paradise Legal Solutions': 'legalConsultation',
                      'Paradise Design & Construction': 'construction',
                    }[item.label] ?? ''}`, { defaultValue: item.label })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-serif text-white font-semibold text-lg mb-5">{t('footer.destinations')}</h4>
            <ul className="space-y-2.5">
              {[
                'Galle', 'Unawatuna', 'Weligama', 'Mirissa',
                'Hiriketiya', 'Tangalle', 'Matara', 'Dikwella'
              ].map((dest) => (
                <li key={dest}>
                  <Link
                    to={`/destinations`}
                    className="flex items-center gap-2 text-white/60 text-sm hover:text-gold-400 transition-colors duration-200 group"
                  >
                    <MapPin size={12} className="text-gold-500" />
                    {t(`destinationNames.${dest}`, { defaultValue: dest })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-white font-semibold text-lg mb-5">{t('footer.contact')}</h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <MapPin size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <span className="text-white/60 text-sm">
                  {t('footer.address')}<br />
                  {t('footer.locationLine')}<br />
                  {t('footer.province')}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <a href="tel:+94770000000" className="text-white/60 hover:text-gold-400 transition-colors block">+94 77 000 0000</a>
                  <a href="tel:+94912000000" className="text-white/60 hover:text-gold-400 transition-colors block">+94 91 200 0000</a>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <a href="mailto:info@paradisegloballeiures.com" className="text-white/60 text-sm hover:text-gold-400 transition-colors">
                  info@paradisegloballeisures.com
                </a>
              </li>
            </ul>
            <div className="mt-6">
              <Link to="/contact" className="btn-primary text-sm px-5 py-2.5 w-full justify-center">
                {t('footer.contactUs')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      {/* Bottom Bar */}
      <div className="container-custom py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-white/40 text-sm">
          <p>© {currentYear} Paradise Global Leisures (PVT) LTD. {t('footer.rights')}</p>
          <div>{t('footer.poweredBy')}</div>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-gold-400 transition-colors">{t('footer.privacy')}</Link>
            <Link to="/terms-of-service" className="hover:text-gold-400 transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
