/**
 * English → Hebrew translation for Website Management. The admin edits English only; Hebrew is produced here.
 * Uses the Google Cloud Translation API when the GOOGLE_TRANSLATE_API_KEY secret is set, otherwise Cloudflare Workers AI
 * (the `AI` binding in wrangler.toml). The browser sends short pieces of text: one line each, Markdown markers removed.
 */

export const MAX_TEXTS = 25;
export const MAX_TEXT_LENGTH = 2000;

export interface WorkersAi { run(model: string, input: Record<string, unknown>): Promise<unknown> }
export interface TranslateEnv { AI?: WorkersAi; GOOGLE_TRANSLATE_API_KEY?: string }

const PLACEHOLDER = /\{\{[^}]+\}\}/g;

/** i18next placeholders such as {{name}} must reach the website unchanged, so they are swapped for tokens the translator leaves alone. */
const protect = (text: string) => {
  const kept: string[] = [];
  const masked = text.replace(PLACEHOLDER, (match) => `__${kept.push(match) - 1}__`);
  return { masked, restore: (translated: string) => {
    const result = translated.replace(/__\s*(\d+)\s*__/g, (match, index: string) => kept[Number(index)] ?? match).trim();
    if (kept.some((placeholder) => !result.includes(placeholder))) throw new Error(`The translation of "${text}" lost a {{placeholder}}; please rephrase it.`);
    return result;
  } };
};

const viaGoogle = async (texts: string[], key: string) => {
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: 'en', target: 'he', format: 'text' }),
  });
  if (!response.ok) throw new Error(`The translation service responded ${response.status}.`);
  const body = await response.json() as { data?: { translations?: { translatedText?: string }[] } };
  const translations = body.data?.translations?.map((item) => item.translatedText ?? '') ?? [];
  if (translations.length !== texts.length) throw new Error('The translation service returned an unexpected response.');
  return translations;
};

const viaWorkersAi = async (texts: string[], ai: WorkersAi) => {
  const output: string[] = [];
  // A few at a time keeps well inside the per-request limits.
  for (let start = 0; start < texts.length; start += 5) {
    output.push(...await Promise.all(texts.slice(start, start + 5).map(async (text) => {
      const result = await ai.run('@cf/meta/m2m100-1.2b', { text, source_lang: 'en', target_lang: 'he' }) as { translated_text?: unknown };
      if (typeof result?.translated_text !== 'string' || !result.translated_text.trim()) throw new Error('The translation service returned no text.');
      return result.translated_text;
    })));
  }
  return output;
};

/** Translates each text from English to Hebrew, in order. Blank texts stay blank. */
export const translateToHebrew = async (texts: string[], env: TranslateEnv): Promise<string[]> => {
  const jobs = texts.map((text) => (text.trim() ? protect(text) : null));
  const pending = jobs.flatMap((job, index) => (job ? [{ index, masked: job.masked }] : []));
  const output = texts.map(() => '');
  if (!pending.length) return output;
  const masked = pending.map((item) => item.masked);
  let translated: string[];
  if (env.GOOGLE_TRANSLATE_API_KEY) translated = await viaGoogle(masked, env.GOOGLE_TRANSLATE_API_KEY);
  else if (env.AI) translated = await viaWorkersAi(masked, env.AI);
  else throw new Error('Automatic translation is not set up: add the Workers AI binding "AI" or a GOOGLE_TRANSLATE_API_KEY secret.');
  pending.forEach((item, position) => { output[item.index] = jobs[item.index]!.restore(translated[position]); });
  return output;
};
