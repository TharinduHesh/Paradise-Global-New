import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const App: React.FC = () => {
  const { t } = useTranslation();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return;
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ settings: { maintenance?: { enabled: boolean; message: string } } }> : Promise.reject())
      .then((result) => setMaintenance(result.settings.maintenance ?? null))
      .catch(() => setMaintenance(null));
  }, []);

  if (window.location.pathname !== '/admin' && !window.location.pathname.startsWith('/admin/') && maintenance?.enabled) {
    return (
      <main className="grid min-h-screen place-items-center bg-navy-900 px-6 text-center text-white">
        <div className="max-w-xl">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gold-500 font-serif text-4xl font-bold">P</div>
          <h1 className="mb-4 font-serif text-4xl md:text-5xl">{t('maintenance.title')}</h1>
          <div className="mx-auto my-6 h-px w-16 bg-gold-500" />
          <p className="text-lg leading-relaxed text-white/75">{maintenance.message || t('maintenance.defaultMessage')}</p>
        </div>
      </main>
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
