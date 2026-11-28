import { requireUser, type AdminEnv } from './_lib/admin';
import { adminHome, canAccessAdminPage } from '../src/lib/adminAccess';
import { launchPageDocument } from '../src/lib/launchPage';

interface MaintenanceContext {
  request: Request;
  env: AdminEnv;
  next(): Promise<Response>;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export const onRequest = async ({ request, env, next }: MaintenanceContext) => {
  const url = new URL(request.url);
  const adminPath = url.pathname.replace(/\/+$/, '').toLowerCase();
  if ((adminPath === '/admin' || adminPath.startsWith('/admin/')) &&
      ['GET', 'HEAD'].includes(request.method) && adminPath !== '/admin/login') {
    try {
      const user = await requireUser({ request, env });
      if (!user || (user.role !== 'owner' && user.role !== 'admin' && adminPath === '/admin')) {
        return new Response(null, {
          status: 302,
          headers: { 'Strict-Transport-Security': 'max-age=31536000', Location: user ? adminHome(user) : '/admin/login', 'Cache-Control': 'no-store' },
        });
      }
      if (!canAccessAdminPage(user, adminPath)) {
        return new Response('You do not have permission to open this admin page.', {
          status: 403, headers: { 'Strict-Transport-Security': 'max-age=31536000', 'Cache-Control': 'no-store' },
        });
      }
      const response = await next();
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('Strict-Transport-Security', 'max-age=31536000');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch {
      return new Response('Admin access is temporarily unavailable.', { status: 503 });
    }
  }

  if (
    request.method !== 'GET'
    || url.pathname === '/admin'
    || url.pathname.startsWith('/admin/')
    || url.pathname.startsWith('/api/')
    // The email moderation page must keep working while the public site is in maintenance mode.
    || url.pathname === '/review-moderation'
    || !request.headers.get('accept')?.includes('text/html')
  ) {
    return next();
  }

  try {
    const [maintenanceRow, companyRow] = await Promise.all([
      env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'maintenance'`).first<{ value_json: string }>(),
      env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'company'`).first<{ value_json: string }>(),
    ]);

    if (maintenanceRow) {
      const maintenance = JSON.parse(maintenanceRow.value_json) as { enabled?: boolean; design?: string; title?: string; message?: string; reopeningAt?: string };
      if (maintenance.enabled && maintenance.design === 'launch') {
        const company = companyRow ? JSON.parse(companyRow.value_json) as { email?: string; whatsapp?: string; facebook?: string; instagram?: string } : {};
        return new Response(launchPageDocument({ launchDate: maintenance.reopeningAt, ...company }), {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '3600', 'Strict-Transport-Security': 'max-age=31536000' },
        });
      }
      if (maintenance.enabled) {
        const company = companyRow ? JSON.parse(companyRow.value_json) as { email?: string; phone?: string; whatsapp?: string } : {};
        const message = escapeHtml(maintenance.message?.trim() || 'We are making improvements. Please check back soon.');
        const reopenText = maintenance.reopeningAt
          ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(new Date(maintenance.reopeningAt))
          : '';
        const companyEmail = company.email || 'info@paradisegloballeisures.com';
        const companyPhone = company.phone || company.whatsapp || '075 166 8705';
        const companyPhones = companyPhone.split(/\s*[/;\n]\s*/).map((entry) => entry.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const telNumber = (entry: string) => entry.replace(/[^\d+]/g, '').replace(/^0/, '+94');
        const companyWhatsapp = company.whatsapp || company.phone || '075 166 8705';
        const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — Paradise Global Leisures</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',Arial,sans-serif;min-height:100vh;background:linear-gradient(135deg,#fdf6ec 0%,#fef9f4 30%,#f8f9fb 65%,#f1f4f8 100%);color:#0a1628}
    /* Header */
    .hdr{border-bottom:1px solid rgba(203,213,225,.5);background:rgba(255,255,255,.75);backdrop-filter:blur(8px);padding:16px 24px}
    .hdr-inner{max-width:1152px;margin:0 auto;display:flex;align-items:center;gap:12px}
    .logo{width:48px;height:48px;object-fit:contain}
    .brand-name{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#0a1628}
    .brand-gold{color:#c9a84c}
    .brand-sub{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#94a3b8;display:block}
    /* Layout */
    .wrap{max-width:1152px;margin:0 auto;padding:64px 24px;display:grid;grid-template-columns:1fr 460px;gap:40px;align-items:center}
    /* Left */
    .badge{display:inline-flex;align-items:center;gap:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:6px 16px;margin-bottom:24px}
    .dot{width:8px;height:8px;border-radius:50%;background:#c9a84c;animation:pulse 1.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .badge-label{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#9a7425}
    h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(32px,4.5vw,52px);font-weight:700;line-height:1.1;color:#0a1628;margin-bottom:20px}
    .desc{font-size:15px;line-height:1.75;color:#64748b;max-width:520px;margin-bottom:28px}
    /* Back online */
    .reopen-box{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.85);border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;font-size:13px;color:#475569;margin-bottom:32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .clock{font-size:15px;color:#c9a84c}
    .reopen-box strong{color:#0a1628}
    /* Buttons */
    .btns{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:28px}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;background:#c9a84c;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;box-shadow:0 6px 20px rgba(201,168,76,.3);transition:background .2s}
    .btn-primary:hover{background:#b8912e}
    .btn-secondary{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#374151;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
    /* Auto-check */
    .notice{display:flex;align-items:flex-start;gap:12px;background:rgba(239,246,255,.8);border:1px solid #bfdbfe;border-radius:12px;padding:12px 16px;font-size:13px;color:#1e40af;line-height:1.6}
    /* Card */
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(10,22,40,.08)}
    .card-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
    .card-label{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
    .card-title{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:700;color:#0a1628}
    .card-icon{width:44px;height:44px;background:#c9a84c;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(201,168,76,.35);flex-shrink:0}
    .card-icon svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .divider{height:1px;background:#f1f5f9;margin:0 0 20px}
    /* Status items */
    .items{display:flex;flex-direction:column;gap:20px;margin-bottom:24px}
    .item{display:flex;gap:16px}
    .item-icon{width:36px;height:36px;background:#fff7ed;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .item-icon svg{width:16px;height:16px;stroke:#c9a84c;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .item-title{font-size:13px;font-weight:600;color:#0a1628;margin-bottom:3px}
    .item-desc{font-size:12px;color:#64748b;line-height:1.6}
    /* Contact row */
    .contacts{display:flex;flex-direction:column;gap:8px;padding-top:20px;border-top:1px solid #f1f5f9}
    .contact-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f8fafc;border-radius:10px;padding:10px 14px}
    .contact-label{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;white-space:nowrap;flex-shrink:0}
    .contact-link{font-size:13px;font-weight:500;color:#0a1628;text-decoration:none;display:flex;align-items:center;gap:6px}
    .contact-link svg{width:13px;height:13px;stroke:#94a3b8;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .contact-link:hover{color:#c9a84c}
    .contact-phones{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
    /* Responsive */
    @media(max-width:900px){
      .wrap{grid-template-columns:1fr;padding:40px 20px}
      .card{margin-top:0}
    }
  </style>
</head>
<body>
  <header class="hdr">
    <div class="hdr-inner">
      <img class="logo" src="/logo.png?v=gold" alt="Paradise Global Leisures" />
      <div>
        <span class="brand-name">Paradise <span class="brand-gold">Global</span></span>
        <span class="brand-sub">Leisures</span>
      </div>
    </div>
  </header>
  <div class="wrap">
    <div>
      <div class="badge"><span class="dot"></span><span class="badge-label">Scheduled Maintenance</span></div>
      <h1>We're making your<br>experience<br>even better.</h1>
      <p class="desc">${message}</p>
      ${reopenText ? `<div class="reopen-box"><span class="clock">🕐</span> Expected back online:&nbsp;<strong>${escapeHtml(reopenText)}</strong></div><br>` : ''}
      <div class="btns">
        <a class="btn-primary" href="mailto:${escapeHtml(companyEmail)}">✉ Contact support ↗</a>
        ${companyWhatsapp ? `<a class="btn-secondary" href="https://wa.me/${escapeHtml(companyWhatsapp.replace(/\D/g,''))}" target="_blank" rel="noopener">💬 Message on WhatsApp</a>` : ''}
      </div>
      <div class="notice">🔄&nbsp;<span>This page checks the site status automatically. You'll be returned as soon as maintenance is complete.</span></div>
    </div>
    <div class="card">
      <div class="card-hdr">
        <div>
          <div class="card-label">Current Status</div>
          <div class="card-title">Upgrade in progress</div>
        </div>
        <div class="card-icon">
          <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
      </div>
      <div class="divider"></div>
      <div class="items">
        <div class="item">
          <div class="item-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <div><div class="item-title">Your information is safe</div><div class="item-desc">All client data and enquiries remain fully protected during maintenance.</div></div>
        </div>
        <div class="item">
          <div class="item-icon"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
          <div><div class="item-title">Existing enquiries continue</div><div class="item-desc">Maintenance does not affect your submitted enquiries or service requests.</div></div>
        </div>
        <div class="item">
          <div class="item-icon"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></div>
          <div><div class="item-title">Service will resume automatically</div><div class="item-desc">No action or page refresh is required from you.</div></div>
        </div>
      </div>
      <div class="contacts">
        <div class="contact-row">
          <div class="contact-label">Email</div>
          <a class="contact-link" href="mailto:${escapeHtml(companyEmail)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escapeHtml(companyEmail)}</a>
        </div>
        ${companyPhone ? `<div class="contact-row"><div class="contact-label">Urgent Support</div><div class="contact-phones">${companyPhones.map((number) => `<a class="contact-link" href="tel:${escapeHtml(telNumber(number))}"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 7.69 7.69l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(number)}</a>`).join('')}</div></div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
        return new Response(html, {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Retry-After': '3600',
            'Strict-Transport-Security': 'max-age=31536000',
          },
        });
      }
    }
  } catch (error) {
    console.error('Unable to evaluate maintenance mode:', error);
  }

  return next();
};
