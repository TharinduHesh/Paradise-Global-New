export interface ContactEnquiry {
  name: string;
  email: string;
  phone: string;
  service: string;
  propertyLocation: string;
  message: string;
}

export const getContactSiteKey = async (signal: AbortSignal): Promise<string | null> => {
  const response = await fetch('/api/contact', { signal });
  if (!response.ok) throw new Error('Unable to load contact form.');
  const { siteKey } = await response.json() as { siteKey?: string | null };
  return siteKey ?? null;
};

export const saveContactEnquiry = async (enquiry: ContactEnquiry, turnstileToken: string | null): Promise<void> => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...enquiry, turnstileToken }),
  });

  if (!response.ok) {
    let message = 'Unable to send contact enquiry.';

    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the generic error when the API does not return JSON.
    }

    throw new Error(message);
  }
};
