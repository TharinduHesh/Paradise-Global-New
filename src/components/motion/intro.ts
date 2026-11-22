import { useSyncExternalStore } from 'react';

/**
 * Tracks the branded intro (preloader). The intro plays once per browser session on the first public
 * page view; entrance animations wait for it so they aren't wasted behind the loading screen.
 * While it is pending, <html> has no `data-intro-done` attribute and CSS entrance animations stay paused.
 */
const SESSION_KEY = 'pgl-intro-seen';
const listeners = new Set<() => void>();

const shouldPlayIntro = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/admin')) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return true; // storage blocked: show it, it just won't be remembered
  }
};

export const introPending = shouldPlayIntro();
let done = !introPending;

if (done && typeof document !== 'undefined') document.documentElement.setAttribute('data-intro-done', '');

export const rememberIntroSeen = () => {
  try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* not remembered */ }
};

export const markIntroDone = () => {
  if (done) return;
  done = true;
  document.documentElement.setAttribute('data-intro-done', '');
  listeners.forEach((listener) => listener());
};

export const subscribeIntro = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const isIntroDone = () => done;

/** True once the intro has finished (immediately, when no intro plays). */
export const useIntroDone = () => useSyncExternalStore(subscribeIntro, isIntroDone, () => true);
