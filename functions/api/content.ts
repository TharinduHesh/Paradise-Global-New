import { importedContentSettingKey } from '../../src/lib/contentKeys';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
interface D1Database { prepare(query: string): D1Statement; }
interface Env { DB: D1Database; }

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const type = new URL(context.request.url).searchParams.get('type') ?? '';
  try {
    const result = await context.env.DB.prepare(
      'SELECT id, content_type, slug, title, data_json, sort_order FROM content_items WHERE is_published = 1 AND (? = "" OR content_type = ?) ORDER BY content_type, sort_order',
    ).bind(type, type).all<{ id: string; content_type: string; slug: string; title: string; data_json: string; sort_order: number }>();
    // Once a type's built-in records are in the catalogue, the catalogue alone decides what the site shows (even if it is empty).
    const setting = await context.env.DB.prepare('SELECT value_json FROM site_settings WHERE key = ?').bind(importedContentSettingKey).first<{ value_json: string }>();
    const managed = Boolean(type) && (setting ? JSON.parse(setting.value_json) as string[] : []).includes(type);
    return Response.json({ items: result.results.map((item) => ({ ...item, data: JSON.parse(item.data_json) })), managed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to load published content:', error);
    return Response.json({ error: 'Unable to load published content.' }, { status: 500 });
  }
};
