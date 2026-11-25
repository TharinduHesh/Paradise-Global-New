import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImageOff, Plus, RotateCcw, Search } from 'lucide-react';
import { api, Header, inputClass } from '../components/admin/adminUi';
import { translateToHebrew } from '../components/admin/autoTranslate';
import { websiteSections } from '../lib/adminAccess';
import { blankValue, contentSchemas, slugify, type FieldDef, type TypeSchema } from '../lib/contentSchemas';
import { originalImages, originalText, textGroups, type FlatText, type TextGroup, type TextOverrides } from '../lib/siteText';

type ContentItem = { id: string; content_type: string; slug: string; title: string; data_json: string; is_published: number; sort_order: number };
type Data = Record<string, unknown>;

const typeLabels: Record<string, string> = { page: 'Pages', translation: 'Site-wide text' };
const typeLabel = (type: string) => contentSchemas[type]?.label ?? typeLabels[type] ?? type;

const typeNotes: Record<string, string> = {
  property: 'Every property on the website is listed here. Unpublished properties are hidden from the website.',
  service: 'Every service and division on the website. Inactive services are hidden from the homepage and services pages. Use the arrows to change their order.',
  destination: 'The destinations shown in the Hospitality Collection, on the homepage and in the footer.',
  project: 'Projects shown on the /projects page.',
  testimonial: 'Published testimonials appear on the homepage. The section stays hidden until at least one is published.',
  media: 'A catalogue of the images used on the website. To change an image on the website, edit the page or record that uses it; removing an image from this library does not remove it from those pages.',
  page: 'The text and images of each page. Edit the English; the Hebrew website is translated automatically when you save. Only your changes are saved; "Reset" restores the original wording.',
  translation: 'Text shared across the website, such as the menu, footer and buttons. Edit the English; the Hebrew website is translated automatically when you save. Only your changes are saved; "Reset" restores the original wording.',
};

const parseData = (item: ContentItem): Data => { try { return JSON.parse(item.data_json) as Data; } catch { return {}; } };
const thumbnail = (data: Data) => {
  const images = Array.isArray(data.images) ? data.images : [];
  const candidate = [data.image, data.url, images[0]].find((value) => typeof value === 'string' && value.trim());
  return typeof candidate === 'string' ? candidate : '';
};

