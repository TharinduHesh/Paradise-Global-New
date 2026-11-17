import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => (
  <>
    <title>Terms of Service — Paradise Global Leisures</title>
    <div className="relative bg-navy-900 pb-16 pt-32"><div className="container-custom"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">Legal</p><h1 className="font-serif text-4xl font-bold text-white md:text-5xl">Terms of Service</h1><p className="mt-4 text-white/60">Effective date: 30/11/2026</p></div></div>
    <main className="section-padding bg-beige-50"><article className="container-custom max-w-4xl"><div className="space-y-10 rounded-sm bg-white p-6 shadow-card md:p-10">
      <section><h2 className="legal-heading">Using our website</h2><p>The Paradise Global Leisures website provides information about property listings and services in Sri Lanka. Please use the website lawfully, submit accurate information, and respect the privacy and intellectual property of others.</p></section>
      <section><h2 className="legal-heading">Property and service information</h2><p>Property descriptions, photographs, prices, and availability may change. Confirm current details with us before making a decision. Before buying, selling, or starting construction, arrange independent verification of relevant matters such as ownership, boundaries, permits, and approvals with qualified professionals.</p></section>
      <section><h2 className="legal-heading">Enquiries and service agreements</h2><p>Submitting an enquiry starts a conversation with our team. Any service we agree to provide will be governed by a separate written agreement covering the scope, fees, timelines, and responsibilities.</p></section>
      <section><h2 className="legal-heading">Website content and external links</h2><p>Our branding and original content belong to Paradise Global Leisures or the respective rights holders. You may use the website content for personal reference when evaluating a property or service. Obtain the relevant permission before republishing it. External websites and services are governed by their own terms and privacy policies.</p></section>
      <section><h2 className="legal-heading">Applicable law and contact</h2><p>These terms are governed by the laws of Sri Lanka. Your mandatory rights under applicable law apply. For questions about these terms or our services, use our <Link className="text-gold-600 underline" to="/contact">Contact Us</Link> page.</p></section>
    </div></article></main>
  </>
);

export default TermsOfService;