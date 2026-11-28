import { validateTurnstile } from '../_lib/turnstile';
import { sendEnquiryEmails, type EmailEnv } from '../_lib/email';
import { mergeCompany } from '../../src/lib/companyInfo';
import { EMAIL, multiLine, singleLine } from '../_lib/sanitize';

interface ContactEnquiry {
  name: string;
  email: string;
  phone: string;
  service: string;
  propertyLocation: string;
  message: string;
}

interface D1Database {
  prepare(query: string): {
    bind(...values: string[]): { first<T = Record<string, unknown>>(): Promise<T | null> };
  };
}

interface Env extends EmailEnv {
  DB: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const requiredFields = ['name', 'email', 'message'] as const;
const fieldLimits = { name: 150, email: 254, phone: 50, service: 120, propertyLocation: 120, message: 4000 } as const;

export const onRequestGet = ({ env }: { env: Env }) =>
  Response.json({ siteKey: env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY ?? null : null });


export const onRequestPost = async (context: {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}) => {
  if (Number(context.request.headers.get('Content-Length')) > 32768) {
    return Response.json({ error: 'Enquiry is too large.' }, { status: 413 });
  }
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const enquiry = body as Partial<Record<keyof ContactEnquiry | 'turnstileToken', unknown>>;
  const missingField = requiredFields.find((field) => {
    const value = enquiry[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingField) {
    return Response.json({ error: `The ${missingField} field is required.` }, { status: 400 });
  }

  const optionalFields = {
    phone: enquiry.phone,
    service: enquiry.service,
    propertyLocation: enquiry.propertyLocation,
  };
  const invalidField = Object.entries(optionalFields).find(
    ([, value]) => value !== undefined && typeof value !== 'string',
  );

  if (invalidField) {
    return Response.json({ error: `The ${invalidField[0]} field must be text.` }, { status: 400 });
  }

  for (const field of Object.keys(fieldLimits) as (keyof ContactEnquiry)[]) {
    const value = enquiry[field];
    if (typeof value === 'string' && value.length > fieldLimits[field]) {
      return Response.json({ error: `The ${field} field is too long.` }, { status: 400 });
    }
  }

  const raw = enquiry as ContactEnquiry;
  const clean = {
    name: singleLine(raw.name),
    email: raw.email.trim(),
    phone: singleLine(raw.phone ?? ''),
    service: singleLine(raw.service ?? ''),
    propertyLocation: singleLine(raw.propertyLocation ?? ''),
    message: multiLine(raw.message),
  };

  if (!clean.name || !clean.message) {
    return Response.json({ error: `The ${clean.name ? 'message' : 'name'} field is required.` }, { status: 400 });
  }
  if (!EMAIL.test(clean.email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  let stored: { id: number; created_at: string } | null;
  try {
    const secret = context.env.TURNSTILE_SECRET_KEY;
    if (secret && !await validateTurnstile(context.request, secret, enquiry.turnstileToken, 'contact')) {
      return Response.json({ error: 'Complete the security check and try again.' }, { status: 403 });
    }
    // A double click or resubmission of the same enquiry within 10 minutes is accepted without saving or emailing again.
    const duplicate = await context.env.DB
      .prepare(`SELECT id FROM contact_enquiries WHERE email = ? AND message = ? AND created_at > datetime('now', '-10 minutes') LIMIT 1`)
      .bind(clean.email, clean.message)
      .first<{ id: number }>();
    if (duplicate) return Response.json({ ok: true, duplicate: true }, { status: 200 });

    stored = await context.env.DB
      .prepare(`
        INSERT INTO contact_enquiries
          (name, email, phone, service, property_location, message, status, source)
        VALUES (?, ?, ?, ?, ?, ?, 'new', 'website')
        RETURNING id, created_at
      `)
      .bind(clean.name, clean.email, clean.phone, clean.service, clean.propertyLocation, clean.message)
      .first<{ id: number; created_at: string }>();
    if (!stored) throw new Error('The database did not return the saved enquiry.');
  } catch (error) {
    console.error('Unable to save contact enquiry:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to save contact enquiry.' }, { status: 500 });
  }

  // The enquiry is safely stored; the emails are sent after the response so a slow or failed email never affects the visitor.
  const enquiryRecord = { ...clean, id: stored.id, createdAt: stored.created_at };
  const emails = context.env.DB
    .prepare(`SELECT value_json FROM site_settings WHERE key = ?`)
    .bind('company')
    .first<{ value_json: string }>()
    // The business details in Settings fill the email footer; the defaults are used if they cannot be read.
    .then((row) => mergeCompany(row ? JSON.parse(row.value_json) : null))
    .catch(() => mergeCompany(null))
    .then((company) => sendEnquiryEmails(context.env, enquiryRecord, company));
  if (context.waitUntil) context.waitUntil(emails);
  else await emails;

  return Response.json({ ok: true }, { status: 201 });
};
