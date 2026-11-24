interface ApiContext {
  request: Request;
  next(): Promise<Response>;
}

const HSTS = 'max-age=31536000';

export const onRequest = async ({ request, next }: ApiContext) => {
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const origin = request.headers.get('Origin');
  const fromAnotherSite = request.headers.get('Sec-Fetch-Site') === 'cross-site'
    || (origin !== null && origin !== new URL(request.url).origin);
  // Writes must be JSON. A cross-site HTML form cannot send JSON, and a script would need a CORS preflight, which this API never grants.
  const isJson = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/json';
  const response = isWrite && fromAnotherSite
    ? Response.json({ error: 'Cross-origin writes are not allowed.' }, { status: 403 })
    : isWrite && !isJson
      ? Response.json({ error: 'Requests must be sent as JSON.' }, { status: 415 })
      : await next();

  const headers = new Headers(response.headers);
  // The API is same-origin only; never let a response be readable from another site.
  for (const name of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods']) headers.delete(name);
  headers.set('Strict-Transport-Security', HSTS);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
