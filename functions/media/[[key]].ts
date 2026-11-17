interface R2Object { body: ReadableStream; httpMetadata?: { contentType?: string }; etag?: string; }
interface R2Bucket { get(key: string): Promise<R2Object | null>; }
interface Env { MEDIA?: R2Bucket; }

export const onRequestGet = async (context: { params: { key?: string }; env: Env }) => {
  if (!context.env.MEDIA || !context.params.key) return new Response('Media is not configured.', { status: 503 });
  const object = await context.env.MEDIA.get(context.params.key);
  if (!object) return new Response('Not found.', { status: 404 });
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
};
