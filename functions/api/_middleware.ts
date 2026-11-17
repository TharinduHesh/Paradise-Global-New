interface ApiContext {
  request: Request;
  next(): Promise<Response>;
}

export const onRequest = async ({ request, next }: ApiContext) => {
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const origin = request.headers.get('Origin');
  const fromAnotherSite = request.headers.get('Sec-Fetch-Site') === 'cross-site'
    || (origin !== null && origin !== new URL(request.url).origin);
  const response = isWrite && fromAnotherSite
    ? Response.json({ error: 'Cross-origin writes are not allowed.' }, { status: 403 })
    : await next();

  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
