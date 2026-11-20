import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'All Services', href: '/services' },
      { label: 'Paradise Real Estate', href: '/properties' },
      { label: 'Paradise Development Solutions', href: '/services/plan-approvals' },
      { label: 'Paradise Property Care', href: '/services/property-management' },
      { label: 'Paradise Hospitality Collection', href: '/destinations' },
      { label: 'Paradise Legal Solutions', href: '/services/legal-consultation' },
      { label: 'Paradise Design & Construction', href: '/services/construction' },
    ],
  },
  { label: 'Properties', href: '/properties' },
  { label: 'Destinations', href: '/destinations' },
  { label: 'Contact', href: '/contact' },
];

const navKeys: Record<string, string> = {
  Home: 'home', About: 'about', Services: 'services', 'All Services': 'allServices',
  Properties: 'properties', Destinations: 'destinations', Contact: 'contact',
  'Paradise Real Estate': 'realEstate',
  'Paradise Development Solutions': 'planApprovals',
  'Paradise Property Care': 'propertyManagement',
  'Paradise Hospitality Collection': 'destinations',
  'Paradise Legal Solutions': 'legalConsultation',
  'Paradise Design & Construction': 'construction',
};

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location]);

  const navBg = isScrolled || !isHome
    ? 'bg-navy-900 shadow-navy'
    : 'bg-transparent';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="container-custom">
        <div className="grid h-24 grid-cols-[180px_minmax(0,1fr)_390px] items-center max-xl:flex max-xl:h-24 max-xl:justify-between">
          {/* Logo */}
          <Link to="/" className="flex h-24 items-center flex-shrink-0" aria-label="Paradise Global Leisures">
            <img
              src="/logo.png?v=gold"
              alt="Paradise Global Leisures"
              className="h-[84px] w-[84px] shrink-0 object-contain max-xl:h-16 max-xl:w-16"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden min-w-0 items-center justify-center gap-0 xl:flex">
            {navLinks.map((link) =>
              link.children ? (
                <div
                  key={link.label}
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className="flex items-center gap-1 whitespace-nowrap px-1.5 py-2 text-[13px] font-medium text-white/90 transition-colors duration-200 hover:text-gold-400 2xl:px-2 2xl:text-sm">
                    {t(`nav.${navKeys[link.label] ?? 'services'}`)}
                    <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                  </button>
                  <div className={`absolute top-full left-0 w-56 bg-navy-900 border border-navy-800 shadow-xl rounded-sm transition-all duration-200 ${activeDropdown === link.label ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                    {link.children.map((child) => (
                      <NavLink
                        key={child.href}
                        to={child.href}
                        className={({ isActive }) =>
                          `block px-4 py-3 text-sm transition-colors duration-200 border-b border-navy-800 last:border-0 ${isActive ? 'text-gold-400 bg-navy-800' : 'text-white/80 hover:text-gold-400 hover:bg-navy-800'}`
                        }
                      >
                        {t(`nav.${navKeys[child.label] ?? ''}`, { defaultValue: child.label })}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    `whitespace-nowrap px-1.5 py-2 text-[13px] font-medium transition-colors duration-200 2xl:px-2 2xl:text-sm ${isActive ? 'text-gold-400' : 'text-white/90 hover:text-gold-400'}`
                  }
                >
                  {t(`nav.${navKeys[link.label] ?? ''}`, { defaultValue: link.label })}
                </NavLink>
              )
            )}
          </nav>

          {/* CTA + Mobile Toggle */}
          <div className="flex w-[390px] shrink-0 items-center justify-end gap-2 max-xl:w-auto">
            <div className="hidden items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[13px] text-white/80 xl:flex 2xl:text-sm">
              <button onClick={() => void i18n.changeLanguage('en')} className={i18n.language === 'en' ? 'font-semibold text-gold-400' : 'hover:text-gold-400'}>{t('language.english')}</button>
              <span className="text-white/40">|</span>
              <button onClick={() => void i18n.changeLanguage('he')} className={i18n.language === 'he' ? 'font-semibold text-gold-400' : 'hover:text-gold-400'}>{t('language.hebrew')}</button>
            </div>
            <a
              href="tel:+94XXXXXXXXX"
              className="hidden 2xl:flex items-center gap-2 text-gold-400 text-base whitespace-nowrap font-medium hover:text-gold-300 transition-colors"
            >
              <Phone size={15} />
              <span>+94 77 000 0000</span>
            </a>
            <Link
              to="/contact"
              className="hidden xl:inline-flex btn-primary text-base px-5 py-3 whitespace-nowrap"
            >
              {t('nav.consultation')}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden text-white hover:text-gold-400 transition-colors p-1"
              aria-label={t('nav.toggleMenu')}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`xl:hidden bg-navy-950 transition-all duration-300 overflow-hidden ${mobileOpen ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="container-custom py-4 flex flex-col gap-1">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.label}>
                <button
                  className="flex items-center justify-between w-full text-white/90 px-4 py-3 text-sm font-medium"
                  onClick={() => setActiveDropdown(activeDropdown === link.label ? null : link.label)}
                >
                  {t(`nav.${navKeys[link.label] ?? ''}`, { defaultValue: link.label })}
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />
                </button>
                {activeDropdown === link.label && (
                  <div className="ml-4 border-l-2 border-gold-500/30 pl-4">
                    {link.children.map((child) => (
                      <NavLink
                        key={child.href}
                        to={child.href}
                        className={({ isActive }) =>
                          `block py-2.5 text-sm transition-colors ${isActive ? 'text-gold-400' : 'text-white/70 hover:text-gold-400'}`
                        }
                      >
                        {t(`nav.${navKeys[child.label] ?? ''}`, { defaultValue: child.label })}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'text-gold-400' : 'text-white/90 hover:text-gold-400'}`
                }
              >
                {t(`nav.${navKeys[link.label] ?? ''}`, { defaultValue: link.label })}
              </NavLink>
            )
          )}
          <div className="pt-4 pb-2 flex flex-col gap-3">
            <div className="mx-4 flex items-center justify-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-white/80">
              <button onClick={() => void i18n.changeLanguage('en')} className={i18n.language === 'en' ? 'font-semibold text-gold-400' : ''}>{t('language.english')}</button>
              <span>|</span>
              <button onClick={() => void i18n.changeLanguage('he')} className={i18n.language === 'he' ? 'font-semibold text-gold-400' : ''}>{t('language.hebrew')}</button>
            </div>
            <a href="tel:+94XXXXXXXXX" className="flex items-center gap-2 text-gold-400 text-sm px-4">
              <Phone size={15} />
              +94 77 000 0000
            </a>
            <Link to="/contact" className="btn-primary mx-4 text-center justify-center">
              {t('nav.consultation')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
