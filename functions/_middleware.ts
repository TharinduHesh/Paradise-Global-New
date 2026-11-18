interface MaintenanceEnv {
  DB: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        first<T = Record<string, unknown>>(): Promise<T | null>;
      };
      first<T = Record<string, unknown>>(): Promise<T | null>;
    };
  };
}

interface MaintenanceContext {
  request: Request;
  env: MaintenanceEnv;
  next(): Promise<Response>;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export const onRequest = async ({ request, env, next }: MaintenanceContext) => {
  const url = new URL(request.url);

  if (
    request.method !== 'GET'
    || url.pathname === '/admin'
    || url.pathname.startsWith('/admin/')
    || url.pathname.startsWith('/api/')
    || !request.headers.get('accept')?.includes('text/html')
  ) {
    return next();
  }

  try {
    const row = await env.DB
      .prepare(`SELECT value_json FROM site_settings WHERE key = 'maintenance'`)
      .first<{ value_json: string }>();

    if (row) {
      const maintenance = JSON.parse(row.value_json) as { enabled?: boolean; message?: string };
      if (maintenance.enabled) {
        const message = escapeHtml(maintenance.message?.trim() || 'We are making improvements. Please check back soon.');
        const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — Paradise Global Leisures</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,Arial,sans-serif;background:#0a1628;color:#fff;display:grid;place-items:center;padding:24px}main{max-width:620px;text-align:center}.mark{width:64px;height:64px;margin:0 auto 24px;border-radius:16px;background:#c9a84c;display:grid;place-items:center;font:700 36px Georgia,serif}h1{font-family:Georgia,serif;font-size:clamp(32px,6vw,52px);margin:0 0 16px}p{color:rgba(255,255,255,.75);font-size:18px;line-height:1.7;margin:0}.gold{width:64px;height:2px;background:#c9a84c;margin:24px auto}
  </style>
</head>
<body>
  <main>
    <div class="mark">P</div>
    <h1>We'll Be Right Back</h1>
    <div class="gold"></div>
    <p>${message}</p>
  </main>
</body>
</html>`;
        return new Response(html, {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Retry-After': '3600',
          },
        });
      }
    }
  } catch (error) {
    console.error('Unable to evaluate maintenance mode:', error);
  }

  return next();
};
