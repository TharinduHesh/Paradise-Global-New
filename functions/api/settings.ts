interface D1Statement { all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; }
interface D1Database { prepare(query: string): D1Statement; }
interface Env { DB: D1Database; }

export const onRequestGet = async (context: { env: Env }) => {
  try {
    const result = await context.env.DB.prepare('SELECT key, value_json FROM site_settings').all<{ key: string; value_json: string }>();
    return Response.json({ settings: Object.fromEntries(result.results.map((row) => [row.key, JSON.parse(row.value_json)])) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to load site settings:', error);
    return Response.json({ error: 'Unable to load site settings.' }, { status: 500 });
  }
};
