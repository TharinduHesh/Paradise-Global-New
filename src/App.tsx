import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
              <p className="text-navy-500 text-xl mb-6">Page not found</p>
              <a href="/" className="btn-primary">Go Home</a>
            </div>
          </div>
        } />
      </Routes></Layout>} />
    </Routes>
  );
};

export default App;
