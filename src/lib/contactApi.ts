export interface ContactEnquiry {
  name: string;
  email: string;
  phone: string;
  service: string;
  propertyLocation: string;
  message: string;
}

export const saveContactEnquiry = async (enquiry: ContactEnquiry): Promise<void> => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enquiry),
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
