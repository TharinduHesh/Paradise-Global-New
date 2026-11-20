import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import Layout from './components/layout/Layout';

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

type MaintenanceSettings = { enabled: boolean; message: string; reopeningAt?: string };
type CompanySettings = { email?: string; phone?: string; whatsapp?: string };
type ApiSettings = { maintenance?: MaintenanceSettings; company?: CompanySettings; seo?: { title?: string; description?: string } };

const App: React.FC = () => {
  const { t } = useTranslation();
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
        message={maintenance.message}
        reopeningAt={maintenance.reopeningAt}
        email={company?.email}
        phone={company?.phone}
        whatsapp={company?.whatsapp}
      />
    );
  }

  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Layout><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:slug" element={<PropertyDetails />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/contact" element={<Contact />} />
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
      </Routes></Layout>} />
    </Routes>
  );
};

export default App;
