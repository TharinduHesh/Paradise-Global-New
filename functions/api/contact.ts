import { validateTurnstile } from '../_lib/turnstile';

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
    bind(...values: string[]): { run(): Promise<unknown> };
  };
}

interface Env {
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

  const { name, email, phone = '', service = '', propertyLocation = '', message } =
    enquiry as ContactEnquiry;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    const secret = context.env.TURNSTILE_SECRET_KEY;
    if (secret && !await validateTurnstile(context.request, secret, enquiry.turnstileToken, 'contact')) {
      return Response.json({ error: 'Complete the security check and try again.' }, { status: 403 });
    }
    await context.env.DB
      .prepare(`
        INSERT INTO contact_enquiries
          (name, email, phone, service, property_location, message, status, source)
        VALUES (?, ?, ?, ?, ?, ?, 'new', 'website')
      `)
      .bind(
        name.trim(),
        email.trim(),
        phone.trim(),
        service.trim(),
        propertyLocation.trim(),
        message.trim(),
      )
      .run();

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Unable to save contact enquiry:', error);
    return Response.json({ error: 'Unable to save contact enquiry.' }, { status: 500 });
  }
};
