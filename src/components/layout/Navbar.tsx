import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ArrowRight, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import i18n from '../../i18n';
import { EASE_INOUT, EASE_LUXE, luxe, staggerContainer } from '../../lib/motion';
import { useCompany, phoneHref, phoneNumbers } from '../../lib/siteContent';
import { Magnetic } from '../motion/primitives';

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

const LANGUAGE_FADE_MS = 260;
const LANGUAGE_SETTLE_MS = 1100;
let languageTimers: number[] = [];

/**
 * Switch language with a soft cross-fade: the page dims, the text and reading direction flip while it is
 * hidden, then it fades back. The direction is set first because saving the choice can throw where
 * storage is blocked (private browsing, in-app browsers).
 */
const setWebsiteLanguage = (language: 'en' | 'he') => {
  const root = document.documentElement;
  const apply = () => {
    root.lang = language;
    root.dir = language === 'he' ? 'rtl' : 'ltr';
    void i18n.changeLanguage(language);
    try { window.localStorage.setItem('pgl-language', language); } catch { /* the choice just won't be remembered */ }
  };
  if (i18n.language === language && root.lang === language) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { apply(); return; }

  languageTimers.forEach((timer) => window.clearTimeout(timer));
  root.setAttribute('data-lang-switching', '');
  root.setAttribute('data-lang-settling', '');
  languageTimers = [
    window.setTimeout(() => {
      apply();
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.removeAttribute('data-lang-switching')));
    }, LANGUAGE_FADE_MS),
    window.setTimeout(() => root.removeAttribute('data-lang-settling'), LANGUAGE_SETTLE_MS),
  ];
};

/** Segmented English / Hebrew switch with a sliding gold thumb. `compact` shows short labels for the mobile header. */
const LanguageSwitch: React.FC<{ compact?: boolean; className?: string }> = ({ compact = false, className = '' }) => {
  const { t, i18n: instance } = useTranslation();
  const current = instance.resolvedLanguage === 'he' || instance.language === 'he' ? 'he' : 'en';
  const options = [
    { code: 'en' as const, label: compact ? 'EN' : t('language.english'), name: 'English' },
    { code: 'he' as const, label: compact ? 'עב' : t('language.hebrew'), name: 'עברית' },
  ];
  return (
    <div role="group" aria-label="Language / שפה" dir="ltr" className={`relative grid grid-cols-2 items-center rounded-full border border-white/25 p-0.5 ${className}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-gold-500 shadow-gold transition-transform duration-500 ease-luxe ${current === 'he' ? 'translate-x-full' : 'translate-x-0'}`}
      />
      {options.map(({ code, label, name }) => (
        <button key={code} type="button" lang={code} aria-label={name} aria-pressed={current === code} onClick={() => setWebsiteLanguage(code)}
          className={`relative z-10 min-h-[34px] min-w-[40px] rounded-full px-3 text-[13px] font-semibold transition-colors duration-300 ${current === code ? 'text-navy-950' : 'text-white/85 hover:text-gold-400'}`}>
          {label}
        </button>
      ))}
    </div>
  );
};

const label = (t: TFunction, text: string) => t(`nav.${navKeys[text] ?? ''}`, { defaultValue: text });

/** Gold underline that glides to whichever top-level link is active. */
const ActiveUnderline: React.FC = () => (
  <motion.span
    layoutId="nav-active-underline"
    aria-hidden="true"
    className="absolute inset-x-2.5 -bottom-0.5 h-[1.5px] rounded-full bg-gold-400"
    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
  />
);

const dropdownItem = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: luxe(0.5) },
};

