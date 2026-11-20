import React from 'react';
import {
  Clock,
  Mail,
  MessageCircle,
  Phone,
  Lock,
  Package,
  RefreshCw,
  Wrench,
} from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
  reopeningAt?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({
  message,
  reopeningAt,
  email,
  phone,
  whatsapp,
}) => {
  const reopenText = reopeningAt
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Asia/Colombo',
      }).format(new Date(reopeningAt))
    : '';

  const contactEmail = email || 'info@paradiseglobal.lk';
  const contactPhone = phone || whatsapp || '';
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}`
    : `https://wa.me/${contactPhone.replace(/\D/g, '')}`;
  const mailtoLink = `mailto:${contactEmail}`;

  const statusItems = [
    {
      icon: Lock,
      title: 'Your information is safe',
      description: 'All client data and enquiries remain fully protected during maintenance.',
    },
    {
      icon: Package,
      title: 'Existing enquiries continue',
      description: 'Maintenance does not affect your submitted enquiries or service requests.',
    },
    {
      icon: RefreshCw,
      title: 'Service will resume automatically',
      description: 'No action or page refresh is required from you.',
    },
  ];

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #fdf6ec 0%, #fef9f4 30%, #f8f9fb 65%, #f1f4f8 100%)',
      }}
    >
      {/* Header / Logo bar */}
      <div className="border-b border-slate-200/60 bg-white/70 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <img
            src="/logo.png?v=gold"
            alt="Paradise Global Leisures"
            className="h-12 w-12 object-contain"
          />
          <div>
            <span className="font-serif text-lg font-bold text-[#0a1628]">Paradise</span>
            <span className="font-serif text-lg font-bold text-[#c9a84c]"> Global</span>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Leisures
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_460px] lg:items-center lg:py-24">
        {/* ── Left column ── */}
        <div>
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#c9a84c]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#9a7425]">
              Scheduled Maintenance
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-5 font-serif text-4xl font-bold leading-tight text-[#0a1628] md:text-5xl lg:text-[3.25rem]">
            We're making your<br />
            experience<br />
            even better.
          </h1>

          {/* Description */}
          <p className="mb-7 max-w-lg text-base leading-relaxed text-slate-500">
            {message ||
              'Paradise Global Leisures is temporarily offline while our team completes an important update. Your data, enquiries and client information remain fully secure.'}
          </p>

          {/* Expected time */}
          {reopenText && (
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              <Clock size={16} className="text-[#c9a84c]" />
              Expected back online:&nbsp;
              <strong className="text-[#0a1628]">{reopenText}</strong>
            </div>
          )}

          {/* CTA buttons */}
          <div className="mb-8 flex flex-wrap gap-3">
            <a
              href={mailtoLink}
              className="flex items-center gap-2 rounded-xl bg-[#c9a84c] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(201,168,76,0.30)] transition hover:bg-[#b8912e] hover:shadow-[0_8px_24px_rgba(201,168,76,0.4)]"
            >
              <Mail size={16} />
              Contact support
              <span className="ml-0.5 text-white/70">↗</span>
            </a>
            {(whatsapp || contactPhone) && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <MessageCircle size={16} />
                Message on WhatsApp
              </a>
            )}
          </div>

          {/* Auto-check notice */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
            <RefreshCw size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <p>
              This page checks the site status automatically. You'll be returned as soon as
              maintenance is complete.
            </p>
          </div>
        </div>

        {/* ── Right column — Status card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
          {/* Card header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                Current Status
              </p>
              <h2 className="font-serif text-xl font-bold text-[#0a1628]">Upgrade in progress</h2>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c] text-white shadow-[0_6px_18px_rgba(201,168,76,0.35)]">
              <Wrench size={20} />
            </div>
          </div>

          {/* Divider */}
          <div className="mb-5 h-px bg-slate-100" />

          {/* Status items */}
          <div className="space-y-5">
            {statusItems.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#c9a84c]">
                  <Icon size={17} />
                </div>
                <div>
                  <p className="mb-0.5 text-sm font-semibold text-[#0a1628]">{title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-6 h-px bg-slate-100" />

          {/* Contact row */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                Email
              </p>
              <a
                href={mailtoLink}
                className="flex items-center gap-1.5 font-medium text-[#0a1628] hover:text-[#c9a84c]"
              >
                <Mail size={13} className="text-slate-400" />
                {contactEmail}
              </a>
            </div>
            {contactPhone && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Urgent Support
                </p>
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-1.5 font-medium text-[#0a1628] hover:text-[#c9a84c]"
                >
                  <Phone size={13} className="text-slate-400" />
                  {contactPhone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default MaintenancePage;
