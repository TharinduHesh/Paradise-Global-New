import { api } from './adminUi';

// Must stay within MAX_TEXTS in functions/_lib/translate.ts.
const BATCH = 25;

/** Leading Markdown such as "## ", "- " or "3. " and surrounding spaces are kept as written; only the words are translated. */
const LINE = /^(\s*(?:#{1,6}\s+|[-*•]\s+|\d+[.)]\s+)?)(.*?)(\s*)$/;

/** Translates English texts to Hebrew through /api/admin/translate, line by line, returning them in the same order. */
export const translateToHebrew = async (texts: string[]): Promise<string[]> => {
  const lines = texts.map((text) => text.split('\n').map((line) => LINE.exec(line) ?? ['', '', line, '']));
  const unique = [...new Set(lines.flat().map((match) => match[2]).filter((words) => words.trim()))];
  const translated = new Map<string, string>();
  for (let start = 0; start < unique.length; start += BATCH) {
    const batch = unique.slice(start, start + BATCH);
    const { translations } = await api<{ translations: string[] }>('translate', { method: 'POST', body: JSON.stringify({ texts: batch }) });
    batch.forEach((words, index) => translated.set(words, translations[index] ?? ''));
  }
  return lines.map((text) => text.map(([, prefix, words, suffix]) => `${prefix}${words.trim() ? translated.get(words) ?? '' : words}${suffix}`).join('\n'));
};