const WebsiteManagement: React.FC<{ path: string; types: readonly string[] }> = ({ path, types }) => {
  const [type, setType] = useState(types[0]);
  return <>
    <Header title="Website Management" subtitle="Manage everything shown on the public website — existing content and new additions." />
    <nav aria-label="Website management sections" className="mb-6 flex flex-wrap gap-2">
      {websiteSections.map((section) => (
        <Link key={section.path} to={section.path} aria-current={section.path === path ? 'page' : undefined}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${section.path === path ? 'border-[#0a1628] bg-[#0a1628] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>
          {section.label}
        </Link>
      ))}
    </nav>
    {types.length > 1 && <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist">
      {types.map((value) => <button key={value} role="tab" aria-selected={type === value} onClick={() => setType(value)}
        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${type === value ? 'bg-[#0a1628] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{typeLabel(value)}</button>)}
    </div>}
    {typeNotes[type] && <p className="mb-5 max-w-3xl text-sm text-slate-500">{typeNotes[type]}</p>}
    {textGroups[type] ? <TextManager key={type} type={type} /> : contentSchemas[type] ? <RecordManager key={type} type={type} schema={contentSchemas[type]} /> : null}
  </>;
};

/* ------------------------------------------------------------------ Records */

interface Draft { id?: string; title: string; slug: string; slugTouched: boolean; data: Data; json: Record<string, string>; isPublished: boolean }

const newDraft = (schema: TypeSchema): Draft => ({
  title: '', slug: '', slugTouched: false, isPublished: true, json: {},
  data: Object.fromEntries(schema.fields.map((field) => [field.key, blankValue(field)]).filter(([, value]) => value !== undefined)),
});

const draftFrom = (item: ContentItem, schema: TypeSchema): Draft => {
  const data = parseData(item);
  const json = Object.fromEntries(schema.fields.filter((field) => field.kind === 'json')
    .map((field) => [field.key, data[field.key] === undefined ? '' : JSON.stringify(data[field.key], null, 2)]));
  return { id: item.id, title: item.title, slug: item.slug, slugTouched: true, data, json, isPublished: Boolean(item.is_published) };
};

/** The English field a Hebrew field is translated from, e.g. `description_he` → `description`. */
const sourceKey = (field: FieldDef) => field.key.replace(/_he$/, '');
const isBlank = (value: unknown) => value === undefined || value === null || (typeof value === 'string' ? !value.trim() : Array.isArray(value) && !value.length);

/**
 * Sets every Hebrew field in `data` from its English field. Only English that changed since the last save (or that has
 * no Hebrew yet) is sent for translation; unchanged text keeps its existing Hebrew. Throws if translation fails, leaving
 * the previous Hebrew in place.
 */
const fillHebrew = async (schema: TypeSchema, data: Data, previous: Data) => {
  const jobs: { field: FieldDef; texts: string[] }[] = [];
  for (const field of schema.fields.filter((entry) => entry.hebrew)) {
    const source = data[sourceKey(field)];
    if (isBlank(source)) {
      if (field.kind === 'list') data[field.key] = [];
      else delete data[field.key];
      continue;
    }
    if (JSON.stringify(source) === JSON.stringify(previous[sourceKey(field)]) && !isBlank(previous[field.key])) {
      data[field.key] = previous[field.key];
      continue;
    }
    jobs.push({ field, texts: Array.isArray(source) ? source.map(String) : [String(source)] });
  }
  if (!jobs.length) return;
  const translated = await translateToHebrew(jobs.flatMap((job) => job.texts));
  let position = 0;
  for (const { field, texts } of jobs) {
    const hebrew = translated.slice(position, position += texts.length).map((text) => text.trim());
    data[field.key] = field.kind === 'list' ? hebrew : hebrew[0];
  }
};

const RecordManager: React.FC<{ type: string; schema: TypeSchema }> = ({ type, schema }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [published, draftLabel, publishAction, unpublishAction] = schema.publishLabels;

  const load = () => api<{ items: ContentItem[] }>(`content?type=${type}`)
    .then((result) => { setItems(result.items); setError(''); })
    .catch((reason: Error) => setError(reason.message))
    .finally(() => setLoading(false));
  useEffect(() => { void load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = items.filter((item) => !query.trim() || `${item.title} ${item.slug}`.toLowerCase().includes(query.trim().toLowerCase()));

  const run = async (action: () => Promise<unknown>) => {
    try { await action(); } catch (reason) { alert(reason instanceof Error ? reason.message : 'Request failed.'); }
    await load();
  };

  const move = (item: ContentItem, direction: -1 | 1) => {
    const index = items.indexOf(item);
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);
    void run(() => api('content/reorder', { method: 'POST', body: JSON.stringify({ contentType: type, ids: reordered.map((entry) => entry.id) }) }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const slug = slugify(draft.slug);
    if (!draft.title.trim() || !slug) { alert(`${schema.titleLabel} and URL slug are required.`); return; }
    if (items.some((item) => item.slug === slug && item.id !== draft.id)) { alert(`Another ${schema.singular} already uses the slug "${slug}".`); return; }
    const data: Data = { ...draft.data };
    for (const field of schema.fields) {
      const value = data[field.key];
      if (field.kind === 'json') {
        const text = draft.json[field.key]?.trim() ?? '';
        if (!text) { delete data[field.key]; continue; }
        try { data[field.key] = JSON.parse(text); } catch { alert(`${field.label} is not valid JSON.`); return; }
      } else if (field.kind === 'list' || field.kind === 'images') {
        data[field.key] = (Array.isArray(value) ? value : []).map((entry) => String(entry).trim()).filter(Boolean);
      } else if (typeof value === 'string') {
        data[field.key] = value.trim();
        if (field.optional && !data[field.key]) delete data[field.key];
      } else if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
        delete data[field.key];
      }
    }
    data.slug = slug;
    data[schema.titleField] = draft.title.trim();
    const existing = items.find((item) => item.id === draft.id);
    const sortOrder = existing?.sort_order ?? items.reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
    setSaving(true);
    try {
      await fillHebrew(schema, data, existing ? parseData(existing) : {});
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Translation failed.';
      if (!window.confirm(`The Hebrew translation could not be made (${message}).\n\nSave the English anyway? Changed text will keep its previous Hebrew wording until you save again.`)) { setSaving(false); return; }
    }
    try {
      await api('content', { method: 'POST', body: JSON.stringify({ id: draft.id, contentType: type, title: draft.title.trim(), slug, data, sortOrder, isPublished: draft.isPublished }) });
      setDraft(null);
      await load();
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Unable to save.');
    } finally { setSaving(false); }
  };

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search {schema.label.toLowerCase()}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-9`} placeholder={`Search ${schema.label.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <span className="text-sm text-slate-500">{items.length} total · {items.filter((item) => item.is_published).length} {published.toLowerCase()}</span>
        <button onClick={() => setDraft(newDraft(schema))} className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b8912e]"><Plus size={16} /> Add {schema.singular}</button>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="space-y-2">
        {visible.map((item) => {
          const data = parseData(item);
          const image = thumbnail(data);
          const index = items.indexOf(item);
          return <div key={item.id} className={`flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm sm:flex-row sm:items-center ${draft?.id === item.id ? 'border-[#c9a84c] ring-2 ring-[#c9a84c]/20' : 'border-slate-200'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff size={18} className="text-slate-300" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium leading-snug text-[#0a1628]">{item.title}</p>
                <p className="truncate text-xs text-slate-500">/{item.slug}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.is_published ? published : draftLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {!query && <>
                <button aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => move(item, -1)} className="rounded-lg bg-slate-100 p-2 text-slate-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button aria-label={`Move ${item.title} down`} disabled={index === items.length - 1} onClick={() => move(item, 1)} className="rounded-lg bg-slate-100 p-2 text-slate-600 disabled:opacity-30"><ArrowDown size={14} /></button>
              </>}
              <button onClick={() => setDraft(draftFrom(item, schema))} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
              <button onClick={() => void run(() => api('content/publish', { method: 'POST', body: JSON.stringify({ id: item.id, published: !item.is_published }) }))}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${item.is_published ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.is_published ? unpublishAction : publishAction}</button>
              <button onClick={() => { if (window.confirm(`Delete "${item.title}"? It will be removed from the website.`)) { if (draft?.id === item.id) setDraft(null); void run(() => api(`content/${item.id}`, { method: 'DELETE' })); } }}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
            </div>
          </div>;
        })}
        {loading && <p className="p-6 text-center text-sm text-slate-400">Loading…</p>}
        {!loading && !visible.length && <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">{query ? 'Nothing matches your search.' : `No ${schema.label.toLowerCase()} yet. Add the first one.`}</div>}
      </div>
    </div>

    {draft ? <form onSubmit={save} className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
      <h2 className="mb-4 font-serif text-xl font-bold text-[#0a1628]">{draft.id ? `Edit ${schema.singular}` : `Add ${schema.singular}`}</h2>
      <div className="space-y-4">
        <FieldShell label={schema.titleLabel}>
          <input className={inputClass} required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: draft.slugTouched ? draft.slug : slugify(event.target.value) })} />
        </FieldShell>
        <FieldShell label="URL slug" help="Lower-case words separated by hyphens. Used in the page address.">
          <input className={inputClass} required value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value, slugTouched: true })} onBlur={() => setDraft({ ...draft, slug: slugify(draft.slug) })} />
        </FieldShell>
        {schema.fields.filter((field) => !field.hebrew).map((field) => <FieldInput key={field.key} field={field}
          value={field.kind === 'json' ? draft.json[field.key] ?? '' : draft.data[field.key]}
          onChange={(value) => setDraft(field.kind === 'json' ? { ...draft, json: { ...draft.json, [field.key]: String(value) } } : { ...draft, data: { ...draft.data, [field.key]: value } })} />)}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} /> {published} on the website</label>
        {schema.fields.some((field) => field.hebrew) && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Write in English only. The Hebrew website is translated automatically when you save.</p>}
        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <button disabled={saving} className="flex-1 rounded-lg bg-[#c9a84c] px-4 py-3 font-semibold text-white hover:bg-[#b8912e] disabled:opacity-60">{saving ? 'Translating & saving…' : draft.id ? 'Save changes' : `Add ${schema.singular}`}</button>
          <button type="button" onClick={() => setDraft(null)} className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
        </div>
      </div>
    </form> : <div className="hidden h-fit rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 xl:block">Select <b>Edit</b> on any {schema.singular}, or <b>Add {schema.singular}</b> to create a new one.</div>}
  </div>;
};

const FieldShell: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({ label, help, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
    {help && <span className="mt-1 block text-xs text-slate-400">{help}</span>}
  </label>
);

const Preview: React.FC<{ url: string; className?: string }> = ({ url, className = 'h-32 w-full' }) =>
  url.trim() ? <img src={url} alt="" loading="lazy" className={`${className} rounded-lg bg-slate-100 object-cover`} onError={(event) => { event.currentTarget.style.opacity = '0.2'; }} /> : null;

const FieldInput: React.FC<{ field: FieldDef; value: unknown; onChange: (value: unknown) => void }> = ({ field, value, onChange }) => {
  const dir = field.hebrew ? 'rtl' : undefined;
  const text = typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
  switch (field.kind) {
    case 'checkbox':
      return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {field.label}</label>;
    case 'number':
      return <FieldShell label={field.label} help={field.help}><input className={inputClass} type="number" step="any" value={typeof value === 'number' ? value : ''}
        onChange={(event) => onChange(event.target.value === '' ? (field.optional ? undefined : 0) : Number(event.target.value))} /></FieldShell>;
    case 'select':
      return <FieldShell label={field.label} help={field.help}><select className={inputClass} value={text} onChange={(event) => onChange(event.target.value)}>
        {!field.options?.includes(text) && <option value={text}>{text || '— none —'}</option>}
        {field.options?.map((option) => <option key={option} value={option}>{option || '— none —'}</option>)}
      </select></FieldShell>;
    case 'textarea':
      return <FieldShell label={field.label} help={field.help}><textarea dir={dir} className={`${inputClass} min-h-28`} value={text} onChange={(event) => onChange(event.target.value)} /></FieldShell>;
    case 'list': {
      const lines = Array.isArray(value) ? value.map(String) : [];
      return <FieldShell label={field.label} help={field.help ?? 'One item per line.'}><textarea dir={dir} className={`${inputClass} min-h-28`} value={lines.join('\n')} onChange={(event) => onChange(event.target.value.split('\n'))} /></FieldShell>;
    }
    case 'image':
      return <FieldShell label={field.label} help={field.help ?? 'Paste an image URL (https://…) or a site path such as /logo.png.'}>
        <input className={inputClass} value={text} placeholder="https://" onChange={(event) => onChange(event.target.value)} />
        <span className="mt-2 block"><Preview url={text} /></span>
      </FieldShell>;
    case 'images': {
      const urls = Array.isArray(value) ? value.map(String) : [];
      return <FieldShell label={field.label} help={field.help ?? 'One image URL per line.'}>
        <textarea className={`${inputClass} min-h-24 font-mono text-xs`} value={urls.join('\n')} onChange={(event) => onChange(event.target.value.split('\n'))} />
        <span className="mt-2 grid grid-cols-4 gap-2">{urls.filter((url) => url.trim()).map((url, index) => <Preview key={`${url}-${index}`} url={url} className="h-14 w-full" />)}</span>
      </FieldShell>;
    }
    case 'json':
      return <FieldShell label={field.label} help={field.help}><textarea className={`${inputClass} min-h-32 font-mono text-xs`} value={text} onChange={(event) => onChange(event.target.value)} /></FieldShell>;
    default:
      return <FieldShell label={field.label} help={field.help}><input dir={dir} className={inputClass} value={text} onChange={(event) => onChange(event.target.value)} /></FieldShell>;
  }
};

/* ------------------------------------------------------------------ Page text & translations */

const keyLabel = (key: string) => key.split('.').slice(1)
  .map((part) => /^\d+$/.test(part) ? `#${Number(part) + 1}` : part.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()))
  .join(' › ') || key;

const changeCount = (record?: ContentItem) => {
  if (!record) return 0;
  const data = parseData(record) as TextOverrides;
  // A changed English line and its translated Hebrew count as one change.
  return new Set([...Object.keys(data.en ?? {}), ...Object.keys(data.he ?? {})]).size + Object.keys(data.images ?? {}).length;
};

const TextManager: React.FC<{ type: string }> = ({ type }) => {
  const groups = textGroups[type];
  const [records, setRecords] = useState<ContentItem[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<TextGroup | null>(null);
  const load = () => api<{ items: ContentItem[] }>(`content?type=${type}`).then((result) => { setRecords(result.items); setError(''); }).catch((reason: Error) => setError(reason.message));
  useEffect(() => { void load(); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  const recordFor = (group: TextGroup) => records.find((record) => record.slug === group.slug);

  const reset = async (group: TextGroup) => {
    const record = recordFor(group);
    if (!record || !window.confirm(`Restore the original text and images of "${group.title}"? Your changes to it will be removed.`)) return;
    try { await api(`content/${record.id}`, { method: 'DELETE' }); } catch (reason) { alert(reason instanceof Error ? reason.message : 'Unable to reset.'); }
    setOpen(null);
    await load();
  };

  if (open) return <TextEditor key={open.slug} type={type} group={open} record={recordFor(open)} onClose={() => setOpen(null)} onSaved={async () => { await load(); setOpen(null); }} onReset={() => void reset(open)} />;

  return <div className="space-y-2">
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {groups.map((group) => {
      const record = recordFor(group);
      const changes = changeCount(record);
      const keys = Object.keys(originalText(group, 'en')).length;
      const images = Object.keys(originalImages(group)).length;
      return <div key={group.slug} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-[#0a1628]">{group.title}</p>
          <p className="text-xs text-slate-500">{[keys && `${keys} text items`, images && `${images} images`].filter(Boolean).join(' · ')}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${changes ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{changes ? `Customised · ${changes} change${changes === 1 ? '' : 's'}` : 'Original'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpen(group)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Edit</button>
          {changes > 0 && <button onClick={() => void reset(group)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><RotateCcw size={12} /> Reset</button>}
        </div>
      </div>;
    })}
  </div>;
};

const TextEditor: React.FC<{ type: string; group: TextGroup; record?: ContentItem; onClose: () => void; onSaved: () => Promise<void>; onReset: () => void }> = ({ type, group, record, onClose, onSaved, onReset }) => {
  const originals = useMemo(() => ({ en: originalText(group, 'en'), he: originalText(group, 'he') }), [group]);
  const imageDefaults = useMemo(() => originalImages(group), [group]);
  const saved = useMemo(() => (record ? parseData(record) : {}) as TextOverrides, [record]);
  const savedEn = useMemo(() => ({ ...originals.en, ...saved.en }), [originals, saved]);
  const [en, setEn] = useState<FlatText>(savedEn);
  const [images, setImages] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(imageDefaults).map(([key, image]) => [key, saved.images?.[key] ?? image.url])));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const keys = useMemo(() => [...new Set([...Object.keys(originals.en), ...Object.keys(originals.he)])], [originals]);
  const needle = query.trim().toLowerCase();
  const shown = keys.filter((key) => !needle || [key, en[key]].some((value) => value?.toLowerCase().includes(needle)));

  const diff = (values: FlatText, original: FlatText) => Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== (original[key] ?? '')));

  /**
   * The Hebrew overrides to save. English unchanged since the last save keeps its saved Hebrew; English that differs from
   * the original is translated; English back at the original uses the original Hebrew (no override).
   */
  const hebrewFor = async (): Promise<FlatText> => {
    const he: FlatText = {};
    const toTranslate: string[] = [];
    for (const key of keys) {
      const text = en[key] ?? '';
      if (text === (savedEn[key] ?? '') && saved.he?.[key] !== undefined) he[key] = saved.he[key];
      else if (text !== (originals.en[key] ?? '')) toTranslate.push(key);
    }
    if (toTranslate.length) {
      try {
        const translated = await translateToHebrew(toTranslate.map((key) => en[key] ?? ''));
        toTranslate.forEach((key, index) => { he[key] = translated[index]; });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Translation failed.';
        if (!window.confirm(`The Hebrew translation could not be made (${message}).\n\nSave the English anyway? Changed text will keep its previous Hebrew wording until you save again.`)) throw new Error('cancelled');
        toTranslate.forEach((key) => { if (saved.he?.[key] !== undefined) he[key] = saved.he[key]; });
      }
    }
    return diff(he, originals.he);
  };

  const save = async () => {
    setSaving(true);
    let he: FlatText;
    try { he = await hebrewFor(); } catch { setSaving(false); return; }
    const data: TextOverrides = {
      en: diff(en, originals.en),
      he,
      images: Object.fromEntries(Object.entries(images).map(([key, url]) => [key, url.trim()]).filter(([key, url]) => url && url !== imageDefaults[key]?.url)),
    };
    const changes = Object.keys(data.en ?? {}).length + Object.keys(data.he ?? {}).length + Object.keys(data.images ?? {}).length;
    try {
      if (!changes) { if (record) await api(`content/${record.id}`, { method: 'DELETE' }); }
      else await api('content', { method: 'POST', body: JSON.stringify({ id: record?.id, contentType: type, slug: group.slug, title: group.title, data, sortOrder: 0, isPublished: true }) });
      await onSaved();
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Unable to save.');
    } finally { setSaving(false); }
  };

  const rows = (text: string) => Math.min(6, Math.max(1, Math.ceil(text.length / 55)));

  return <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-t-xl border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
      <button onClick={onClose} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"><ArrowLeft size={14} /> Back</button>
      <h2 className="mr-auto font-serif text-xl font-bold text-[#0a1628]">{group.title}</h2>
      {record && <button onClick={onReset} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><RotateCcw size={12} /> Reset to original</button>}
      <button disabled={saving} onClick={() => void save()} className="rounded-lg bg-[#c9a84c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8912e] disabled:opacity-60">{saving ? 'Translating & saving…' : 'Save changes'}</button>
    </div>
    <div className="space-y-8 p-4 sm:p-6">
      {Object.keys(imageDefaults).length > 0 && <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Images</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(imageDefaults).map(([key, image]) => <div key={key} className="rounded-lg border border-slate-200 p-3">
            <FieldShell label={image.label} help={image.url ? undefined : 'Leave blank to keep the original photo bundled with the website.'}>
              <input className={inputClass} placeholder="https://" value={images[key] ?? ''} onChange={(event) => setImages({ ...images, [key]: event.target.value })} />
            </FieldShell>
            <span className="mt-2 block"><Preview url={images[key] ?? ''} /></span>
            {images[key] !== image.url && <button onClick={() => setImages({ ...images, [key]: image.url })} className="mt-2 text-xs font-semibold text-[#9a7425] hover:underline">Use original image</button>}
          </div>)}
        </div>
      </section>}
      {keys.length > 0 && <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="mr-auto text-sm font-bold uppercase tracking-wide text-slate-500">Text</h3>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search text</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search text…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="divide-y divide-slate-100">
          {shown.map((key) => {
            const changed = (en[key] ?? '') !== (originals.en[key] ?? '');
            return <div key={key} className={`grid gap-2 py-3 md:grid-cols-[200px_1fr] ${changed ? 'bg-amber-50/50' : ''}`}>
              <div className="text-xs">
                <p className="font-semibold text-slate-700">{keyLabel(key)}</p>
                <p className="break-all font-mono text-[10px] text-slate-400">{key}</p>
                {changed && <button onClick={() => setEn({ ...en, [key]: originals.en[key] ?? '' })} className="mt-1 font-semibold text-[#9a7425] hover:underline">Undo change</button>}
              </div>
              <label><span className="sr-only">{keyLabel(key)}</span>
                <textarea rows={rows(en[key] ?? '')} className={`${inputClass} py-2`} value={en[key] ?? ''} onChange={(event) => setEn({ ...en, [key]: event.target.value })} /></label>
            </div>;
          })}
          {!shown.length && <p className="py-6 text-center text-sm text-slate-400">Nothing matches your search.</p>}
        </div>
      </section>}
    </div>
  </div>;
};

export default WebsiteManagement;
