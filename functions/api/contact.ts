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

const requiredFields: (keyof ContactEnquiry)[] = [
  'name',
  'email',
  'phone',
  'service',
  'propertyLocation',
  'message',
];

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  let enquiry: Partial<ContactEnquiry>;

  try {
    enquiry = await context.request.json() as Partial<ContactEnquiry>;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const missingField = requiredFields.find((field) => {
    const value = enquiry[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingField) {
    return Response.json({ error: `The ${missingField} field is required.` }, { status: 400 });
  }

  try {
    await context.env.DB
      .prepare(`
        INSERT INTO contact_enquiries
          (name, email, phone, service, property_location, message, status, source)
        VALUES (?, ?, ?, ?, ?, ?, 'new', 'website')
      `)
      .bind(
        enquiry.name!.trim(),
        enquiry.email!.trim(),
        enquiry.phone!.trim(),
        enquiry.service!.trim(),
        enquiry.propertyLocation!.trim(),
        enquiry.message!.trim(),
      )
      .run();

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Unable to save contact enquiry:', error);
    return Response.json({ error: 'Unable to save contact enquiry.' }, { status: 500 });
  }
};
