/**
 * The "Launching soon" maintenance design, written as plain HTML and CSS so the same markup is served by the
 * Cloudflare middleware (before the app loads) and rendered inside the React app (fallback and admin preview).
 * Every class is prefixed with "lp-" so it cannot clash with the site's own styles.
 */

export interface LaunchPageOptions {
  /** The "Expected reopening" value from Admin, used as the official launch date (e.g. "2026-12-01T09:00"). */
  launchDate?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  email?: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (day: number) => (day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');

/** "2026-12-01T09:00" → "December 01<sup>st</sup>, 2026". The date is read as written, so time zones cannot shift it. */
export const formatLaunchDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  const monthName = months[Number(month) - 1];
  if (!monthName) return '';
  return `${monthName} ${day}<sup>${ordinal(Number(day))}</sup>, ${year}`;
};

const icons = {
  rocket: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2.5c3.6-.9 6.9-.6 7.9.1.7 1 1 4.3.1 7.9-.8 3.2-3 6-5.8 7.9l.3 2.9c0 .3-.1.6-.3.8l-2.1 1.6c-.4.3-.9.1-1-.4l-.6-2.8-3.3-3.3-2.8-.6c-.5-.1-.7-.6-.4-1l1.6-2.1c.2-.2.5-.3.8-.3l2.9.3c1.9-2.8 4.7-5 7.9-5.8zM16 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5.2 16.6c.8-.1 1.6.2 2.2.8.6.6.9 1.4.8 2.2-.2 1.6-2.6 2.6-5.7 2.9.3-3.1 1.3-5.5 2.7-5.9z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7 13h2M11 13h2M15 13h2M7 16.5h2M11 16.5h2M15 16.5h2" stroke-width="2.2"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5H16.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 17.9c-1.5 0-3-.4-4.2-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1 1 12 20.1zm4.5-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6.5 9-6.5"/></svg>',
};

/** The laptop, palm, globe, plane and site-works illustration. */
const illustration = `<svg class="lp-art" viewBox="0 0 680 500" role="img" aria-label="A laptop showing a gear and an under development progress bar, with a palm tree, a globe, a plane, a hard hat and construction cones">
  <defs>
    <radialGradient id="lpGlobe" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f1e2c2"/></radialGradient>
    <linearGradient id="lpGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d58c"/><stop offset=".55" stop-color="#d4a94a"/><stop offset="1" stop-color="#b98a2c"/></linearGradient>
    <linearGradient id="lpLeaf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9c877"/><stop offset="1" stop-color="#c79a3e"/></linearGradient>
    <linearGradient id="lpHat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd54a"/><stop offset="1" stop-color="#f2a900"/></linearGradient>
    <linearGradient id="lpBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e8ee"/><stop offset="1" stop-color="#a9afbc"/></linearGradient>
    <linearGradient id="lpScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3460"/><stop offset="1" stop-color="#0c1d38"/></linearGradient>
    <pattern id="lpStripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="18" fill="#f4b400"/><rect x="9" width="9" height="18" fill="#2b2f3a"/></pattern>
    <pattern id="lpBarStripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="#f2c14e"/><rect x="8" width="8" height="16" fill="#9a7425"/></pattern>
    <filter id="lpShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#0a1628" flood-opacity=".18"/></filter>
  </defs>

  <!-- Globe -->
  <g opacity=".85">
    <circle cx="455" cy="190" r="170" fill="url(#lpGlobe)"/>
    <g fill="none" stroke="#e6d3a6" stroke-width="1.5">
      <ellipse cx="455" cy="190" rx="70" ry="170"/><ellipse cx="455" cy="190" rx="135" ry="170"/>
      <path d="M285 190h340M300 110h310M300 270h310M340 50h230M340 330h230"/>
    </g>
    <path d="M395 95c25-12 55-5 70 10s-5 30 10 45 40 5 45 25-20 30-45 28-30 20-50 12-10-35-30-45-30-15-25-35 5-30 25-40zM540 230c15-5 35 5 38 20s-10 35-25 38-25-10-28-25 0-28 15-33z" fill="#ead7a8" opacity=".7"/>
  </g>

  <!-- Orbit and flight path -->
  <ellipse cx="370" cy="275" rx="300" ry="92" transform="rotate(-12 370 275)" fill="none" stroke="#d4a94a" stroke-width="2" opacity=".55"/>
  <path class="lp-flight" d="M120 330C230 210 420 140 585 72" fill="none" stroke="#c9a84c" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
  <path d="M572 70l16 1-9 13" fill="none" stroke="#c9a84c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="lp-plane"><g transform="translate(600 20) rotate(-20) scale(3.2)">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#0f2547" transform="rotate(45 12 12)"/>
  </g></g>

  <!-- Palm tree -->
  <g transform="translate(-95 0)">
    <path d="M268 392c-6-70-14-150-32-232" fill="none" stroke="#c9a253" stroke-width="15" stroke-linecap="round"/>
    <path d="M262 370l14-4M259 340l14-4M255 310l14-4M251 280l13-4M247 250l13-4M243 220l12-4M240 190l11-3" stroke="#a8802f" stroke-width="2.5" stroke-linecap="round"/>
    <g fill="url(#lpLeaf)">
      <path d="M236 158c-40-30-95-28-125 5 40-8 80-3 125-5z"/>
      <path d="M236 158c-30-45-80-60-120-40 42 5 80 20 120 40z"/>
      <path d="M236 158c-5-50-35-85-75-92 25 25 45 55 75 92z"/>
      <path d="M236 158c20-45 55-70 98-70-30 18-58 40-98 70z"/>
      <path d="M236 158c45-25 100-20 128 15-42-10-82-12-128-15z"/>
      <path d="M236 158c35 5 75 30 88 72-30-30-55-50-88-72z"/>
      <path d="M236 158c-30 5-65 30-75 70 25-30 45-50 75-70z"/>
    </g>
  </g>

  <!-- Laptop -->
  <g filter="url(#lpShadow)">
    <rect x="196" y="146" width="338" height="224" rx="16" fill="#d7dbe3"/>
    <rect x="206" y="156" width="318" height="204" rx="9" fill="url(#lpScreen)"/>
    <circle cx="365" cy="151" r="2" fill="#8a91a0"/>
    <path d="M150 370h430l-24 26H174z" fill="url(#lpBase)"/>
    <path d="M335 370h60l-4 6h-52z" fill="#8f96a5"/>
  </g>
  <g transform="translate(365 232)"><g class="lp-gear">
    <g fill="#e9ecf2">
      <rect x="-9" y="-48" width="18" height="20" rx="3"/><rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(45)"/>
      <rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(90)"/><rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(135)"/>
      <rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(180)"/><rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(225)"/>
      <rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(270)"/><rect x="-9" y="-48" width="18" height="20" rx="3" transform="rotate(315)"/>
      <circle r="34"/>
    </g>
    <circle r="15" fill="#14294d"/>
  </g></g>
  <rect x="262" y="292" width="206" height="16" rx="8" fill="#0b1a33" stroke="#e9ecf2" stroke-width="2"/>
  <rect class="lp-progress" x="266" y="296" width="132" height="8" rx="4" fill="url(#lpBarStripes)"/>
  <text x="365" y="337" text-anchor="middle" fill="#fff" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="500">Under Development…</text>

  <!-- Hard hat -->
  <g transform="translate(298 398)">
    <ellipse cx="0" cy="2" rx="92" ry="13" fill="#e0a000"/>
    <path d="M-68 0a68 62 0 0 1 136 0z" fill="url(#lpHat)"/>
    <path d="M-9 -60h18v58h-18z" fill="#ffdd6e" opacity=".8"/>
    <g transform="translate(0 -30)" fill="none" stroke="#fff" stroke-width="2" opacity=".9">
      <path d="M-13 6a13 13 0 0 1 26 0"/><path d="M0 -7v-6M-9 -3l-4-4M9 -3l4-4"/><path d="M-15 10q15-6 30 0"/>
    </g>
  </g>

  <!-- Barrier -->
  <g>
    <rect x="575" y="300" width="9" height="130" fill="#b88a4a"/><rect x="648" y="300" width="9" height="130" fill="#b88a4a"/>
    <rect x="560" y="306" width="112" height="26" rx="3" fill="url(#lpStripes)"/>
    <rect x="560" y="352" width="112" height="26" rx="3" fill="url(#lpStripes)"/>
    <path d="M570 430l12-28 12 28M636 430l12-28 12 28" fill="none" stroke="#9c7238" stroke-width="5"/>
  </g>

  <!-- Cones -->
  <g transform="translate(565 492)">
    <path d="M-24 0l18-82h12l18 82z" fill="#ff7a1a"/>
    <path d="M-15.5 -40h31l3 14h-37zM-10 -66h20l2 11h-24z" fill="#fff"/>
    <rect x="-34" y="-6" width="68" height="8" rx="2" fill="#e8620c"/>
  </g>
  <g transform="translate(640 494) rotate(-58)">
    <path d="M-17 0l13-56h8l13 56z" fill="#ff7a1a"/>
    <path d="M-11 -28h22l2 10h-26zM-7 -46h14l1.5 8h-17z" fill="#fff"/>
    <rect x="-24" y="-4" width="48" height="6" rx="2" fill="#e8620c"/>
  </g>
</svg>`;

export const launchPageStyles = `@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap');
.lp, .lp * { box-sizing: border-box; }
.lp { position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden; display: flex; flex-direction: column; margin: 0;
  background: radial-gradient(circle at 78% 30%, #fff 0%, rgba(255,255,255,0) 45%), linear-gradient(135deg, #fbf5ea 0%, #fdf9f2 45%, #f7f3ec 100%);
  color: #0a1628; font-family: Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.lp a { color: inherit; text-decoration: none; }
.lp-main { position: relative; z-index: 1; flex: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: 40px 24px 24px;
  display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: center; align-content: safe center; }
.lp-brand { display: flex; align-items: center; gap: 18px; }
.lp-brand img { width: 84px; height: 84px; object-fit: contain; }
.lp-brand-rule { width: 1px; align-self: stretch; background: #d8cdb6; }
.lp-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 30px; font-weight: 700; line-height: 1; }
.lp-brand-name span { color: #c9a84c; }
.lp-brand-sub { margin-top: 8px; font-size: 13px; letter-spacing: .5em; text-transform: uppercase; color: #0a1628; }
.lp-badge { margin-top: 34px; display: inline-flex; align-items: center; gap: 10px; padding: 9px 18px; border-radius: 999px;
  border: 1px solid #e6d2a4; background: rgba(255,255,255,.65); font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.lp-badge svg { width: 18px; height: 18px; color: #0a1628; }
.lp-title { margin: 22px 0 0; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: clamp(2.3rem, 4.6vw, 4.1rem); line-height: 1.08; letter-spacing: -.01em; }
.lp-title .lp-gold { background: linear-gradient(135deg, #e3bd5c 0%, #c9a84c 45%, #a97f25 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lp-swoosh { display: block; width: min(100%, 470px); height: 18px; margin-top: 2px; }
.lp-text { margin: 18px 0 0; max-width: 560px; font-size: 1.15rem; line-height: 1.6; color: #1f2c40; }
.lp-date { margin-top: 30px; display: inline-flex; align-items: center; gap: 22px; padding: 18px 30px; border-radius: 22px;
  border: 1.5px solid #e3c983; background: rgba(255,255,255,.8); box-shadow: 0 14px 36px rgba(201,168,76,.16); }
.lp-date svg { width: 44px; height: 44px; color: #0a1628; }
.lp-date-rule { width: 1px; height: 52px; background: #dcc79a; }
.lp-date-label { font-size: 15px; color: #33405a; }
.lp-date-value { margin-top: 4px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700; font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.1; }
.lp-date-value sup { font-size: .55em; }
.lp-tuned { margin-top: 22px; text-align: center; max-width: 620px; }
.lp-tuned-script { font-family: 'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive; font-size: clamp(2.6rem, 4.6vw, 3.6rem); line-height: 1; color: #0a1628; }
.lp-tagline { margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 14px; letter-spacing: .3em; text-transform: uppercase; }
.lp-tagline::before, .lp-tagline::after { content: ''; flex: 1; max-width: 120px; height: 1px; background: #d4b874; }
.lp-tagline i { width: 5px; height: 5px; border-radius: 50%; background: #c9a84c; display: inline-block; }
.lp-art { display: block; width: 100%; max-width: 680px; height: auto; margin: 0 auto; overflow: visible; }
.lp-gear { animation: lp-spin 9s linear infinite; transform-box: fill-box; transform-origin: center; }
.lp-progress { animation: lp-load 3.2s ease-in-out infinite alternate; }
.lp-plane { animation: lp-float 4s ease-in-out infinite; }
.lp-footer { position: relative; z-index: 1; margin-top: auto; padding: 70px 24px 22px; text-align: center; color: #0a1628; }
.lp-wave { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; }
.lp-follow { display: flex; align-items: center; justify-content: center; gap: 16px; font-size: 15px; font-weight: 500; }
.lp-follow::before, .lp-follow::after { content: ''; width: 140px; max-width: 18vw; height: 1px; background: #0a1628; opacity: .6; }
.lp-social { margin-top: 12px; display: flex; justify-content: center; gap: 14px; }
.lp-social a { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: #0a1628; color: #fff;
  border: 2px solid #fff; box-shadow: 0 6px 14px rgba(10,22,40,.25); transition: transform .2s, background .2s; }
.lp-social a:hover, .lp-social a:focus-visible { transform: translateY(-2px); background: #c9a84c; }
.lp-social svg { width: 20px; height: 20px; }
@keyframes lp-spin { to { transform: rotate(360deg); } }
@keyframes lp-load { from { width: 70px; } to { width: 190px; } }
@keyframes lp-float { 50% { transform: translate(6px, -8px); } }
@media (min-width: 960px) {
  /* Sizes follow the window height too, so the whole page fits on one laptop or desktop screen. */
  .lp { height: 100vh; height: 100dvh; min-height: 600px; }
  .lp-main { grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); padding: 3vh 48px 0; gap: 32px; min-height: 0; }
  .lp-brand img { width: clamp(52px, 8.5vh, 84px); height: clamp(52px, 8.5vh, 84px); }
  .lp-brand-name { font-size: clamp(22px, 3.3vh, 30px); }
  .lp-badge { margin-top: 3.2vh; }
  .lp-title { margin-top: 2.2vh; font-size: clamp(2.2rem, min(4.6vw, 7.4vh), 4.1rem); }
  .lp-text { margin-top: 1.6vh; font-size: clamp(1rem, 2vh, 1.15rem); }
  .lp-date { margin-top: 2.8vh; padding: 1.7vh 28px; }
  .lp-date svg { width: clamp(34px, 4.8vh, 44px); height: clamp(34px, 4.8vh, 44px); }
  .lp-date-value { font-size: clamp(1.4rem, min(2.6vw, 4vh), 2.1rem); }
  .lp-tuned { margin-top: 2.4vh; }
  .lp-tuned-script { font-size: clamp(2.2rem, min(4.6vw, 6.4vh), 3.6rem); }
  .lp-art { max-height: calc(100dvh - 190px); }
  .lp-footer { padding: clamp(40px, 7vh, 70px) 24px clamp(12px, 2.2vh, 22px); }
  .lp-social a { width: clamp(36px, 4.6vh, 42px); height: clamp(36px, 4.6vh, 42px); }
}
@media (max-width: 600px) {
  .lp-main { padding: 28px 16px 12px; }
  .lp-brand { gap: 12px; } .lp-brand img { width: 60px; height: 60px; }
  .lp-brand-name { font-size: 23px; } .lp-brand-sub { font-size: 11px; letter-spacing: .4em; }
  .lp-badge { margin-top: 24px; font-size: 11px; padding: 8px 14px; }
  .lp-text { font-size: 1rem; }
  .lp-date { display: flex; max-width: 100%; gap: 14px; padding: 14px 18px; } .lp-date svg { width: 34px; height: 34px; } .lp-date-rule { height: 42px; }
  .lp-tagline { font-size: 11px; gap: 10px; letter-spacing: .22em; }
  .lp-footer { padding-top: 56px; }
}
@media (prefers-reduced-motion: reduce) { .lp-gear, .lp-progress, .lp-plane { animation: none; } }`;

/** The page markup (without <html>/<head>), shared by the server page and the React page. */
export const launchPageBody = (options: LaunchPageOptions = {}) => {
  const launchDate = formatLaunchDate(options.launchDate);
  const whatsapp = options.whatsapp?.replace(/\D/g, '');
  const socials = [
    options.facebook && /^https:\/\//i.test(options.facebook) ? { href: options.facebook, label: 'Facebook', icon: icons.facebook } : null,
    options.instagram && /^https:\/\//i.test(options.instagram) ? { href: options.instagram, label: 'Instagram', icon: icons.instagram } : null,
    whatsapp ? { href: `https://wa.me/${whatsapp}`, label: 'WhatsApp', icon: icons.whatsapp } : null,
    options.email ? { href: `mailto:${options.email}`, label: 'Email', icon: icons.email } : null,
  ].filter((entry): entry is { href: string; label: string; icon: string } => entry !== null);

  return `<div class="lp">
  <main class="lp-main">
    <div>
      <div class="lp-brand">
        <img src="/logo.png?v=gold" alt="Paradise Global Leisures logo" />
        <span class="lp-brand-rule"></span>
        <div><div class="lp-brand-name">Paradise <span>Global</span></div><div class="lp-brand-sub">Leisures</div></div>
      </div>
      <div class="lp-badge">${icons.rocket}Website development in progress</div>
      <h1 class="lp-title">Our Website is<br /><span class="lp-gold">Launching</span> Soon!</h1>
      <svg class="lp-swoosh" viewBox="0 0 470 18" preserveAspectRatio="none" aria-hidden="true"><path d="M150 12c60-8 130-9 180-6M345 9c45-5 90-5 125 1" fill="none" stroke="#c9a84c" stroke-width="3" stroke-linecap="round"/></svg>
      <p class="lp-text">We are working hard to bring you an exceptional experience. Stay tuned for something amazing!</p>
      ${launchDate ? `<div class="lp-date">${icons.calendar}<span class="lp-date-rule"></span><div><div class="lp-date-label">Official Launch Date</div><div class="lp-date-value">${launchDate}</div></div></div>` : ''}
      <div class="lp-tuned">
        <div class="lp-tuned-script">Stay Tuned!</div>
        <div class="lp-tagline">Dream <i></i> Explore <i></i> Experience</div>
      </div>
    </div>
    ${illustration}
  </main>
  <footer class="lp-footer">
    <svg class="lp-wave" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="lpWaveGold" x1="0" x2="1"><stop offset="0" stop-color="#d9b867"/><stop offset=".5" stop-color="#f3dfa6"/><stop offset="1" stop-color="#c9a84c"/></linearGradient></defs>
      <path d="M0 70C300 150 520 170 760 150S1200 60 1440 40V200H0z" fill="url(#lpWaveGold)"/>
      <path d="M0 96C300 170 540 186 780 168S1210 84 1440 66V200H0z" fill="#0a1628"/>
      <path d="M0 80C280 158 520 176 770 158S1200 70 1440 52" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>
    </svg>
    ${socials.length ? `<div class="lp-follow">Follow Us for Updates</div>
    <div class="lp-social">${socials.map((social) => `<a href="${escapeHtml(social.href)}" aria-label="${social.label}"${social.href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${social.icon}</a>`).join('')}</div>` : ''}
  </footer>
</div>`;
};

/** A complete HTML document for the Cloudflare middleware. */
export const launchPageDocument = (options: LaunchPageOptions = {}) => `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Launching Soon — Paradise Global Leisures</title>
  <link rel="icon" href="/favicon.svg" />
  <style>body { margin: 0; background: #fbf5ea; }
${launchPageStyles}</style>
</head>
<body>
${launchPageBody(options)}
</body>
</html>`;