const mobileItem = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0, transition: luxe(0.8) },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: EASE_INOUT } },
};

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const company = useCompany();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Solid background once the page moves; tuck the bar away while reading down, bring it back on scroll up.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsScrolled(y > 40);
    if (y > 480 && y > previous + 6) setHidden(true);
    else if (y < previous - 6 || y <= 480) setHidden(false);
  });

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    setMobileServicesOpen(false);
    setHidden(false); // always show the bar on a new page
  }, [location]);

  // Full-screen menu: lock page scroll, close on Escape and hand focus back to the toggle.
  useEffect(() => {
    if (!mobileOpen) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); toggleRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { root.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); };
  }, [mobileOpen]);

  const solid = isScrolled || !isHome || mobileOpen;
  const tucked = hidden && !mobileOpen && !activeDropdown;
  const servicesActive = location.pathname.startsWith('/services');

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        initial={false}
        animate={{ y: tucked ? '-100%' : 0 }}
        transition={{ duration: 0.55, ease: EASE_LUXE }}
      >
        {/* Background layers: a soft scrim over the hero, then frosted navy with a gold hairline once scrolled */}
        <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-navy-950/70 to-transparent transition-opacity duration-700 ${solid ? 'opacity-0' : 'opacity-100'}`} />
        <div aria-hidden="true" className={`absolute inset-0 bg-navy-900/95 backdrop-blur-md transition-[opacity,box-shadow] duration-700 ease-luxe ${solid ? 'opacity-100' : 'opacity-0'} ${isScrolled ? 'shadow-navy' : ''}`} />
        <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent transition-opacity duration-700 ${solid && !mobileOpen ? 'opacity-100' : 'opacity-0'}`} />

        <div className="container-custom relative">
          <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 transition-[height] duration-500 ease-luxe 2xl:gap-10 max-xl:flex max-xl:h-24 max-xl:justify-between ${isScrolled ? 'h-20' : 'h-24'}`}>
            {/* Logo */}
            <Link to="/" className="flex h-full items-center flex-shrink-0" aria-label="Paradise Global Leisures">
              <img
                src="/logo.png?v=gold"
                alt="Paradise Global Leisures"
                className={`h-[84px] w-[84px] shrink-0 object-contain transition-transform duration-500 ease-luxe origin-left rtl:origin-right max-xl:h-16 max-xl:w-16 ${isScrolled ? 'xl:scale-[0.8]' : ''}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden min-w-0 items-center justify-center gap-1 xl:flex 2xl:gap-3">
              {navLinks.map((link) =>
                link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(link.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveDropdown(null); }}
                    onKeyDown={(event) => { if (event.key === 'Escape') setActiveDropdown(null); }}
                  >
                    <button
                      type="button"
                      aria-expanded={activeDropdown === link.label}
                      aria-haspopup="true"
                      onClick={() => setActiveDropdown(activeDropdown === link.label ? null : link.label)}
                      className={`nav-link relative flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-[14px] font-medium transition-colors duration-300 2xl:text-[15px] ${servicesActive ? 'text-gold-400' : 'text-white/90 hover:text-gold-300'}`}
                    >
                      {t(`nav.${navKeys[link.label] ?? 'services'}`)}
                      <ChevronDown size={14} className={`transition-transform duration-500 ease-luxe ${activeDropdown === link.label ? 'rotate-180' : ''}`} />
                      {servicesActive && <ActiveUnderline />}
                    </button>
                    <AnimatePresence>
                      {activeDropdown === link.label && (
                        <motion.div
                          className="absolute top-full start-0 w-64 pt-3"
                          initial={{ opacity: 0, y: 10, clipPath: 'inset(0% -30% 100% -30%)' }}
                          animate={{ opacity: 1, y: 0, clipPath: 'inset(0% -30% -30% -30%)' }}
                          exit={{ opacity: 0, y: 6, clipPath: 'inset(0% -30% 100% -30%)', transition: { duration: 0.28, ease: EASE_INOUT } }}
                          transition={{ duration: 0.5, ease: EASE_LUXE }}
                        >
                          <motion.div
                            className="overflow-hidden rounded-sm border border-white/10 bg-navy-900/95 shadow-2xl backdrop-blur-md"
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer(0.04, 0.08)}
                          >
                            <div aria-hidden="true" className="h-px bg-gold-gradient" />
                            {link.children.map((child) => (
                              <motion.div key={child.href} variants={dropdownItem} className="border-b border-white/5 last:border-0">
                                <NavLink
                                  to={child.href}
                                  end
                                  className={({ isActive }) =>
                                    `group/item flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-300 ${isActive ? 'bg-white/5 text-gold-400' : 'text-white/80 hover:bg-white/5 hover:text-gold-400'}`
                                  }
                                >
                                  <span className="transition-transform duration-500 ease-luxe group-hover/item:translate-x-1 rtl:group-hover/item:-translate-x-1">{label(t, child.label)}</span>
                                  <ArrowRight size={13} className="shrink-0 opacity-0 transition-all duration-500 ease-luxe group-hover/item:opacity-100" />
                                </NavLink>
                              </motion.div>
                            ))}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `nav-link relative whitespace-nowrap px-2.5 py-2 text-[14px] font-medium transition-colors duration-300 2xl:text-[15px] ${isActive ? 'text-gold-400' : 'text-white/90 hover:text-gold-300'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {label(t, link.label)}
                        {isActive && <ActiveUnderline />}
                      </>
                    )}
                  </NavLink>
                )
              )}
            </nav>

            {/* CTA + Mobile Toggle */}
            <div className="relative z-10 flex shrink-0 items-center justify-end gap-3 2xl:gap-4">
              <LanguageSwitch className="hidden xl:grid" />
              <LanguageSwitch compact className="xl:hidden" />
              <Magnetic className="hidden xl:inline-flex" strength={0.22}>
                <Link to="/contact" className="btn-primary whitespace-nowrap px-4 py-2.5 text-[14px]">
                  {t('nav.consultation')}
                </Link>
              </Magnetic>
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="relative xl:hidden flex h-11 w-11 items-center justify-center rounded-lg text-white hover:text-gold-400 transition-colors"
                aria-label={t('nav.toggleMenu')}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                <span aria-hidden="true" className={`absolute h-[1.5px] w-6 rounded-full bg-current transition-transform duration-500 ease-luxe ${mobileOpen ? 'rotate-45' : '-translate-y-[5px]'}`} />
                <span aria-hidden="true" className={`absolute h-[1.5px] rounded-full bg-current transition-all duration-500 ease-luxe ${mobileOpen ? 'w-6 -rotate-45' : 'w-4 translate-y-[5px] translate-x-1 rtl:-translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Full-screen mobile menu (sits under the header bar, which keeps the logo and close button) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.toggleMenu')}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-navy-950 xl:hidden"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.6, ease: EASE_INOUT, delay: 0.12 } }}
            transition={{ duration: 0.75, ease: EASE_INOUT }}
          >
            {/* Decorative watermark and glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -end-24 bottom-0 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />
            <motion.img
              aria-hidden="true"
              src="/logo.png?v=gold"
              alt=""
              className="pointer-events-none absolute -bottom-10 -end-10 w-72 opacity-[0.05]"
              initial={{ scale: 1.2, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1.6, ease: EASE_LUXE }}
            />

            <nav className="container-custom relative flex flex-1 flex-col pt-28 pb-10">
              <motion.ul
                className="flex flex-col"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{ ...staggerContainer(0.06, 0.28), exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } } }}
              >
                {navLinks.map((link, index) => {
                  const number = <span className="w-7 shrink-0 font-sans text-xs font-medium tabular-nums text-gold-500/70">{String(index + 1).padStart(2, '0')}</span>;
                  return (
                    <motion.li key={link.label} variants={mobileItem} className="border-b border-white/10">
                      {link.children ? (
                        <>
                          <button
                            type="button"
                            aria-expanded={mobileServicesOpen}
                            onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                            className={`flex w-full items-baseline gap-4 py-4 text-start font-serif text-[1.75rem] leading-tight transition-colors sm:text-4xl ${servicesActive ? 'text-gold-400' : 'text-white hover:text-gold-400'}`}
                          >
                            {number}
                            <span className="flex-1">{label(t, link.label)}</span>
                            <ChevronDown size={22} className={`self-center text-gold-500 transition-transform duration-500 ease-luxe ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence initial={false}>
                            {mobileServicesOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.5, ease: EASE_LUXE }}
                                className="overflow-hidden"
                              >
                                <motion.div className="ms-11 mb-4 flex flex-col border-s border-gold-500/30 ps-4" initial="hidden" animate="visible" variants={staggerContainer(0.04, 0.05)}>
                                  {link.children.map((child) => (
                                    <motion.div key={child.href} variants={dropdownItem}>
                                      <NavLink
                                        to={child.href}
                                        end
                                        className={({ isActive }) => `block py-2.5 text-[15px] transition-colors ${isActive ? 'text-gold-400' : 'text-white/70 hover:text-gold-400'}`}
                                      >
                                        {label(t, child.label)}
                                      </NavLink>
                                    </motion.div>
                                  ))}
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <NavLink
                          to={link.href}
                          className={({ isActive }) => `group flex items-baseline gap-4 py-4 font-serif text-[1.75rem] leading-tight transition-colors sm:text-4xl ${isActive ? 'text-gold-400' : 'text-white hover:text-gold-400'}`}
                        >
                          {number}
                          <span className="transition-transform duration-500 ease-luxe group-hover:translate-x-2 rtl:group-hover:-translate-x-2">{label(t, link.label)}</span>
                        </NavLink>
                      )}
                    </motion.li>
                  );
                })}
              </motion.ul>

              <motion.div
                className="mt-auto flex flex-col gap-5 pt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { ...luxe(0.8), delay: 0.65 } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <Link to="/contact" className="btn-primary justify-center py-3.5 text-base">
                  {t('nav.consultation')} <ArrowRight size={16} />
                </Link>
                <div className="flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:gap-6">
                  {phoneNumbers(company.phone).map((number) => (
                    <a key={number} href={phoneHref(number)} className="inline-flex items-center gap-2 transition-colors hover:text-gold-400">
                      <Phone size={14} className="text-gold-500" /> {number}
                    </a>
                  ))}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-gold-400">
                      <Mail size={14} className="text-gold-500" /> {company.email}
                    </a>
                  )}
                </div>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
