import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Section { heading: string; paragraphs: string[] }
interface Part { title: string; intro: string[]; sections: Section[] }

const paragraphsOf = (lines: string[]) => lines.join('\n').split(/\n\s*\n/).map((block) => block.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

/** Parses "# Part title", "## Section heading" and paragraph text into parts and sections. */
export const parseServiceDetails = (text: string): Part[] => {
  const parts: Part[] = [];
  let part: { title: string; intro: string[]; sections: { heading: string; lines: string[] }[] } | null = null;
  const finish = () => {
    if (part) parts.push({ title: part.title, intro: paragraphsOf(part.intro), sections: part.sections.map((section) => ({ heading: section.heading, paragraphs: paragraphsOf(section.lines) })) });
  };
  text.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (/^#\s/.test(trimmed)) { finish(); part = { title: trimmed.slice(2).trim(), intro: [], sections: [] }; return; }
    part ??= { title: '', intro: [], sections: [] };
    if (/^##\s/.test(trimmed)) { part.sections.push({ heading: trimmed.slice(3).trim(), lines: [] }); return; }
    const current = part.sections[part.sections.length - 1];
    (current ? current.lines : part.intro).push(line);
  });
  finish();
  return parts.filter((entry) => entry.title || entry.intro.length || entry.sections.length);
};

/**
 * The detailed sections of a service page. Each part shows its title and introduction, its sections as cards,
 * and its last section (such as "Make a property enquiry") as a call to action.
 */
const ServiceDetails: React.FC<{ text: string; lang?: string }> = ({ text, lang }) => {
  const { t } = useTranslation();
  const parts = parseServiceDetails(text);
  if (!parts.length) return null;

  return <div lang={lang} dir={lang === 'en' ? 'ltr' : undefined}>
    {parts.map((part, partIndex) => {
      const callToAction = part.sections.length > 1 ? part.sections[part.sections.length - 1] : undefined;
      const cards = callToAction ? part.sections.slice(0, -1) : part.sections;
      return <section key={partIndex} className={`section-padding ${partIndex % 2 ? 'bg-beige-50' : 'bg-white'}`}>
        <div className="container-custom">
          {(part.title || part.intro.length > 0) && <div className="max-w-3xl">
            {part.title && <h2 className="font-serif text-3xl font-bold text-navy-900 md:text-4xl">{part.title}</h2>}
            <div className="gold-divider-left mt-5" />
            {part.intro.map((paragraph, index) => <p key={index} className="mt-5 text-lg leading-relaxed text-navy-600">{paragraph}</p>)}
          </div>}
          {cards.length > 0 && <div className={`mt-10 grid gap-6 ${cards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {cards.map((section, index) => <article key={index} className="rounded-sm border border-beige-200 bg-white p-6 shadow-card md:p-8">
              <h3 className="mb-3 font-serif text-xl font-semibold text-navy-900">{section.heading}</h3>
              {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-2 text-sm leading-relaxed text-navy-600">{paragraph}</p>)}
            </article>)}
          </div>}
          {callToAction && <div className="mt-6 flex flex-col gap-6 rounded-sm bg-navy-900 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
            <div className="max-w-2xl">
              <h3 className="mb-2 font-serif text-xl font-semibold text-gold-400">{callToAction.heading}</h3>
              {callToAction.paragraphs.map((paragraph, index) => <p key={index} className="mt-1 text-sm leading-relaxed text-white/70">{paragraph}</p>)}
            </div>
            <Link to="/contact" className="btn-primary shrink-0 justify-center">{t('nav.consultation')} <ArrowRight size={16} /></Link>
          </div>}
        </div>
      </section>;
    })}
  </div>;
};

export default ServiceDetails;
