/**
 * Enquiry emails sent through Resend (https://resend.com). Runs server-side only; RESEND_API_KEY is a Cloudflare secret.
 * Every value from the visitor is HTML-escaped, and nothing they type is placed in an email header except the validated
 * reply-to address.
 *
 * Templates are table-based with inline styles (Gmail, Outlook and mobile clients), a small <style> block only for
 * mobile tweaks, VML fallbacks for buttons in Outlook, and a plain-text version of every email.
 */
import { defaultCompany, type CompanyInfo } from '../../src/lib/companyInfo';

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

/* ------------------------------------------------------------------ Design system */

const SITE = 'https://paradisegloballeisures.com';
const LOGO = `${SITE}/email-logo.png`;
const C = {
  navy: '#0a1628', navyDeep: '#071020', gold: '#c9a84c', goldDark: '#9a7425', goldSoft: '#f6efdc',
  ivory: '#f4f0e6', panel: '#faf8f3', line: '#ece6d6', text: '#334155', muted: '#6b7280', white: '#ffffff',
};
const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const paragraphs = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>');

export const reference = (id: number) => `PGL-${String(id).padStart(5, '0')}`;

/** "25 Nov 2026, 10:40 (Sri Lanka time)", from D1's UTC timestamp. */
export const formatSubmitted = (createdAt: string) => {
  const date = new Date(`${createdAt.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return createdAt;
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }).format(date);
  return `${local} (Sri Lanka time)`;
};

const digits = (phone: string) => phone.replace(/[^\d+]/g, '').replace(/^0/, '+94');
const telHref = (phone: string) => `tel:${digits(phone)}`;
const whatsappHref = (phone: string) => `https://wa.me/${digits(phone).replace(/^\+/, '')}`;
const firstPhone = (phone: string) => phone.split(/\s*[/;\n]\s*/)[0]?.trim() ?? phone;

/** A thin gold rule with a small diamond in the middle. */
const ornament = (background: string) => `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
<td width="56" style="border-bottom:1px solid ${C.gold};font-size:0;line-height:0">&nbsp;</td>
<td style="padding:0 10px;color:${C.gold};font-size:10px;line-height:10px;background:${background}">&#9670;</td>
<td width="56" style="border-bottom:1px solid ${C.gold};font-size:0;line-height:0">&nbsp;</td></tr></table>`;

/** A bulletproof button: VML for Outlook on Windows, a styled link everywhere else. */
const button = (href: string, label: string, variant: 'gold' | 'navy' = 'gold') => {
  const bg = variant === 'gold' ? C.gold : C.navy;
  const fg = variant === 'gold' ? C.navy : C.white;
  const safeHref = escapeHtml(href);
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="8%" stroke="f" fillcolor="${bg}"><w:anchorlock/><center style="color:${fg};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;">${escapeHtml(label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${safeHref}" target="_blank" style="display:inline-block;background:${bg};color:${fg};font-family:${SANS};font-size:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:15px 34px;border-radius:4px;mso-hide:all">${escapeHtml(label)}</a><!--<![endif]-->`;
};

const eyebrow = (text: string) => `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${C.goldDark}">${text}</p>`;
const heading = (text: string) => `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:1.3;font-weight:normal;color:${C.navy}">${text}</h1>`;
const para = (html: string, extra = '') => `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.text};${extra}">${html}</p>`;
const sectionTitle = (text: string) => `<p style="margin:0 0 12px;font-family:${SERIF};font-size:18px;color:${C.navy}">${text}</p>`;

/** One label/value row for detail cards. `value` must already be safe HTML. */
const detailRow = (label: string, value: string, first = false) => `<tr>
<td class="stack" valign="top" width="38%" style="padding:15px 12px 12px 0;${first ? '' : `border-top:1px solid ${C.line};`}font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted}">${label}</td>
<td class="stack" valign="top" style="padding:12px 0;${first ? '' : `border-top:1px solid ${C.line};`}font-family:${SANS};font-size:15px;line-height:1.6;color:${C.navy}">${value}</td></tr>`;

const card = (inner: string, background = C.panel, border = C.line) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${background};border:1px solid ${border};border-radius:6px"><tr><td class="card-pad" style="padding:22px 24px">${inner}</td></tr></table>`;

const spacer = (height: number) => `<div style="height:${height}px;line-height:${height}px;font-size:0">&nbsp;</div>`;

const layout = (company: CompanyInfo, preheader: string, body: string) => `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(company.name)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media only screen and (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .card-pad{padding:18px!important}
    .stack{display:block!important;width:100%!important;padding-right:0!important}
    .stack + .stack{border-top:0!important;padding-top:0!important}
    .stack-left{text-align:left!important}
    .tagline{font-size:9px!important;letter-spacing:2px!important}
    h1{font-size:24px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.ivory};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.ivory}">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ivory}" style="background:${C.ivory}"><tr><td align="center" style="padding:28px 10px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${C.white};border-radius:8px;overflow:hidden;box-shadow:0 6px 24px rgba(10,22,40,0.08)">
  <tr><td bgcolor="${C.navy}" align="center" style="background:${C.navy};padding:34px 24px 26px">
    <a href="${SITE}" target="_blank" style="text-decoration:none"><img src="${LOGO}" width="96" height="101" alt="Paradise Global Leisures" style="display:block;margin:0 auto;border:0;outline:none;width:96px;height:auto"></a>
    ${spacer(18)}
    ${ornament(C.navy)}
    <p class="tagline" style="margin:14px 0 0;font-family:${SANS};font-size:10px;letter-spacing:3.5px;text-transform:uppercase;color:${C.gold}">Property &nbsp;·&nbsp; Development &nbsp;·&nbsp; Hospitality</p>
  </td></tr>
  <tr><td bgcolor="${C.gold}" style="background:${C.gold};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td class="px" style="padding:40px 44px 36px">${body}</td></tr>
  <tr><td bgcolor="${C.navy}" align="center" class="px" style="background:${C.navy};padding:30px 44px">
    ${ornament(C.navy)}
    <p style="margin:16px 0 6px;font-family:${SERIF};font-size:16px;letter-spacing:1px;color:${C.white}">${escapeHtml(company.name.toUpperCase())}</p>
    <p style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:1.8;color:#b8c1d1">
      ${escapeHtml(company.address)}<br>
      <a href="${telHref(firstPhone(company.phone))}" style="color:#b8c1d1;text-decoration:none">${escapeHtml(company.phone)}</a> &nbsp;·&nbsp;
      <a href="mailto:${escapeHtml(company.email)}" style="color:#b8c1d1;text-decoration:none">${escapeHtml(company.email)}</a>
    </p>
    <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:1px"><a href="${SITE}" target="_blank" style="color:${C.gold};text-decoration:none">paradisegloballeisures.com</a></p>
  </td></tr>
  <tr><td bgcolor="${C.navyDeep}" align="center" style="background:${C.navyDeep};padding:12px 24px;font-family:${SANS};font-size:11px;color:#7d889c">© ${new Date().getUTCFullYear()} ${escapeHtml(company.name)}. All rights reserved.</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;

/* ------------------------------------------------------------------ Admin notification */

export const adminNotification = (enquiry: StoredEnquiry, company: CompanyInfo = defaultCompany) => {
  const ref = reference(enquiry.id);
  const submitted = formatSubmitted(enquiry.createdAt);
  const name = escapeHtml(enquiry.name);
  const email = escapeHtml(enquiry.email);
  const phone = enquiry.phone ? escapeHtml(enquiry.phone) : '';
  const link = (href: string, text: string) => `<a href="${escapeHtml(href)}" style="color:${C.navy};text-decoration:underline;text-decoration-color:${C.gold}">${text}</a>`;

  const body = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr>
<td bgcolor="${C.goldSoft}" style="background:${C.goldSoft};border:1px solid ${C.gold};border-radius:20px;padding:6px 14px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:2.5px;color:${C.goldDark}">&#9679;&nbsp; NEW ENQUIRY</td>
</tr></table>
${heading(`Enquiry from ${name}`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px"><tr>
<td class="stack" style="font-family:${SANS};font-size:13px;color:${C.muted};padding:0 0 4px">Reference&nbsp; <strong style="color:${C.navy};letter-spacing:1px">${ref}</strong></td>
<td class="stack stack-left" align="right" style="font-family:${SANS};font-size:13px;color:${C.muted};padding:0 0 4px">${escapeHtml(submitted)}</td>
</tr></table>

${card(`
${eyebrow('Service required')}
<p style="margin:0;font-family:${SERIF};font-size:22px;line-height:1.35;color:${C.navy}">${enquiry.service ? escapeHtml(enquiry.service) : 'Not specified'}</p>
${enquiry.propertyLocation ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:14px;color:${C.text}">Property location of interest: <strong style="color:${C.navy}">${escapeHtml(enquiry.propertyLocation)}</strong></p>` : ''}
`, C.goldSoft, '#e6d6a8')}
${spacer(18)}

${card(`
${sectionTitle('Customer contact details')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Full name', `<strong>${name}</strong>`, true)}
${detailRow('Email address', link(`mailto:${enquiry.email}`, email))}
${detailRow('Phone / WhatsApp', phone ? `${link(telHref(enquiry.phone), phone)} &nbsp;<a href="${escapeHtml(whatsappHref(enquiry.phone))}" style="font-size:12px;color:${C.goldDark};text-decoration:none;font-weight:bold">WhatsApp&nbsp;›</a>` : `<span style="color:${C.muted}">Not provided</span>`)}
${detailRow('Property location', enquiry.propertyLocation ? escapeHtml(enquiry.propertyLocation) : `<span style="color:${C.muted}">Not specified</span>`)}
${detailRow('Submitted', escapeHtml(submitted))}
${detailRow('Reference', `<strong style="letter-spacing:1px">${ref}</strong>`)}
</table>`)}
${spacer(26)}

${sectionTitle('Message')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="3" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0">&nbsp;</td>
<td dir="auto" style="padding:4px 0 4px 18px;font-family:${SANS};font-size:15px;line-height:1.75;color:${C.text}">${paragraphs(enquiry.message)}</td>
</tr></table>
${spacer(32)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
${button(`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: Your enquiry ${ref} – Paradise Global Leisures`)}`, `Reply to ${enquiry.name.split(' ')[0]}`)}
${spacer(12)}
${button(`${SITE}/admin/enquiries`, 'Open in Admin', 'navy')}
</td></tr></table>
${spacer(18)}
${para(`Replying to this email also goes straight to ${name}.`, `margin:0;text-align:center;font-size:12px;color:${C.muted}`)}`;

  return {
    subject: 'New Website Enquiry – Paradise Global Leisures',
    html: layout(company, `${enquiry.name} – ${enquiry.service || 'General enquiry'} (${ref})`, body),
    text: [
      `NEW WEBSITE ENQUIRY – ${ref}`, '',
      `Full Name: ${enquiry.name}`,
      `Email Address: ${enquiry.email}`,
      `Phone / WhatsApp: ${enquiry.phone || 'Not provided'}`,
      `Service Required: ${enquiry.service || 'Not specified'}`,
      `Property Location of Interest: ${enquiry.propertyLocation || 'Not specified'}`,
      `Submitted: ${submitted}`, '',
      'Message:', enquiry.message, '',
      `Open in Admin: ${SITE}/admin/enquiries`,
    ].join('\n'),
  };
};

/* ------------------------------------------------------------------ Customer confirmation */

export const customerConfirmation = (enquiry: StoredEnquiry, company: CompanyInfo = defaultCompany) => {
  const ref = reference(enquiry.id);
  const submitted = formatSubmitted(enquiry.createdAt);
  const firstName = escapeHtml(enquiry.name.split(' ')[0] || enquiry.name);
  const steps: [string, string][] = [
    ['We review your enquiry', 'A member of our team reads your message and the service you are interested in.'],
    ['A specialist contacts you', 'We will be in touch as soon as possible by email, phone or WhatsApp.'],
    ['We plan the next steps together', 'We discuss your requirements and how Paradise Global Leisures can help.'],
  ];

  const body = `
${eyebrow('Enquiry received')}
${heading(`Thank you, ${firstName}`)}
${para('Thank you for contacting <strong style="color:' + C.navy + '">Paradise Global Leisures</strong>. We are pleased to confirm that your enquiry has been received and is now with our team.')}
${spacer(8)}

${card(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="34" height="34" align="center" bgcolor="${C.gold}" style="background:${C.gold};border-radius:17px;font-family:${SANS};font-size:16px;font-weight:bold;line-height:34px;color:${C.navy}">&#10003;</td></tr></table></td>
<td valign="middle" style="font-family:${SERIF};font-size:19px;color:${C.navy}">Your enquiry is confirmed</td>
</tr></table>
${spacer(10)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Reference', `<strong style="letter-spacing:1.5px">${ref}</strong>`, true)}
${enquiry.service ? detailRow('Service', escapeHtml(enquiry.service)) : ''}
${enquiry.propertyLocation ? detailRow('Location', escapeHtml(enquiry.propertyLocation)) : ''}
${detailRow('Received', escapeHtml(submitted))}
</table>
${para('Please quote your reference number if you contact us about this enquiry.', `margin:12px 0 0;font-size:13px;color:${C.muted}`)}
`, C.goldSoft, '#e6d6a8')}
${spacer(30)}

${sectionTitle('What happens next')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${steps.map(([title, text], index) => `<tr>
<td width="46" valign="top" style="padding:0 0 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="30" height="30" align="center" style="border:1px solid ${C.gold};border-radius:15px;font-family:${SERIF};font-size:14px;line-height:30px;color:${C.goldDark}">${index + 1}</td></tr></table></td>
<td valign="top" style="padding:3px 0 18px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text}"><strong style="color:${C.navy}">${title}</strong><br><span style="font-size:14px;color:${C.muted}">${text}</span></td>
</tr>`).join('')}
</table>
${spacer(6)}

${sectionTitle('Your message')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="3" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0">&nbsp;</td>
<td dir="auto" style="padding:4px 0 4px 18px;font-family:${SANS};font-size:14px;line-height:1.75;color:${C.text};font-style:italic">${paragraphs(enquiry.message)}</td>
</tr></table>
${spacer(34)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${button(SITE, 'Explore Our Website')}</td></tr></table>
${spacer(34)}

${card(`
${sectionTitle('Need to reach us sooner?')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Phone', `<a href="${telHref(firstPhone(company.phone))}" style="color:${C.navy};text-decoration:none">${escapeHtml(company.phone)}</a>`, true)}
${detailRow('WhatsApp', `<a href="${escapeHtml(whatsappHref(company.whatsapp))}" style="color:${C.navy};text-decoration:none">${escapeHtml(company.whatsapp)}</a>`)}
${detailRow('Email', `<a href="mailto:${escapeHtml(company.email)}" style="color:${C.navy};text-decoration:none">${escapeHtml(company.email)}</a>`)}
${detailRow('Office hours', escapeHtml(company.hours).replace(/;\s*/g, '<br>'))}
</table>`)}
${spacer(28)}
${para(`Kind regards,<br><span style="font-family:${SERIF};font-size:17px;color:${C.navy}">The Paradise Global Leisures Team</span>`, 'margin:0')}`;

  return {
    subject: 'We Have Received Your Enquiry – Paradise Global Leisures',
    html: layout(company, `Your enquiry ${ref} has been received. Our team will contact you as soon as possible.`, body),
    text: [
      `Dear ${enquiry.name},`, '',
      'Thank you for contacting Paradise Global Leisures. We are pleased to confirm that your enquiry has been received.', '',
      `Reference: ${ref}`,
      ...(enquiry.service ? [`Service: ${enquiry.service}`] : []),
      ...(enquiry.propertyLocation ? [`Location: ${enquiry.propertyLocation}`] : []),
      `Received: ${submitted}`, '',
      'What happens next:',
      ...steps.map(([title, text], index) => `${index + 1}. ${title} – ${text}`), '',
      'Your message:', enquiry.message, '',
      'Need to reach us sooner?',
      `Phone: ${company.phone}`, `WhatsApp: ${company.whatsapp}`, `Email: ${company.email}`, `Office hours: ${company.hours}`, '',
      'Kind regards,', 'The Paradise Global Leisures Team', SITE,
    ].join('\n'),
  };
};

/* ------------------------------------------------------------------ Sending */

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
export const sendEnquiryEmails = async (env: EmailEnv, enquiry: StoredEnquiry, company: CompanyInfo = defaultCompany) => {
  const { RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL } = env;
  if (!RESEND_API_KEY || !ADMIN_EMAIL || !FROM_EMAIL) {
    console.warn(`Enquiry #${enquiry.id} saved, but emails are not configured (missing ${[!RESEND_API_KEY && 'RESEND_API_KEY', !ADMIN_EMAIL && 'ADMIN_EMAIL', !FROM_EMAIL && 'FROM_EMAIL'].filter(Boolean).join(', ')}).`);
    return { admin: false, customer: false };
  }
  const config = { RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL };
  const admin = adminNotification(enquiry, company);
  const customer = customerConfirmation(enquiry, company);
  const [adminResult, customerResult] = await Promise.allSettled([
    send(config, { to: ADMIN_EMAIL, ...admin, replyTo: enquiry.email, idempotencyKey: `enquiry-${enquiry.id}-admin` }),
    send(config, { to: enquiry.email, ...customer, replyTo: ADMIN_EMAIL, idempotencyKey: `enquiry-${enquiry.id}-customer` }),
  ]);
  if (adminResult.status === 'rejected') console.error(`Enquiry #${enquiry.id}: admin notification failed:`, String(adminResult.reason));
  if (customerResult.status === 'rejected') console.error(`Enquiry #${enquiry.id}: customer confirmation failed:`, String(customerResult.reason));
  return { admin: adminResult.status === 'fulfilled', customer: customerResult.status === 'fulfilled' };
};

/* ------------------------------------------------------------------ New review notification */

export interface StoredReview {
  id: number;
  name: string;
  email: string;
  country: string;
  /** Display label of the reviewed service. */
  service: string;
  rating: number;
  message: string;
  createdAt: string;
}

export const reviewReference = (id: number) => `REV-${String(id).padStart(5, '0')}`;
const stars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

export const reviewNotification = (review: StoredReview, company: CompanyInfo = defaultCompany) => {
  const ref = reviewReference(review.id);
  const submitted = formatSubmitted(review.createdAt);
  const name = escapeHtml(review.name);
  const body = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr>
<td bgcolor="${C.goldSoft}" style="background:${C.goldSoft};border:1px solid ${C.gold};border-radius:20px;padding:6px 14px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:2.5px;color:${C.goldDark}">&#9679;&nbsp; NEW REVIEW · AWAITING MODERATION</td>
</tr></table>
${heading(`Review from ${name}`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px"><tr>
<td class="stack" style="font-family:${SANS};font-size:13px;color:${C.muted};padding:0 0 4px">Reference&nbsp; <strong style="color:${C.navy};letter-spacing:1px">${ref}</strong></td>
<td class="stack stack-left" align="right" style="font-family:${SANS};font-size:13px;color:${C.muted};padding:0 0 4px">${escapeHtml(submitted)}</td>
</tr></table>

${card(`
${eyebrow('Rating')}
<p style="margin:0;font-family:${SERIF};font-size:26px;letter-spacing:3px;color:${C.gold}">${stars(review.rating)}</p>
<p style="margin:6px 0 0;font-family:${SANS};font-size:14px;color:${C.text}">${review.rating} out of 5 · <strong style="color:${C.navy}">${escapeHtml(review.service)}</strong></p>
`, C.goldSoft, '#e6d6a8')}
${spacer(18)}

${card(`
${sectionTitle('Reviewer')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${detailRow('Name', `<strong>${name}</strong>`, true)}
${detailRow('Email (private)', `<a href="mailto:${escapeHtml(review.email)}" style="color:${C.navy};text-decoration:underline;text-decoration-color:${C.gold}">${escapeHtml(review.email)}</a>`)}
${detailRow('Country', review.country ? escapeHtml(review.country) : `<span style="color:${C.muted}">Not provided</span>`)}
${detailRow('Submitted', escapeHtml(submitted))}
</table>`)}
${spacer(26)}

${sectionTitle('Review')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="3" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0">&nbsp;</td>
<td dir="auto" style="padding:4px 0 4px 18px;font-family:${SANS};font-size:15px;line-height:1.75;color:${C.text}">${paragraphs(review.message)}</td>
</tr></table>
${spacer(32)}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
${button(`${SITE}/admin/reviews`, 'Moderate in Admin', 'navy')}
</td></tr></table>
${spacer(18)}
${para('This review is pending. It will not appear on the website until an admin publishes it.', `margin:0;text-align:center;font-size:12px;color:${C.muted}`)}`;

  return {
    subject: `New ${review.rating}-Star Review Awaiting Moderation – Paradise Global Leisures`,
    html: layout(company, `${review.name} rated ${review.service} ${review.rating}/5 (${ref})`, body),
    text: [
      `NEW CUSTOMER REVIEW – ${ref} (pending moderation)`, '',
      `Rating: ${stars(review.rating)} (${review.rating}/5)`,
      `Service: ${review.service}`,
      `Name: ${review.name}`,
      `Email (private): ${review.email}`,
      `Country: ${review.country || 'Not provided'}`,
      `Submitted: ${submitted}`, '',
      'Review:', review.message, '',
      `Moderate in Admin: ${SITE}/admin/reviews`,
    ].join('\n'),
  };
};

/** Emails the admin about a new pending review. Never throws: the review is already saved. */
export const sendReviewNotification = async (env: EmailEnv, review: StoredReview, company: CompanyInfo = defaultCompany) => {
  const { RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL } = env;
  if (!RESEND_API_KEY || !ADMIN_EMAIL || !FROM_EMAIL) {
    console.warn(`Review #${review.id} saved, but emails are not configured.`);
    return false;
  }
  try {
    await send({ RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL }, {
      to: ADMIN_EMAIL, ...reviewNotification(review, company), replyTo: review.email, idempotencyKey: `review-${review.id}-admin`,
    });
    return true;
  } catch (reason) {
    console.error(`Review #${review.id}: admin notification failed:`, String(reason));
    return false;
  }
};
