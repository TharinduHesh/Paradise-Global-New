import { useEffect, useRef } from 'react';

interface TurnstileApi {
  render(element: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback(token: string): void;
    'expired-callback'(): void;
    'error-callback'(): void;
  }): string;
  remove(id: string): void;
}

const getTurnstile = () => (window as Window & { turnstile?: TurnstileApi }).turnstile;
let scriptLoad: Promise<void> | undefined;

const loadTurnstile = () => {
  if (getTurnstile()) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      scriptLoad = undefined;
      reject(new Error('Unable to load the security check.'));
    };
    document.head.append(script);
  });
  return scriptLoad;
};

interface TurnstileProps {
  siteKey: string;
  onToken(token: string | null): void;
  onError(): void;
}

export const Turnstile = ({ siteKey, onToken, onError }: TurnstileProps) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let widgetId: string | undefined;
    loadTurnstile().then(() => {
      if (!mounted || !container.current) return;
      const api = getTurnstile();
      if (!api) throw new Error('The security check is unavailable.');
      widgetId = api.render(container.current, {
        sitekey: siteKey,
        action: 'contact',
        callback: onToken,
        'expired-callback': () => onToken(null),
        'error-callback': onError,
      });
    }).catch(() => { if (mounted) onError(); });
    return () => {
      mounted = false;
      if (widgetId) getTurnstile()?.remove(widgetId);
    };
  }, [siteKey, onToken, onError]);

  return <div ref={container} />;
};
