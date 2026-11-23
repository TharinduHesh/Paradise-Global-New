import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LegalSection { title: string; body: string }

const SITE = 'https://paradisegloballeisures.com';
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/** Turns URLs into links; links to this site stay inside the app. */
const withLinks = (text: string) => text.split(URL_PATTERN).map((part, index) => {
  if (!/^https?:\/\//.test(part)) return part;
  if (part.startsWith(SITE)) return <Link key={index} className="text-gold-600 underline break-all" to={part.slice(SITE.length) || '/'}>{part}</Link>;
  return <a key={index} className="text-gold-600 underline break-all" href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
});

/** Renders a section body: blank line = new paragraph, "## " = sub-heading, "- " = bullet, "1. " = numbered item. */
const renderBody = (body: string) => {
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length) {
      const lines = paragraph;
      blocks.push(<p key={blocks.length}>{lines.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{withLinks(line)}</React.Fragment>)}</p>);
      paragraph = [];
    }
    if (list) {
      const { ordered, items } = list;
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(<ListTag key={blocks.length} className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1.5 ps-6 marker:text-gold-500`}>{items.map((item, i) => <li key={i}>{withLinks(item)}</li>)}</ListTag>);
      list = null;
    }
  };

  body.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    if (line.startsWith('## ')) { flush(); blocks.push(<h3 key={blocks.length} className="pt-2 font-semibold text-navy-900">{line.slice(3)}</h3>); return; }
    const bullet = line.match(/^-\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (paragraph.length || (list && list.ordered !== ordered)) flush();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    if (list) flush();
    paragraph.push(line);
  });
  flush();
  return blocks;
};

const LegalDocument: React.FC<{ doc: 'privacy' | 'terms'; titleKey: 'legal.privacyTitle' | 'legal.termsTitle' }> = ({ doc, titleKey }) => {
  const { t, i18n } = useTranslation();
  const raw = t(`legal.${doc}`, { returnObjects: true }) as unknown;
  const sections = Array.isArray(raw) ? (raw as LegalSection[]) : [];
  // The body may only exist in English; keep it left-to-right when shown on the Hebrew site.
  const translated = Boolean(i18n.getResource(i18n.language, 'translation', `legal.${doc}.0.body`));
  const bodyLang = translated ? i18n.language : 'en';

  return <>
    <title>{`${t(titleKey)} — Paradise Global Leisures`}</title>
    <div className="relative bg-navy-900 pb-16 pt-32"><div className="container-custom"><p className="mb-3 text-sm font-medium uppercase tracking-widest text-gold-400">{t('legal.label')}</p><h1 className="font-serif text-4xl font-bold text-white md:text-5xl">{t(titleKey)}</h1><p className="mt-4 text-white/60">{t('legal.effective')}</p></div></div>
    <main className="section-padding bg-beige-50"><article lang={bodyLang} dir={bodyLang === 'he' ? 'rtl' : 'ltr'} className="container-custom max-w-4xl"><div className="space-y-10 rounded-sm bg-white p-6 shadow-card md:p-10">
      {sections.map((section, index) => <section key={index}>
        <h2 className="legal-heading">{section.title}</h2>
        <div className="space-y-4 leading-7 text-navy-600">{renderBody(section.body ?? '')}</div>
      </section>)}
    </div></article></main>
  </>;
};

export default LegalDocument;
