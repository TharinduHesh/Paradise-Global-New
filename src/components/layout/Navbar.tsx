import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
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

// Switch first: saving the choice can throw where storage is blocked (private browsing, in-app browsers).
const setWebsiteLanguage = (language: 'en' | 'he') => {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  void i18n.changeLanguage(language);
  try { window.localStorage.setItem('pgl-language', language); } catch { /* the choice just won't be remembered */ }
};

/** Segmented English / Hebrew switch with large tap targets. `compact` shows short labels for the mobile header. */
const LanguageSwitch: React.FC<{ compact?: boolean; className?: string }> = ({ compact = false, className = '' }) => {
  const { t, i18n: instance } = useTranslation();
  const current = instance.resolvedLanguage === 'he' || instance.language === 'he' ? 'he' : 'en';
  const options = [
    { code: 'en' as const, label: compact ? 'EN' : t('language.english'), name: 'English' },
    { code: 'he' as const, label: compact ? 'עב' : t('language.hebrew'), name: 'עברית' },
  ];
  return (
    <div role="group" aria-label="Language / שפה" dir="ltr" className={`flex items-center rounded-full border border-white/25 p-0.5 ${className}`}>
      {options.map(({ code, label, name }) => (
        <button key={code} type="button" lang={code} aria-label={name} aria-pressed={current === code} onClick={() => setWebsiteLanguage(code)}
          className={`min-h-[34px] min-w-[40px] rounded-full px-3 text-[13px] font-semibold transition-colors ${current === code ? 'bg-gold-500 text-navy-950' : 'text-white/85 hover:text-gold-400'}`}>
          {label}
        </button>
      ))}
    </div>
  );
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
        <div className="grid h-24 grid-cols-[150px_minmax(0,1fr)_auto] items-center gap-4 max-xl:flex max-xl:h-24 max-xl:justify-between">
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
          <nav className="hidden min-w-0 items-center justify-start gap-0 -translate-x-4 xl:flex">
            {navLinks.map((link) =>
              link.children ? (
                <div
                  key={link.label}
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className="flex items-center gap-1 whitespace-nowrap px-2 py-2 text-[14px] font-medium text-white/90 transition-colors duration-200 hover:text-gold-400 2xl:text-[15px]">
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
                    `whitespace-nowrap px-2 py-2 text-[14px] font-medium transition-colors duration-200 2xl:text-[15px] ${isActive ? 'text-gold-400' : 'text-white/90 hover:text-gold-400'}`
                  }
                >
                  {t(`nav.${navKeys[link.label] ?? ''}`, { defaultValue: link.label })}
                </NavLink>
              )
            )}
          </nav>

          {/* CTA + Mobile Toggle */}
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-2">
            <LanguageSwitch className="hidden xl:flex" />
            <LanguageSwitch compact className="xl:hidden" />
            <Link
              to="/contact"
              className="hidden xl:inline-flex btn-primary whitespace-nowrap px-4 py-2.5 text-[14px]"
            >
              {t('nav.consultation')}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden flex h-11 w-11 items-center justify-center rounded-lg text-white hover:text-gold-400 transition-colors"
              aria-label={t('nav.toggleMenu')}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`xl:hidden bg-navy-950 transition-all duration-300 ${mobileOpen ? 'max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain' : 'max-h-0 overflow-hidden'}`}>
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
                  <div className="ms-4 border-s-2 border-gold-500/30 ps-4">
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
