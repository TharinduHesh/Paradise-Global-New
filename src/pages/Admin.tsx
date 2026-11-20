import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, BarChart3, ClipboardList, FileText, LogOut, Menu, Palette,
  Settings, Shield, Users, X, Plus, Clock3, AlertTriangle,
  Eye, EyeOff, Mail, LockKeyhole, ArrowLeft, LogIn,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import i18n from '../i18n';
import MaintenancePage from './Maintenance';
import { adminHome, adminSections, canAccessAdminPage, defaultStaffPermissions, isAdministrator, manageableRoles, staffPermissions, type AccessUser, type Role, type StaffPermission } from '../lib/adminAccess';
import { enquiryCategories, type EnquiryCategory } from '../lib/enquiryCategories';

type User = AccessUser & { id: string; email: string; name: string };
type Enquiry = {
  id: number; name: string; email: string; phone: string; service: string; property_location: string;
  message: string; status: string; created_at: string; category: EnquiryCategory;
  assigned_to: string | null; assignee: string | null;
};
type ContentItem = { id: string; content_type: string; slug: string; title: string; data_json: string; is_published: number; sort_order: number };

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/admin/${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Request failed.');
  return body as T;
};

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20';
const statusClass: Record<string, string> = { new: 'bg-blue-50 text-blue-700', in_progress: 'bg-amber-50 text-amber-700', resolved: 'bg-emerald-50 text-emerald-700', archived: 'bg-slate-100 text-slate-500' };
const ADMIN_SESSION_MS = 5 * 60 * 1000;

const Login: React.FC<{ onAuthenticated: (user: User) => void }> = ({ onAuthenticated }) => {
  const navigate = useNavigate();
  const [setup, setSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', setupToken: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api<{ user: User }>(setup ? 'setup' : 'login', { method: 'POST', body: JSON.stringify(setup ? form : { email: form.email, password: form.password }) });
      onAuthenticated(result.user);
      navigate(adminHome(result.user), { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf1f6] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff_0,#edf1f6_55%,#dde5ef_100%)]" />
      <div className="relative w-full max-w-[470px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(10,22,40,0.14)] sm:px-10 sm:py-10">
          <div className="mb-7 text-center">
            <img src="/logo.png?v=gold" alt="Paradise Global Leisures" className="mx-auto mb-5 h-24 w-24 object-contain" />
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b8912e]">Paradise Admin</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-[#0a1628]">{setup ? 'Create owner account' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-slate-500">{setup ? 'Set up secure access to your website.' : 'Sign in with your authorized administrator account.'}</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            {setup && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0a1628]">Full name</span>
                <input className={inputClass} placeholder="Your full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0a1628]">Email address</span>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} h-12 pl-11`} type="email" placeholder="admin@example.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0a1628]">Password</span>
              <div className="relative">
                <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} h-12 pl-11 pr-12`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={setup ? 'Password (12+ characters)' : 'Enter your password'}
                  minLength={setup ? 12 : undefined}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#9a7425]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            {setup && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0a1628]">Owner setup token</span>
                <input className={`${inputClass} h-12`} type={showPassword ? 'text' : 'password'} placeholder="Owner setup token" required value={form.setupToken} onChange={(e) => setForm({ ...form, setupToken: e.target.value })} />
              </label>
            )}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 font-semibold text-white shadow-[0_10px_24px_rgba(201,168,76,0.25)] transition hover:bg-[#b8912e] disabled:opacity-60">
              {loading ? 'Please wait...' : <><LogIn size={18} />{setup ? 'Create owner account' : 'Sign in securely'}</>}
            </button>
          </form>
          <button onClick={() => { setSetup(!setup); setShowPassword(false); setError(''); }} className="mt-6 w-full text-center text-sm text-slate-500 hover:text-[#9a7425]">
            {setup ? 'Already have an account? Sign in' : 'First deployment? Set up Owner'}
          </button>
        </div>
        <Link to="/" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-[#9a7425]">
          <ArrowLeft size={16} /> Back to website
        </Link>
      </div>
    </main>
  );
};

