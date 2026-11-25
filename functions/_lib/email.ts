/**
 * Enquiry emails sent through Resend (https://resend.com). Runs server-side only; RESEND_API_KEY is a Cloudflare secret.
 * Every value from the visitor is HTML-escaped, and nothing they type is placed in an email header except the validated
 * reply-to address.
 */

export interface EmailEnv {
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
  FROM_EMAIL?: string;
}

export interface StoredEnquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  service: string;
  propertyLocation: string;
  message: string;
  /** D1 `datetime('now')`, UTC, e.g. "2026-11-25 05:10:00". */
  createdAt: string;
}

const BRAND = { navy: '#0a1628', gold: '#c9a84c', text: '#334155', muted: '#64748b', site: 'https://paradisegloballeisures.com' };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const paragraphs = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>');

/** "25 Nov 2026, 10:40 (Sri Lanka time)", from D1's UTC timestamp. */
export const formatSubmitted = (createdAt: string) => {
  const date = new Date(`${createdAt.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return createdAt;
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }).format(date);
  return `${local} (Sri Lanka time)`;
};

const layout = (heading: string, body: string) => `<!doctype html>
<html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND.navy};padding:24px 28px;border-bottom:3px solid ${BRAND.gold}">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff">Paradise Global Leisures</p>
<p style="margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.gold}">Property · Development · Hospitality</p>
</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND.navy}">${heading}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#faf8f3;font-size:12px;color:${BRAND.muted}">
Paradise Global Leisures · <a href="${BRAND.site}" style="color:#9a7425">paradisegloballeisures.com</a>
</td></tr>
</table></td></tr></table></body></html>`;

const fields = (enquiry: StoredEnquiry): [string, string][] => [
  ['Full Name', enquiry.name],
  ['Email Address', enquiry.email],
  ['Phone / WhatsApp', enquiry.phone || '—'],
  ['Service Required', enquiry.service || '—'],
  ['Property Location of Interest', enquiry.propertyLocation || '—'],
  ['Message', enquiry.message],
  ['Submitted', formatSubmitted(enquiry.createdAt)],
];

export const adminNotification = (enquiry: StoredEnquiry) => ({
  subject: 'New Website Enquiry – Paradise Global Leisures',
  html: layout('New website enquiry', `
<p style="margin:0 0 16px;line-height:1.6">A new enquiry (#${enquiry.id}) was submitted through the website contact form. Reply to this email to answer the customer directly.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
${fields(enquiry).map(([label, value]) => `<tr>
<td style="padding:10px 12px 10px 0;border-top:1px solid #eee;vertical-align:top;width:38%;font-weight:bold;color:${BRAND.navy}">${label}</td>
<td style="padding:10px 0;border-top:1px solid #eee;line-height:1.6">${paragraphs(value)}</td></tr>`).join('')}
</table>`),
  text: [`New website enquiry #${enquiry.id}`, '', ...fields(enquiry).map(([label, value]) => `${label}: ${value}`)].join('\n'),
});

export const customerConfirmation = (enquiry: StoredEnquiry) => ({
  subject: 'We Have Received Your Enquiry – Paradise Global Leisures',
  html: layout(`Thank you, ${escapeHtml(enquiry.name)}`, `
<p style="margin:0 0 14px;line-height:1.7">Thank you for contacting Paradise Global Leisures. We confirm that we have received your enquiry${enquiry.service ? ` about <strong>${escapeHtml(enquiry.service)}</strong>` : ''}.</p>
<p style="margin:0 0 14px;line-height:1.7">A member of our team will review your message and contact you as soon as possible.</p>
<div style="margin:20px 0;padding:14px 16px;background:#faf8f3;border-left:3px solid ${BRAND.gold};font-size:14px;line-height:1.6">
<p style="margin:0 0 6px;font-weight:bold;color:${BRAND.navy}">Your message</p>
<p style="margin:0">${paragraphs(enquiry.message)}</p>
</div>
<p style="margin:0;line-height:1.7">Kind regards,<br><strong style="color:${BRAND.navy}">The Paradise Global Leisures Team</strong></p>`),
  text: [
    `Dear ${enquiry.name},`, '',
    'Thank you for contacting Paradise Global Leisures. We confirm that we have received your enquiry.',
    'A member of our team will review your message and contact you as soon as possible.', '',
    'Your message:', enquiry.message, '',
    'Kind regards,', 'The Paradise Global Leisures Team', BRAND.site,
  ].join('\n'),
});

interface Email { to: string; subject: string; html: string; text: string; replyTo?: string; idempotencyKey: string }

const send = async (env: Required<EmailEnv>, email: Email) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      // Resend ignores a repeat with the same key, so a retried request cannot send the same email twice.
      'Idempotency-Key': email.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL, to: [email.to], subject: email.subject, html: email.html, text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    // Resend's error body names the problem (e.g. an unverified domain) and never echoes the API key.
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
  }
};

/**
 * Sends the admin notification and the customer confirmation. Never throws: the enquiry is already saved, so a failed
 * email is logged (without the API key or the visitor's details) and the result is reported to the caller.
 */
export const sendEnquiryEmails = async (env: EmailEnv, enquiry: StoredEnquiry) => {
  const { RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL } = env;
  if (!RESEND_API_KEY || !ADMIN_EMAIL || !FROM_EMAIL) {
    console.warn(`Enquiry #${enquiry.id} saved, but emails are not configured (missing ${[!RESEND_API_KEY && 'RESEND_API_KEY', !ADMIN_EMAIL && 'ADMIN_EMAIL', !FROM_EMAIL && 'FROM_EMAIL'].filter(Boolean).join(', ')}).`);
    return { admin: false, customer: false };
  }
  const config = { RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL };
  const admin = adminNotification(enquiry);
  const customer = customerConfirmation(enquiry);
  const [adminResult, customerResult] = await Promise.allSettled([
    send(config, { to: ADMIN_EMAIL, ...admin, replyTo: enquiry.email, idempotencyKey: `enquiry-${enquiry.id}-admin` }),
    send(config, { to: enquiry.email, ...customer, replyTo: ADMIN_EMAIL, idempotencyKey: `enquiry-${enquiry.id}-customer` }),
  ]);
  if (adminResult.status === 'rejected') console.error(`Enquiry #${enquiry.id}: admin notification failed:`, String(adminResult.reason));
  if (customerResult.status === 'rejected') console.error(`Enquiry #${enquiry.id}: customer confirmation failed:`, String(customerResult.reason));
  return { admin: adminResult.status === 'fulfilled', customer: customerResult.status === 'fulfilled' };
};
