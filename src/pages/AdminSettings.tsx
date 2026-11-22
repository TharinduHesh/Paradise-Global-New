import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Camera, Clock3, Eye, Globe, Mail, MapPin, MessageCircle, Phone, Power, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, Header, inputClass } from '../components/admin/adminUi';
import { defaultCompany } from '../lib/siteContent';

type Settings = Record<string, Record<string, unknown>>;
const loadSettings = () => api<{ settings: Settings }>('settings').then((result) => result.settings);
const saveSetting = (key: string, value: unknown) => api('settings', { method: 'POST', body: JSON.stringify({ key, value }) });

const Notice: React.FC<{ notice: { ok: boolean; text: string } | null }> = ({ notice }) => notice
  ? <div role={notice.ok ? 'status' : 'alert'} className={`mb-5 rounded-lg px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</div>
  : null;

/* ------------------------------------------------------------------ Business info */

interface BusinessField { key: string; label: string; icon: LucideIcon; placeholder: string; multiline?: boolean; hebrew?: boolean; help?: string }

const businessGroups: { title: string; fields: BusinessField[] }[] = [
  { title: 'Contact details', fields: [
    { key: 'name', label: 'Company name', icon: Building2, placeholder: defaultCompany.name },
    { key: 'phone', label: 'Telephone number', icon: Phone, placeholder: defaultCompany.phone },
    { key: 'whatsapp', label: 'WhatsApp number', icon: MessageCircle, placeholder: defaultCompany.whatsapp, help: 'Include the country code, e.g. +94751668705.' },
    { key: 'email', label: 'Email address', icon: Mail, placeholder: defaultCompany.email },
  ] },
  { title: 'Address & business hours', fields: [
    { key: 'address', label: 'Address', icon: MapPin, placeholder: defaultCompany.address, multiline: true, help: 'Separate lines with commas.' },
    { key: 'address_he', label: 'Address (Hebrew)', icon: MapPin, placeholder: 'Optional — shown on the Hebrew website', multiline: true, hebrew: true },
    { key: 'hours', label: 'Business hours', icon: Clock3, placeholder: defaultCompany.hours, multiline: true, help: 'Separate days with a semicolon, e.g. "Mon–Fri: 9 AM – 6 PM; Sat: 9 AM – 1 PM".' },
    { key: 'hours_he', label: 'Business hours (Hebrew)', icon: Clock3, placeholder: 'Optional — shown on the Hebrew website', multiline: true, hebrew: true },
  ] },
  { title: 'Social media', fields: [
    { key: 'facebook', label: 'Facebook page link', icon: Globe, placeholder: 'https://www.facebook.com/…', help: 'Leave empty to hide the Facebook icon on the website.' },
    { key: 'instagram', label: 'Instagram profile link', icon: Camera, placeholder: 'https://www.instagram.com/…', help: 'Leave empty to hide the Instagram icon on the website.' },
  ] },
];

export const BusinessInfoPage: React.FC = () => {
  const [company, setCompany] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadSettings()
      .then((settings) => {
        const values = Object.fromEntries(Object.entries(settings.company ?? {}).map(([key, value]) => [key, String(value ?? '')]));
        setCompany(values);
        setSaved(values);
      })
      .catch((reason: Error) => setNotice({ ok: false, text: reason.message }))
      .finally(() => setLoading(false));
  }, []);

  const changed = JSON.stringify(company) !== JSON.stringify(saved);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Object.fromEntries(Object.entries(company).map(([key, text]) => [key, text.trim()]));
    setSaving(true);
    try {
      await saveSetting('company', value);
      setCompany(value);
      setSaved(value);
      setNotice({ ok: true, text: 'Business information saved. The website now shows the new details.' });
    } catch (reason) {
      setNotice({ ok: false, text: reason instanceof Error ? reason.message : 'Unable to save.' });
    } finally { setSaving(false); }
  };

  return <>
    <Header title="Business Info" subtitle="Contact details, address, business hours and social links shown across the website." />
    <Notice notice={notice} />
    {loading ? <p className="text-sm text-slate-400">Loading…</p> : <form onSubmit={save} className="space-y-6">
      {businessGroups.map((group) => <section key={group.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-serif text-xl font-bold text-[#0a1628]">{group.title}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {group.fields.map(({ key, label, icon: Icon, placeholder, multiline, hebrew, help }) => {
            const value = company[key] ?? '';
            const props = { id: `company-${key}`, dir: hebrew ? 'rtl' : undefined, className: `${inputClass} pr-9`, placeholder, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCompany({ ...company, [key]: event.target.value }) };
            return <div key={key}>
              <label htmlFor={`company-${key}`} className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon size={14} className="text-[#c9a84c]" /> {label}</label>
              <div className="relative">
                {multiline ? <textarea rows={2} {...props} /> : <input {...props} />}
                {value && <button type="button" onClick={() => setCompany({ ...company, [key]: '' })} aria-label={`Clear ${label}`} title="Clear"
                  className="absolute right-2 top-2.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><X size={15} /></button>}
              </div>
              {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
            </div>;
          })}
        </div>
      </section>)}
      <p className="text-xs text-slate-500">Empty contact fields fall back to the website's original details, so the website never shows a blank phone number or email.</p>
      <div className="sticky bottom-4 flex justify-end">
        <button disabled={saving || !changed} className="rounded-lg bg-[#c9a84c] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#b8912e] disabled:opacity-50">{saving ? 'Saving…' : changed ? 'Save business info' : 'All changes saved'}</button>
      </div>
    </form>}
  </>;
};

/* ------------------------------------------------------------------ Maintenance */

interface Maintenance { enabled: boolean; title: string; message: string; reopeningAt: string }
const defaultMaintenance: Maintenance = { enabled: false, title: "We'll Be Right Back", message: 'We are making improvements. Please check back soon.', reopeningAt: '' };

export const MaintenanceModePage: React.FC = () => {
  const [maintenance, setMaintenance] = useState<Maintenance>(defaultMaintenance);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadSettings()
      .then((settings) => setMaintenance({ ...defaultMaintenance, ...(settings.maintenance as Partial<Maintenance> | undefined) }))
      .catch((reason: Error) => setNotice({ ok: false, text: reason.message }))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next: Maintenance, success: string) => {
    if (!next.title.trim() || !next.message.trim()) { setNotice({ ok: false, text: 'Page title and message are required.' }); return; }
    setSaving(true);
    try {
      await saveSetting('maintenance', next);
      setMaintenance(next);
      setNotice({ ok: true, text: success });
    } catch (reason) {
      setNotice({ ok: false, text: reason instanceof Error ? reason.message : 'Unable to save.' });
    } finally { setSaving(false); }
  };

  const toggle = () => {
    const enabling = !maintenance.enabled;
    if (enabling && !window.confirm('Turn maintenance mode ON? Visitors will see the maintenance page instead of the website until you turn it off.')) return;
    void persist({ ...maintenance, enabled: enabling }, enabling ? 'Maintenance mode is ON. Visitors now see the maintenance page.' : 'Maintenance mode is OFF. The website is live again.');
  };

  return <>
    <Header title="Maintenance Mode" subtitle="Temporarily replace the public website with a maintenance page." />
    <Notice notice={notice} />
    {loading ? <p className="text-sm text-slate-400">Loading…</p> : <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className={`h-fit rounded-xl border p-6 shadow-sm ${maintenance.enabled ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website status</p>
        <p className={`mt-1 font-serif text-2xl font-bold ${maintenance.enabled ? 'text-amber-800' : 'text-emerald-800'}`}>{maintenance.enabled ? 'Under maintenance' : 'Live'}</p>
        <p className="mt-2 text-sm text-slate-600">{maintenance.enabled ? 'Visitors see the maintenance page. The admin panel keeps working.' : 'Visitors see the full website.'}</p>
        <button role="switch" aria-checked={maintenance.enabled} disabled={saving} onClick={toggle}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-60 ${maintenance.enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
          <Power size={18} /> {saving ? 'Saving…' : maintenance.enabled ? 'Turn maintenance OFF' : 'Turn maintenance ON'}
        </button>
        <Link to="/admin/maintenance-preview" className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><Eye size={16} /> Preview maintenance page</Link>
      </section>
      <form onSubmit={(event) => { event.preventDefault(); void persist(maintenance, 'Maintenance page content saved.'); }} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-serif text-xl font-bold text-[#0a1628]">Maintenance page content</h2>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Page title *<input required className={`${inputClass} mt-1 font-normal normal-case`} value={maintenance.title} onChange={(event) => setMaintenance({ ...maintenance, title: event.target.value })} /></label>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message *<textarea required rows={4} className={`${inputClass} mt-1 font-normal normal-case`} value={maintenance.message} onChange={(event) => setMaintenance({ ...maintenance, message: event.target.value })} /></label>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expected reopening<input type="datetime-local" className={`${inputClass} mt-1 font-normal normal-case`} value={maintenance.reopeningAt} onChange={(event) => setMaintenance({ ...maintenance, reopeningAt: event.target.value })} /></label>
        <p className="mt-1 text-xs text-slate-400">Leave empty when there is no exact reopening time. The page also shows the phone, WhatsApp and email from Business Info.</p>
        <button disabled={saving} className="mt-5 rounded-lg bg-[#0a1628] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Save page content</button>
      </form>
    </div>}
  </>;
};
