/** Verifies a Cloudflare Turnstile token for this hostname and the expected widget action. */
export const validateTurnstile = async (request: Request, secret: string, token: unknown, action: string) => {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Turnstile verification service unavailable.');
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  return result.success === true && result.hostname === new URL(request.url).hostname && result.action === action;
};