const Sidebar: React.FC<{ user: User; open: boolean; setOpen: (value: boolean) => void; onLogout: () => void }> = ({ user, open, setOpen, onLogout }) => {
  const isManager = user.role === 'manager';
  const icons: Record<string, LucideIcon> = {
    '/': BarChart3, '/properties': FileText, '/services': Settings, '/enquiries': ClipboardList,
    '/hospitality': FileText, '/projects': FileText, '/content': FileText, '/media': Palette,
    '/seo': BarChart3, '/users': Users, '/activity': Activity, '/account': Shield,
  };
  const links = adminSections.flatMap(([section, title]) => {
    const href = section === '/' ? '/admin' : '/admin' + section;
    return canAccessAdminPage(user, href)
      ? [{ href, label: isManager && section === '/users' ? 'Staff Accounts' : title, icon: icons[section] }]
      : [];
  });
  return <><button aria-label="Open menu" onClick={() => setOpen(!open)} className="fixed left-4 top-4 z-40 rounded-lg bg-[#0a1628] p-2 text-white lg:hidden"><Menu size={20} /></button><aside className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-[#0a1628] px-5 py-6 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}><div className="mb-10 flex items-center justify-between"><Link to={adminHome(user)} className="flex items-center gap-3"><img src="/logo.png?v=gold" alt="" className="h-11 w-11 object-contain" /><span><strong className="block font-serif text-lg">Paradise</strong><small className="text-xs text-white/50">{isManager ? 'MANAGER DASHBOARD' : 'ADMIN CONSOLE'}</small></span></Link><button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button></div><nav aria-label="Admin sections" className="max-h-[calc(100dvh-15rem)] space-y-1 overflow-y-auto">{links.map(({ href, label, icon: Icon }) => <Link key={href} to={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"><Icon size={18} />{label}</Link>)}</nav><div className="absolute bottom-5 left-5 right-5 border-t border-white/10 pt-4"><div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9a84c] text-sm font-bold">{user.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-xs capitalize text-white/50">{user.role}</p></div></div><button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"><LogOut size={16} /> Sign out</button></div></aside></>;
};

const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b8912e]">Paradise Global Leisures</p><h1 className="font-serif text-3xl font-bold text-[#0a1628]">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><Link to="/" target="_blank" className="text-sm font-medium text-[#9a7425] hover:underline">View website ↗</Link></header>;

const Dashboard: React.FC = () => { const [data, setData] = useState<{ metrics: { newEnquiries?: number; publishedContent?: number; activeUsers?: number; maintenance?: { enabled?: boolean } }; activity: { action: string; entity_type: string; user_name: string; created_at: string }[] }>(); useEffect(() => { api<typeof data>('dashboard').then(setData).catch(console.error); }, []); const m = data?.metrics; const cards: { label: string; value: string | number; Icon: LucideIcon; style: string }[] = [{ label: 'New enquiries', value: m?.newEnquiries ?? 0, Icon: ClipboardList, style: 'text-blue-600 bg-blue-50' }, { label: 'Published content', value: m?.publishedContent ?? 0, Icon: FileText, style: 'text-emerald-600 bg-emerald-50' }, { label: 'Active users', value: m?.activeUsers ?? 0, Icon: Users, style: 'text-violet-600 bg-violet-50' }, { label: 'Maintenance', value: m?.maintenance?.enabled ? 'On' : 'Off', Icon: AlertTriangle, style: m?.maintenance?.enabled ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' }]; return <><Header title="Dashboard" subtitle="A quick view of your business and website health." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, Icon, style }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#0a1628]">{value}</p></div><div className={`rounded-lg p-3 ${style}`}><Icon size={21} /></div></div></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-serif text-xl font-bold text-[#0a1628]">Common actions</h2><div className="grid gap-3 sm:grid-cols-2"><Link to="/admin/enquiries" className="flex items-center gap-3 rounded-lg bg-[#f9f6f0] p-4 text-sm font-medium text-[#0a1628] hover:bg-[#f5f0e8]"><ClipboardList size={18} className="text-[#c9a84c]" /> Review enquiries</Link><Link to="/admin/content" className="flex items-center gap-3 rounded-lg bg-[#f9f6f0] p-4 text-sm font-medium text-[#0a1628] hover:bg-[#f5f0e8]"><Plus size={18} className="text-[#c9a84c]" /> Add website content</Link><Link to="/admin/settings" className="flex items-center gap-3 rounded-lg bg-[#f9f6f0] p-4 text-sm font-medium text-[#0a1628] hover:bg-[#f5f0e8]"><Settings size={18} className="text-[#c9a84c]" /> Update business info</Link><Link to="/admin/users" className="flex items-center gap-3 rounded-lg bg-[#f9f6f0] p-4 text-sm font-medium text-[#0a1628] hover:bg-[#f5f0e8]"><Shield size={18} className="text-[#c9a84c]" /> Manage access</Link></div></div><div className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 font-serif text-xl font-bold text-[#0a1628]">Recent activity</h2>{data?.activity?.length ? <div className="space-y-3">{data.activity.slice(0, 6).map((item, index) => <div key={`${item.created_at}-${index}`} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0"><Clock3 size={16} className="mt-0.5 text-[#c9a84c]" /><p className="text-sm text-slate-600"><strong className="text-[#0a1628]">{item.user_name ?? 'System'}</strong> {item.action} {item.entity_type}<span className="block text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span></p></div>)}</div> : <p className="text-sm text-slate-400">No activity recorded yet.</p>}</div></div></>; };

const statuses = ['new', 'in_progress', 'resolved', 'archived'];
type EnquiryNote = { id: string; note: string; author: string | null; created_at: string };

const Enquiries: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [filters, setFilters] = useState({ search: '', status: '', category: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState<EnquiryNote[]>([]);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState({ status: 'new', assignedTo: '', note: '' });
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const selectedId = selected?.id;
  const query = new URLSearchParams(filters).toString();

  useEffect(() => {
    const controller = new AbortController();
    api<{ enquiries: Enquiry[]; hasMore: boolean }>(`enquiries?${query}&page=${page}`, { signal: controller.signal })
      .then((data) => { setItems(data.enquiries); setHasMore(data.hasMore); })
      .catch((caught: Error) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [page, query, revision]);

  useEffect(() => {
    if (!canEdit) return;
    api<{ users: typeof assignees }>('enquiry-assignees').then(({ users }) => setAssignees(users))
      .catch((caught: Error) => setError(caught.message));
  }, [canEdit]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    api<{ notes: EnquiryNote[] }>(`enquiries/${selectedId}`, { signal: controller.signal })
      .then((result) => setNotes(result.notes))
      .catch((caught: Error) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, [selectedId, revision]);

  const select = (item: Enquiry) => {
    setError('');
    setNotes([]);
    setDraft({ status: item.status, assignedTo: item.assigned_to ?? '', note: '' });
    setSelected(item);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await api(`enquiries/${selected.id}`, {
        method: 'PATCH', body: JSON.stringify({ status: draft.status, note: draft.note, ...(draft.assignedTo === (selected.assigned_to ?? '') ? {} : { assignedTo: draft.assignedTo || null }) }),
      });
      setSelected({ ...selected, status: draft.status, assigned_to: draft.assignedTo || null,
        assignee: draft.assignedTo === selected.assigned_to ? selected.assignee : assignees.find((person) => person.id === draft.assignedTo)?.name ?? null });
      setDraft({ ...draft, note: '' });
      setRevision((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save enquiry.');
    } finally {
      setSaving(false);
    }
  };

  const changeFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters({ ...filters, [key]: value });
  };

  return <>
    <Header title="Enquiry Inbox" subtitle={canEdit ? 'Review and assign customer enquiries.' : 'Read-only access to customer enquiries.'} />
    <div className="mb-5 flex flex-wrap gap-3">
      <input className={`${inputClass} flex-1`} aria-label="Search enquiries" placeholder="Search name, email or service"
        value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} />
      <select className={`${inputClass} sm:w-48`} aria-label="Enquiry type" value={filters.category} onChange={(event) => changeFilter('category', event.target.value)}>
        <option value="">All enquiry types</option>
        {Object.entries(enquiryCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <select className={`${inputClass} sm:w-40`} aria-label="Filter by status" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
        <option value="">All statuses</option>
        {statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
      </select>
      {canEdit && <a className="rounded-lg bg-[#0a1628] px-4 py-2.5 text-sm font-semibold text-white" href={`/api/admin/enquiries?format=csv&${query}`}>Export CSV</a>}
    </div>
    {!selected && error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{['Enquirer', 'Type', 'Status', 'Assigned to', 'Received'].map((label) =>
          <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}>
          <td className="px-4 py-3"><button onClick={() => select(item)} className="font-semibold text-[#0a1628] underline">{item.name}</button><p>{item.email}</p></td>
          <td className="px-4 py-3">{enquiryCategories[item.category]}</td>
          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 ${statusClass[item.status] ?? statusClass.new}`}>{item.status.replace('_', ' ')}</span></td>
          <td className="px-4 py-3">{item.assignee ?? 'Unassigned'}</td>
          <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString()}</td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="p-8 text-center text-sm text-slate-500">No enquiries found.</p>}
    </div>
    {(page > 1 || hasMore) && <div className="mt-4 flex gap-4 text-sm">
      <button disabled={page === 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
      <span>Page {page}</span>
      <button disabled={!hasMore} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
    </div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1628]/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="enquiry-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6">
        <div className="mb-4 flex justify-between"><h2 id="enquiry-title" className="font-serif text-2xl font-bold">{selected.name}</h2>
          <button disabled={saving} onClick={() => setSelected(null)} aria-label="Close enquiry"><X size={20} /></button></div>
        <div className="space-y-2 text-sm">
          <p>{selected.email} {selected.phone}</p><p>{selected.service} {selected.property_location}</p>
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4">{selected.message}</p>
          <p>Status: {selected.status.replace('_', ' ')} · Assigned to: {selected.assignee ?? 'Unassigned'}</p>
          <h3 className="pt-2 font-semibold">Internal notes</h3>
          {notes.length ? notes.map((note) => <div key={note.id} className="rounded bg-slate-50 p-3">
            <p className="font-medium">{note.author ?? 'Former staff'} · {new Date(note.created_at).toLocaleString()}</p>
            <p className="whitespace-pre-wrap">{note.note}</p>
          </div>) : <p className="text-slate-500">No notes yet.</p>}
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {canEdit && <form onSubmit={save} className="space-y-3 border-t pt-4">
            <label className="block">Status<select className={inputClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              {statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
            <label className="block">Assign to<select className={inputClass} value={draft.assignedTo} onChange={(event) => setDraft({ ...draft, assignedTo: event.target.value })}>
              <option value="">Unassigned</option>
              {draft.assignedTo && !assignees.some((person) => person.id === draft.assignedTo) && <option value={draft.assignedTo}>{selected.assignee} (inactive)</option>}
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <label className="block">Add internal note<textarea className={inputClass} maxLength={4000} value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
            <button disabled={saving} className="rounded-lg bg-[#0a1628] px-4 py-2 font-semibold text-white">Save enquiry</button>
          </form>}
        </div>
      </section>
    </div>}
  </>;
};

const Content: React.FC<{ title: string; types: string[] }> = ({ title, types }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [type, setType] = useState(types[0]);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState({ title: '', slug: '', image: '', data: '{\n  "description": "",\n  "icon": "FileCheck",\n  "features": []\n}', isPublished: false });
  const load = () => api<{ items: ContentItem[] }>(`content?type=${type}`).then((r) => setItems(r.items)).catch(console.error);
  useEffect(() => { load(); }, [type]);
  const reset = () => { setEditingId(undefined); setForm({ title: '', slug: '', image: '', data: '{\n  "description": "",\n  "icon": "FileCheck",\n  "features": []\n}', isPublished: false }); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const data = JSON.parse(form.data) as Record<string, unknown>;
      if (type === 'service') data.image = form.image.trim();
      await api('content', { method: 'POST', body: JSON.stringify({ id: editingId, contentType: type, title: form.title, slug: form.slug, data, sortOrder: items.find((item) => item.id === editingId)?.sort_order, isPublished: form.isPublished }) });
      reset(); load();
    } catch (error) { alert(error instanceof Error ? error.message : 'Invalid content'); }
  };
  return <><Header title={title} subtitle="Manage records in the website content catalogue." />
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-4 flex gap-2 overflow-x-auto">{types.map((value) => <button key={value} onClick={() => { setType(value); reset(); }} className={`rounded-full px-4 py-2 text-sm capitalize ${type === value ? 'bg-[#0a1628] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{value}s</button>)}</div>
        <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium text-[#0a1628]">{item.title}</p><p className="text-xs text-slate-500">/{item.slug} · {item.is_published ? 'Published' : 'Draft'}</p></div>
          <div className="flex gap-2"><button onClick={() => { const data = JSON.parse(item.data_json) as { image?: string }; setEditingId(item.id); setForm({ title: item.title, slug: item.slug, image: data.image ?? '', data: JSON.stringify(JSON.parse(item.data_json), null, 2), isPublished: Boolean(item.is_published) }); }} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button><button onClick={async () => { await api('content/publish', { method: 'POST', body: JSON.stringify({ id: item.id, published: !item.is_published }) }); load(); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${item.is_published ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.is_published ? 'Unpublish' : 'Publish'}</button><button onClick={async () => { if (window.confirm(`Delete ${item.title}?`)) { await api(`content/${item.id}`, { method: 'DELETE' }); if (editingId === item.id) reset(); load(); } }} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></div>
        </div>)}{!items.length && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">No {type}s yet. Add the first one.</div>}</div>
      </div>
      <form onSubmit={save} className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-bold text-[#0a1628]"><Plus size={19} className="text-[#c9a84c]" /> {editingId ? 'Edit' : 'Add'} {type}</h2><div className="space-y-3"><input className={inputClass} required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><input className={inputClass} required placeholder="URL slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />{type === 'service' && <input className={inputClass} aria-label="Service image URL" placeholder="Image URL or /image-path (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />}<textarea className={`${inputClass} min-h-48 font-mono text-xs`} required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />{type === 'service' && <p className="text-xs text-slate-500">Edit the description, icon, features, and process in JSON.</p>}<label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Publish now</label><div className="flex gap-2"><button className="flex-1 rounded-lg bg-[#c9a84c] px-4 py-3 font-semibold text-white hover:bg-[#b8912e]">{editingId ? 'Update' : 'Save'} content</button>{editingId && <button type="button" onClick={reset} className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>}</div></div></form>
    </div></>;
};

const MaintenancePreview: React.FC = () => {
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; title: string; message: string; reopeningAt: string }>({
    enabled: false,
    title: "We'll Be Right Back",
    message: 'We are making improvements. Please check back soon.',
    reopeningAt: '',
  });
  const [company, setCompany] = useState<{ email?: string; phone?: string; whatsapp?: string }>({});
  useEffect(() => {
    api<{ settings: Record<string, Record<string, unknown>> }>('settings')
      .then((r) => {
        setMaintenance((r.settings.maintenance ?? maintenance) as typeof maintenance);
        setCompany((r.settings.company ?? {}) as typeof company);
      })
      .catch(console.error);
  }, []);
  return (
    <div className="fixed inset-0 z-50 overflow-auto">
      <MaintenancePage
        message={maintenance.message}
        reopeningAt={maintenance.reopeningAt}
        email={company.email}
        phone={company.phone}
        whatsapp={company.whatsapp}
      />
      <Link to="/admin/settings" className="fixed right-5 top-5 z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a1628] shadow-lg border border-slate-200">
        ← Close preview
      </Link>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [message, setMessage] = useState('');
  useEffect(() => { api<{ settings: Record<string, Record<string, unknown>> }>('settings').then((r) => setSettings(r.settings)).catch(console.error); }, []);
  const company = (settings.company ?? {}) as Record<string, string>;
  const maintenance = (settings.maintenance ?? { enabled: false, title: "We'll Be Right Back", message: '', reopeningAt: '' }) as { enabled: boolean; title: string; message: string; reopeningAt: string };
  const update = async (key: string, value: unknown) => {
    try {
      await api('settings', { method: 'POST', body: JSON.stringify({ key, value }) });
      setSettings({ ...settings, [key]: value as Record<string, unknown> });
      setMessage('Saved successfully.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to save settings.');
    }
  };
  return (
    <>
      <Header title="Business & appearance" subtitle="Keep contact information, branding, SEO and maintenance settings current." />
      {message && <div role="status" className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-serif text-xl font-bold text-[#0a1628]">Business information</h2>
          <div className="space-y-3">
            {[['name', 'Company name'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['address', 'Address'], ['hours', 'Opening hours']].map(([key, label]) =>
              <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}<input className={`${inputClass} mt-1 normal-case font-normal`} value={company[key] ?? ''} onChange={(e) => setSettings({ ...settings, company: { ...company, [key]: e.target.value } })} /></label>
            )}
            <button onClick={() => update('company', company)} className="mt-2 rounded-lg bg-[#0a1628] px-4 py-2.5 text-sm font-semibold text-white">Save business info</button>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 font-serif text-xl font-bold text-[#0a1628]"><Settings size={20} className="text-[#c9a84c]" /> Maintenance mode</h2>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={maintenance.enabled} onChange={(e) => setSettings({ ...settings, maintenance: { ...maintenance, enabled: e.target.checked } })} /> Show maintenance page to public visitors</label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Page title *<input className={`${inputClass} mt-1 normal-case font-normal`} value={maintenance.title ?? ''} onChange={(e) => setSettings({ ...settings, maintenance: { ...maintenance, title: e.target.value } })} /></label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message *<textarea className={`${inputClass} mt-1 normal-case font-normal`} rows={4} value={maintenance.message ?? ''} onChange={(e) => setSettings({ ...settings, maintenance: { ...maintenance, message: e.target.value } })} /></label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expected reopening<input type="datetime-local" className={`${inputClass} mt-1 normal-case font-normal`} value={maintenance.reopeningAt ?? ''} onChange={(e) => setSettings({ ...settings, maintenance: { ...maintenance, reopeningAt: e.target.value } })} /></label>
          <p className="mt-2 text-xs text-slate-400">Leave empty when no exact reopening time is available.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => update('maintenance', maintenance)} className="rounded-lg bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-white">Save maintenance settings</button>
            <Link to="/admin/maintenance-preview" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Preview maintenance page</Link>
          </div>
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">Authorized dashboard pages remain available while maintenance mode is enabled.</div>
        </section>
      </div>
    </>
  );
};

type StaffAccount = User & { is_active: number; permissions: StaffPermission[] };
const newAccount = { name: '', email: '', role: 'editor' as Role, password: '', permissions: defaultStaffPermissions, isActive: true };
const permissionTitles = { enquiries: 'View enquiry inbox', activity: 'View activity logs' };

const UsersPage: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<StaffAccount[]>([]);
  const [form, setForm] = useState(newAccount);
  const [editingId, setEditingId] = useState<string>();
  const [resetTarget, setResetTarget] = useState<StaffAccount>();
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const allowedRoles = manageableRoles(user.role);

  const load = async () => {
    const result = await api<{ users: StaffAccount[] }>('users');
    setUsers(result.users);
  };
  useEffect(() => {
    const controller = new AbortController();
    api<{ users: StaffAccount[] }>('users', { signal: controller.signal })
      .then((result) => setUsers(result.users))
      .catch((caught: Error) => { if (!controller.signal.aborted) setError(caught.message); });
    return () => controller.abort();
  }, []);

  const apply = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); await load(); setNotice(message); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save account.'); }
    finally { setBusy(false); }
  };

  const clearForm = () => { setEditingId(undefined); setForm(newAccount); };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const { password, permissions, ...profile } = form;
    const body = { ...profile, ...(editingId ? {} : { password }), ...(form.role === 'editor' ? { permissions } : {}) };
    void apply(async () => {
      await api(editingId ? `users/${editingId}` : 'users', {
        method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(body),
      });
      clearForm();
    }, editingId ? 'Account updated.' : 'Account created.');
  };

  return <>
    <Header title={user.role === 'manager' ? 'Staff Accounts' : 'Users & Settings'} subtitle="Create and manage staff accounts and their permissions." />
    {isAdministrator(user.role) && <Link to="/admin/settings" className="mb-5 inline-block rounded-lg bg-slate-100 px-4 py-2 font-semibold">Business settings & maintenance</Link>}
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-emerald-700">{notice}</p>}
    <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
      <div className="space-y-3">
        {users.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0"><p className="font-semibold">{account.name}</p>
            <p className="break-all text-sm text-slate-600">{account.email}</p>
            <p className="text-sm capitalize text-slate-500">{account.role} · {account.is_active ? 'Active' : 'Inactive'}</p></div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <button disabled={busy} onClick={() => { setResetTarget(undefined); setEditingId(account.id); setForm({
              name: account.name, email: account.email, role: account.role, permissions: account.permissions, password: '', isActive: Boolean(account.is_active),
            }); }}>Edit</button>
            <button disabled={busy} onClick={() => { clearForm(); setResetPassword(''); setResetTarget(account); }}>Reset password</button>
            <button disabled={busy} className="text-red-700" onClick={() => {
              if (!window.confirm(`Delete the account for ${account.name}? This will end their sessions.`)) return;
              void apply(async () => {
                await api(`users/${account.id}`, { method: 'DELETE' });
                if (editingId === account.id) clearForm();
                if (resetTarget?.id === account.id) setResetTarget(undefined);
              }, 'Account deleted.');
            }}>Delete</button>
          </div>
        </div>)}
        {!users.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No staff accounts to display.</p>}
      </div>
      {resetTarget ? <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" onSubmit={(event) => {
        event.preventDefault();
        void apply(async () => {
          await api(`users/${resetTarget.id}/password`, { method: 'POST', body: JSON.stringify({ password: resetPassword }) });
          setResetPassword('');
          setResetTarget(undefined);
        }, 'Password reset and existing sessions ended.');
      }}>
        <h2 className="text-lg font-semibold">Reset password for {resetTarget.name}</h2>
        <label className="block">New password<input className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label>
        <button disabled={busy} className="rounded-lg bg-[#0a1628] px-4 py-2 text-white">Reset password</button>
        <button disabled={busy} type="button" className="ml-3" onClick={() => { setResetTarget(undefined); setResetPassword(''); }}>Cancel</button>
      </form> : <form className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" onSubmit={save}>
        <h2 className="text-lg font-semibold">{editingId ? 'Edit account' : 'Add a user'}</h2>
        <label className="block">Full name<input className={inputClass} required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="block">Email<input className={inputClass} type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="block">Role<select className={`${inputClass} capitalize`} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
          {allowedRoles.map((role) => <option value={role} key={role}>{role === 'editor' ? 'Staff (Editor)' : role}</option>)}
        </select></label>
        {form.role === 'editor' && <fieldset className="space-y-2">
          <legend className="font-semibold">Staff permissions</legend>
          {staffPermissions.map((permission) => <label key={permission} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.permissions.includes(permission)} onChange={(event) => setForm({
              ...form, permissions: event.target.checked ? [...form.permissions, permission] : form.permissions.filter((value) => value !== permission),
            })} />{permissionTitles[permission]}
          </label>)}
        </fieldset>}
        {editingId ? <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active</label>
          : <label className="block">Temporary password<input className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
        <button disabled={busy} className="rounded-lg bg-[#0a1628] px-4 py-2 text-white">{editingId ? 'Save changes' : 'Create user'}</button>
        {editingId && <button disabled={busy} type="button" className="ml-3" onClick={clearForm}>Cancel</button>}
      </form>}
    </div>
  </>;
};

type ActivityEntry = { id: string; user_name: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };

const ActivityPage: React.FC = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { api<{ activity: ActivityEntry[] }>('activity').then(({ activity }) => setEntries(activity))
    .catch((caught: Error) => setError(caught.message)); }, []);
  return <>
    <Header title="Activity Logs" subtitle="Review recent account, permission, and dashboard activity." />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {entries.map((entry) => <li key={entry.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
        <span><strong>{entry.user_name ?? 'System'}</strong> · {entry.action.replaceAll('_', ' ')} · {entry.entity_type}</span>
        <time>{new Date(entry.created_at).toLocaleString()}</time>
      </li>)}
      {!entries.length && !error && <li className="p-4 text-sm text-slate-500">No activity recorded.</li>}
    </ul>
  </>;
};

const SeoPage: React.FC = () => {
  const [seo, setSeo] = useState({ title: '', description: '' });
  const [report, setReport] = useState<{ newEnquiries: number; publishedContent: number; activeUsers: number }>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<{ settings: { seo?: typeof seo } }>('settings'), api<{ metrics: NonNullable<typeof report> }>('dashboard')])
      .then(([settings, dashboard]) => { if (settings.settings.seo) setSeo(settings.settings.seo); setReport(dashboard.metrics); })
      .catch((caught: Error) => setError(caught.message));
  }, []);
  return <>
    <Header title="SEO & Reports" subtitle="Edit the site title and description and review key totals." />
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p>}
    <form className="mb-5 max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5" onSubmit={async (event) => {
      event.preventDefault(); setError(''); setNotice('');
      try { await api('settings', { method: 'POST', body: JSON.stringify({ key: 'seo', value: seo }) }); setNotice('SEO settings saved.'); }
      catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save SEO settings.'); }
    }}>
      <label className="block">Site title<input className={inputClass} value={seo.title} maxLength={120} onChange={(event) => setSeo({ ...seo, title: event.target.value })} /></label>
      <label className="block">Site description<textarea className={inputClass} value={seo.description} maxLength={320} onChange={(event) => setSeo({ ...seo, description: event.target.value })} /></label>
      <button className="rounded-lg bg-[#0a1628] px-4 py-2 text-white">Save SEO settings</button>
    </form>
    {report && <dl className="grid max-w-xl gap-3 sm:grid-cols-3">
      {[['New enquiries', report.newEnquiries], ['Published records', report.publishedContent], ['Active users', report.activeUsers]].map(([label, total]) =>
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><dt>{label}</dt><dd className="text-xl font-bold">{total}</dd></div>)}
    </dl>}
  </>;
};

const AccountPage: React.FC = () => { const [form, setForm] = useState({ currentPassword: '', newPassword: '' }); const [message, setMessage] = useState(''); const [error, setError] = useState(''); return <><Header title="My account" subtitle="Change your password and protect your admin session." /><form onSubmit={async (event) => { event.preventDefault(); setMessage(''); setError(''); try { await api('password', { method: 'POST', body: JSON.stringify(form) }); setMessage('Password changed. Please sign in again.'); setForm({ currentPassword: '', newPassword: '' }); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to change password.'); } }} className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="space-y-4"><label className="block text-xs font-semibold uppercase text-slate-500">Current password<input className={`${inputClass} mt-1 normal-case font-normal`} type="password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></label><label className="block text-xs font-semibold uppercase text-slate-500">New password<input className={`${inputClass} mt-1 normal-case font-normal`} type="password" minLength={12} required value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></label>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}<button className="rounded-lg bg-[#0a1628] px-4 py-3 text-sm font-semibold text-white">Change password</button></div></form></>; };

const AdminApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    return () => {
      const saved = window.localStorage.getItem('pgl-language') === 'he' ? 'he' : 'en';
      document.documentElement.lang = saved;
      document.documentElement.dir = saved === 'he' ? 'rtl' : 'ltr';
      void i18n.changeLanguage(saved);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.toLowerCase().replace(/\/+$/, '') === '/admin/login') {
      setLoading(false);
      setUser(null);
      return;
    }
    setLoading(true);
    api<{ user: User }>('me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [location.pathname]);
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => {
      api('logout', { method: 'POST' })
        .catch(() => undefined)
        .finally(() => {
          setUser(null);
          navigate('/admin/login', { replace: true });
        });
    }, ADMIN_SESSION_MS);
    return () => window.clearTimeout(timer);
  }, [user, navigate]);
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading admin...</div>;
  if (!user) return <Login onAuthenticated={(authenticatedUser) => setUser(authenticatedUser)} />;
  const path = location.pathname.replace(/\/+$/, '').toLowerCase();
  if (!canAccessAdminPage(user, path)) return <Navigate to={adminHome(user)} replace />;

  const catalogue: Record<string, { title: string; types: string[] }> = {
    '/admin/properties': { title: 'Property Listings', types: ['property'] },
    '/admin/services': { title: 'Services & Divisions', types: ['service'] },
    '/admin/hospitality': { title: 'Hospitality', types: ['hospitality', 'destination'] },
    '/admin/projects': { title: 'Projects & Testimonials', types: ['project', 'testimonial'] },
    '/admin/content': { title: 'Website Content', types: ['property', 'service', 'destination', 'gallery', 'page'] },
    '/admin/media': { title: 'Media & Translations', types: ['media', 'translation', 'gallery'] },
  };
  const section = catalogue[path];
  let page = <Dashboard />;
  if (section) page = <Content key={path} {...section} />;
  if (path === '/admin/enquiries') page = <Enquiries canEdit={isAdministrator(user.role)} />;
  if (path === '/admin/activity') page = <ActivityPage />;
  if (path === '/admin/account') page = <AccountPage />;
  if (path === '/admin/maintenance-preview') page = <MaintenancePreview />;
  if (path === '/admin/settings') page = <SettingsPage />;
  if (path === '/admin/users') page = <UsersPage user={user} />;
  if (path === '/admin/seo') page = <SeoPage />;
  return <div className="min-h-screen bg-[#f8fafc]"><Sidebar user={user} open={open} setOpen={setOpen} onLogout={async () => { await api('logout', { method: 'POST', credentials: 'include' }); setUser(null); navigate('/admin/login', { replace: true }); }} /><main className="min-h-screen px-4 py-8 lg:ml-64 lg:px-10">{page}</main></div>;
};

export default AdminApp;
