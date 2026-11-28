import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import Layout from './components/layout/Layout';
import PageTransition from './components/motion/PageTransition';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import ServiceDetail from './pages/ServiceDetail';
import Destinations from './pages/Destinations';
import Contact from './pages/Contact';
import AdminApp from './pages/Admin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import MaintenancePage from './pages/Maintenance';
import Projects from './pages/Projects';
import Reviews from './pages/Reviews';
import { SiteContentProvider } from './lib/siteContent';

type MaintenanceSettings = { enabled: boolean; design?: string; message: string; reopeningAt?: string };
type CompanySettings = { email?: string; phone?: string; whatsapp?: string; facebook?: string; instagram?: string };
type ApiSettings = { maintenance?: MaintenanceSettings; company?: CompanySettings; seo?: { title?: string; description?: string } };

/** Public pages. The routes render against a fixed location so the outgoing page can finish its exit transition. */
const SitePages: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <PageTransition routeKey={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:slug" element={<PropertyDetails />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-beige-50">
            <div className="text-center">
              <h1 className="font-serif text-6xl font-bold text-navy-900 mb-4">404</h1>
              <p className="text-navy-500 text-xl mb-6">{t('notFound.page')}</p>
              <a href="/" className="btn-primary">{t('notFound.home')}</a>
            </div>
          </div>
        } />
      </Routes>
    </PageTransition>
  );
};

const App: React.FC = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
      void i18n.changeLanguage('en');
    }
    if (window.location.pathname.startsWith('/admin')) return;
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ settings: ApiSettings }> : Promise.reject())
      .then((result) => {
        setMaintenance(result.settings.maintenance ?? null);
        setCompany(result.settings.company ?? null);
        const seo = result.settings.seo;
        if (seo?.title?.trim()) document.title = seo.title.trim();
        if (seo?.description?.trim()) {
          document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description.trim());
        }
      })
      .catch(() => setMaintenance(null));
  }, []);

  if (window.location.pathname !== '/admin' && !window.location.pathname.startsWith('/admin/') && maintenance?.enabled) {
    return (
      <MaintenancePage
        design={maintenance.design}
        message={maintenance.message}
        reopeningAt={maintenance.reopeningAt}
        email={company?.email}
        phone={company?.phone}
        whatsapp={company?.whatsapp}
        facebook={company?.facebook}
        instagram={company?.instagram}
      />
    );
  }

  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<SiteContentProvider><Layout><SitePages /></Layout></SiteContentProvider>} />
    </Routes>
  );
};

export default App;
