import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle, Send, CheckCircle, Clock } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import { getContactSiteKey, saveContactEnquiry } from '../lib/contactApi';
import { Turnstile } from '../components/ui/Turnstile';
import { useTranslation } from 'react-i18next';
import { phoneHref, usePageImage, useCompany, whatsappHref } from '../lib/siteContent';

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const company = useCompany();
  const headerImage = usePageImage('contact', 'header');
  const serviceOptions = [
    { value: '', label: t('contact.servicesSelect') },
    { value: 'Hospitality Booking', label: t('contact.services.hospitalityBooking') },
    { value: 'Plan Approvals', label: t('contact.services.planApprovals') },
    { value: 'Real Estate — Buy', label: t('contact.services.buy') },
    { value: 'Real Estate — Sell', label: t('contact.services.sell') },
    { value: 'Property Management', label: t('contact.services.propertyManagement') },
    { value: 'Legal Consultation', label: t('contact.services.legalConsultation') },
    { value: 'Architectural Support', label: t('contact.services.architecturalSupport') },
    { value: 'Construction', label: t('contact.services.construction') },
    { value: 'General Enquiry', label: t('contact.services.general') },
  ];
  const locationOptions = [
    { value: '', label: t('contact.locationSelect') },
    ...['galle','unawatuna','weligama','mirissa','hiriketiya','tangalle','matara','dikwella'].map((key) => ({ value: key.charAt(0).toUpperCase() + key.slice(1), label: t(`contact.locations.${key}`) })),
    { value: 'Other / Not Sure', label: t('contact.locations.other') },
  ];
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetAttempt, setWidgetAttempt] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', service: '', propertyLocation: '', message: ''
  });

  useEffect(() => {
    const request = new AbortController();
    getContactSiteKey(request.signal).then(setSiteKey).catch(() => {
      if (!request.signal.aborted) setSubmitError(t('contact.reloadError'));
    });
    return () => request.abort();
  }, [t]);

  const handleVerificationError = useCallback(() => {
    setTurnstileToken(null);
    setSubmitError(t('contact.securityLoadError'));
  }, [t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (siteKey === undefined || (siteKey && !turnstileToken)) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await saveContactEnquiry(form, turnstileToken);
      setSubmitted(true);
      setTurnstileToken(null);
    } catch (error) {
      console.error('Unable to save contact enquiry:', error);
      setSubmitError(t('contact.submitError'));
      setTurnstileToken(null);
      setWidgetAttempt((attempt) => attempt + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <title>{t('contact.title')} — Paradise Global Leisures</title>

      {/* Page Header */}
      <div className="relative pt-32 pb-20 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('${headerImage}')` }} />
        <div className="relative container-custom text-center">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">{t('contact.eyebrow')}</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">{t('contact.title')}</h1>
          <div className="gold-divider" />
          <p className="text-white/70 text-lg mt-5 max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>
      </div>

      {/* Contact Grid */}
      <section className="section-padding bg-beige-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Contact Info */}
            <div className="space-y-6">
              <SectionHeader
                eyebrow={t('contact.info')}
                title={t('contact.conversation')}
              />

              <div className="space-y-5 mt-6">
                {/* Address */}
                <div className="flex gap-4 bg-white p-5 rounded-sm shadow-card border border-beige-200">
                  <div className="w-10 h-10 rounded-sm bg-gold-50 border border-gold-200 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm mb-1">{t('contact.ourOffice')}</p>
                    <p className="text-navy-500 text-sm leading-relaxed">
                      {company.name}
                      {company.address.split(/,s*/).map((line) => <React.Fragment key={line}><br />{line}</React.Fragment>)}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4 bg-white p-5 rounded-sm shadow-card border border-beige-200">
                  <div className="w-10 h-10 rounded-sm bg-gold-50 border border-gold-200 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm mb-1">{t('contact.phoneLabel')}</p>
                    <a href={phoneHref(company.phone)} className="text-navy-500 text-sm block hover:text-gold-600 transition-colors">{company.phone}</a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4 bg-white p-5 rounded-sm shadow-card border border-beige-200">
                  <div className="w-10 h-10 rounded-sm bg-gold-50 border border-gold-200 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm mb-1">{t('contact.emailLabel')}</p>
                    <a href={`mailto:${company.email}`} className="text-navy-500 text-sm hover:text-gold-600 transition-colors">{company.email}</a>
                  </div>
                </div>

                {/* WhatsApp */}
                <a
                  href={whatsappHref(company.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 bg-green-50 p-5 rounded-sm shadow-card border border-green-200 hover:border-green-400 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-sm bg-green-100 border border-green-300 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-sm mb-1">WhatsApp</p>
                    <p className="text-green-600 text-sm group-hover:underline">{t('contact.chat')}</p>
                  </div>
                </a>

                {/* Hours */}
                <div className="flex gap-4 bg-white p-5 rounded-sm shadow-card border border-beige-200">
                  <div className="w-10 h-10 rounded-sm bg-gold-50 border border-gold-200 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm mb-1">{t('contact.officeHours')}</p>
                    <p className="text-navy-500 text-sm">{t('contact.hoursWeekday')}</p>
                    <p className="text-navy-500 text-sm">{t('contact.hoursSaturday')}</p>
                    <p className="text-navy-400 text-xs mt-1">{t('contact.sriLankaTime')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enquiry Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-sm shadow-card border border-beige-200 p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                      <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <h3 className="font-serif text-navy-900 text-2xl font-bold mb-3">{t('contact.success')}</h3>
                    <p className="text-navy-500 text-base max-w-md mb-8">
                      {t('contact.successText')}
                    </p>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', service: '', propertyLocation: '', message: '' }); }}
                      className="btn-primary"
                    >
                      {t('contact.another')}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-serif text-navy-900 text-2xl font-bold mb-2">{t('contact.enquiry')}</h3>
                    <p className="text-navy-500 text-sm mb-6">{t('contact.enquirySubtitle')}</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.name')} *</label>
                          <input
                            required
                            name="name"
                            maxLength={150}
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            placeholder={t('contact.placeholders.name')}
                            className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.email')} *</label>
                          <input
                            required
                            name="email"
                            maxLength={254}
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder={t('contact.placeholders.email')}
                            className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.phone')}</label>
                          <input
                            name="phone"
                            maxLength={50}
                            type="tel"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder={t('contact.placeholders.phone')}
                            className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.service')}</label>
                          <select
                            name="service"
                            value={form.service}
                            onChange={handleChange}
                            className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 bg-white focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                          >
                            {serviceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.location')}</label>
                        <select
                          name="propertyLocation"
                          value={form.propertyLocation}
                          onChange={handleChange}
                          className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 bg-white focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
                        >
                          {locationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-navy-600 mb-1.5 uppercase tracking-wide">{t('contact.message')} *</label>
                        <textarea
                          required
                          name="message"
                          maxLength={4000}
                          rows={5}
                          value={form.message}
                          onChange={handleChange}
                          placeholder={t('contact.placeholders.message')}
                          className="w-full border border-beige-300 rounded-sm px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors resize-none"
                        />
                      </div>

                      {siteKey && <Turnstile key={widgetAttempt} siteKey={siteKey} onToken={setTurnstileToken} onError={handleVerificationError} />}
                      {submitError && (
                        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {submitError}
                        </p>
                      )}

                      <button type="submit" disabled={isSubmitting || siteKey === undefined || Boolean(siteKey && !turnstileToken)} className="btn-primary w-full justify-center text-base py-4 disabled:cursor-not-allowed disabled:opacity-60">
                        <Send size={18} /> {isSubmitting ? t('common.loading') : t('common.send')}
                      </button>

                      <p className="text-navy-400 text-xs text-center">
                        {t('contact.privacyNote')}
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="mt-12">
            <div className="bg-white rounded-sm shadow-card border border-beige-200 overflow-hidden">
              <div className="h-72 bg-gradient-to-br from-beige-100 to-beige-200 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={50} className="text-gold-400 mx-auto mb-3" />
                  <p className="font-serif text-navy-800 text-xl font-semibold">{t('contact.mapTitle')}</p>
                  <p className="text-navy-500 text-sm mt-1">Sri Lanka</p>
                  <a
                    href="https://maps.google.com/?q=Kandy+Colombo+Sri+Lanka"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 btn-primary inline-flex text-sm"
                  >
                    <MapPin size={14} /> {t('contact.viewMap')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
