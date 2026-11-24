import React from 'react';
import { Link } from 'react-router-dom';

// The session's anti-CSRF token, kept in memory only. /api/admin/me provides it after sign-in and on every page load.
let csrfToken = '';

/** An error from the admin API; `code` carries a machine-readable reason such as "password_change_required". */
export class ApiError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

export const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) };
  const response = await fetch(`/api/admin/${path}`, { ...init, credentials: 'include', headers: { ...headers, ...(init?.headers as Record<string, string> | undefined ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (path === 'logout') csrfToken = '';
  if (!response.ok) throw new ApiError(body.error ?? 'Request failed.', body.code);
  if (typeof body.csrfToken === 'string') csrfToken = body.csrfToken;
  return body as T;
};

export const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20';

export const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#b8912e]">Paradise Global Leisures</p><h1 className="font-serif text-3xl font-bold text-[#0a1628]">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><Link to="/" target="_blank" className="text-sm font-medium text-[#9a7425] hover:underline">View website ↗</Link></header>;
