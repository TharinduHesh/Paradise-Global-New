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
}

const requiredFields = ['name', 'email', 'message'] as const;

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  let body: unknown;

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const enquiry = body as Partial<Record<keyof ContactEnquiry, unknown>>;
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

  const { name, email, phone = '', service = '', propertyLocation = '', message } =
    enquiry as ContactEnquiry;

  try {
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
