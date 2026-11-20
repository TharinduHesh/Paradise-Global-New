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
      const maintenance = JSON.parse(row.value_json) as { enabled?: boolean; title?: string; message?: string; reopeningAt?: string };
      if (maintenance.enabled) {
        const title = escapeHtml(maintenance.title?.trim() || "We'll Be Right Back");
        const message = escapeHtml(maintenance.message?.trim() || 'We are making improvements. Please check back soon.');
        const reopenText = maintenance.reopeningAt
          ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(new Date(maintenance.reopeningAt))
          : '';
        const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — Paradise Global Leisures</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,Arial,sans-serif;background:#0a1628;color:#fff}main{min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) 520px}.visual{background:linear-gradient(90deg,rgba(6,14,26,.15),rgba(6,14,26,.35)),url('/sri-lanka-golden-palm-coast.png') center/cover no-repeat}.panel{display:flex;align-items:center;padding:64px;background:rgba(10,22,40,.98)}.content{width:100%;max-width:390px}.mark{width:92px;height:92px;margin:0 0 28px;object-fit:contain}h1{font-family:Georgia,serif;font-size:clamp(38px,5vw,58px);line-height:1.05;margin:0 0 20px}.gold{width:72px;height:3px;background:#c9a84c;margin:0 0 24px}p{color:rgba(255,255,255,.72);font-size:17px;line-height:1.75;margin:0}.reopen{margin-top:28px;border-top:1px solid rgba(255,255,255,.12);padding-top:22px;font-size:14px}.reopen strong{display:block;color:#e8b33f;margin-top:6px;font-size:16px}@media(max-width:800px){main{grid-template-columns:1fr}.visual{position:absolute;inset:0;opacity:.45}.panel{position:relative;background:rgba(6,14,26,.82);padding:32px}.content{margin:auto}.mark{width:76px;height:76px}}
  </style>
</head>
<body>
  <main>
    <div class="visual"></div>
    <section class="panel">
      <div class="content">
        <img class="mark" src="/logo.png?v=gold" alt="Paradise Global Leisures" />
        <h1>${title}</h1>
        <div class="gold"></div>
        <p>${message}</p>
        ${reopenText ? `<div class="reopen">Expected reopening<strong>${escapeHtml(reopenText)}</strong></div>` : ''}
      </div>
    </section>
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
