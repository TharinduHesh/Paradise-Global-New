# Paradise Global Leisures: Website Overview

A complete list of what this website includes: the public pages, the services, listings, admin console, backend, emails, security and technology.

---

## 1. What the website is

**Paradise Global Leisures (PVT) LTD** is a Sri Lankan property and leisure company. The website helps local and overseas clients **buy, sell, build, approve, manage and holiday in property in Sri Lanka**, with a focus on the southern coast (Galle, Unawatuna, Weligama, Mirissa and nearby towns).

- **Languages:** English and Hebrew. Hebrew displays right-to-left.
- **Look:** premium navy, gold and beige palette with serif headings, card layouts and animated page transitions.
- **Hosting:** Cloudflare Pages, Pages Functions, a D1 database and Workers AI.

---

## 2. Public pages (routes)

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | Home | Hero, services strip, services overview, featured properties, destinations, why choose us, testimonials, call-to-action banner |
| `/about` | About | Company story, mission and team |
| `/services` | Services | All six company divisions |
| `/services/:slug` | Service detail | Features, step-by-step process and an enquiry prompt for each service |
| `/properties` | Properties | Property listings with filters |
| `/properties/:slug` | Property details | Gallery, price, specifications, amenities and an enquiry form |
| `/destinations` | Destinations | Sri Lankan coastal destinations (hospitality) |
| `/projects` | Projects | Completed and ongoing construction and development projects |
| `/contact` | Contact | Enquiry form, phone, WhatsApp, email, address and hours |
| `/privacy-policy` | Privacy Policy | Legal document |
| `/terms-of-service` | Terms of Service | Legal document |
| `*` | 404 | "Page not found" with a link home |
| *(any page)* | Maintenance page | Replaces the whole public site when an admin turns maintenance mode on. Two designs: **Standard** and **Launch** |

### Shared layout
- **Navbar:** desktop dropdown menus, a mobile menu and an English/Hebrew language switch.
- **Footer:** company contact details, service links, social icons (Facebook and Instagram appear only when set) and legal links.
- **Motion:** a preloader intro, page transitions, scroll-reveal animations and reusable motion primitives, built with the `motion` library.

---

## 3. Services (company divisions)

| # | Division | Slug | Main offerings |
| --- | --- | --- | --- |
| 1 | **Paradise Development Solutions** | `plan-approvals` | Building plans and permits, subdivision, change of use, UDA and local authority coordination, tourism and environmental clearances, fire safety and COC. 6-step process |
| 2 | **Paradise Real Estate** | `real-estate` | Residential and commercial sales, land acquisition, leasing and rentals, investment, valuation coordination |
| 3 | **Paradise Property Management** | `property-management` | Tenant and rent administration, inspections, cleaning, gardening, repairs, security, holiday-home and villa management. 6-step process |
| 4 | **Paradise Legal Solutions** | `legal-consultation` | Title and due diligence, sale/purchase and lease agreements, foreign investment, regulatory advice, dispute coordination |
| 5 | **Paradise Hospitality Collection** | `hospitality` | Hotels, resorts, private villas, holiday destinations, reservation enquiries |
| 6 | **Paradise Design & Construction** | `construction` | New-build villas and houses, commercial builds, renovations, interior fit-out, project supervision, QA. 7-step process |

There are also dedicated pages for Plan Approvals, Property Management, Legal Consultation, Architectural Support and Construction.

---

## 4. Property listings

**Built-in sample listings (12):**

| Property | Location | Price | Type |
| --- | --- | --- | --- |
| Luxury Beachfront Villa | Unawatuna | USD 450,000 | Sale |
| Colonial Heritage Villa | Galle Fort | USD 320,000 | Sale |
| Surf & Ocean Villa | Weligama | USD 185,000 | Sale |
| Jungle Bay Villa | Hiriketiya | USD 650 | Rent |
| Mirissa Beach House | Mirissa | USD 275,000 | Sale |
| Beachfront Land Plot | Tangalle | USD 95,000 | Sale |
| Boutique Villa Complex | Dikwella | USD 380,000 | Sale |
| Modern Family Residence | Matara | LKR 45,000,000 | Sale |
| Boutique Guesthouse | Unawatuna | USD 2,500 | Rent |
| Luxury City Apartment | Galle City | USD 125,000 | Sale |
| Weligama Surf Lodge | Weligama | USD 350 | Rent |
| Development Land | Mirissa | USD 55,000 | Sale |

**Fields for each property:** name (English and Hebrew), location, district, type (Villa, House, Land, Apartment, Commercial or Hotel), availability (available, sold or rented), sale or rent, rent period (night or month), price, currency (USD or LKR), bedrooms, bathrooms, land size, images, features and description.

**Filters:** location or district, property type, sale or rent, and price.

---

## 5. Destinations

Galle · Unawatuna · Weligama · Mirissa · Hiriketiya · Tangalle · Matara · Dikwella

## 6. Projects (portfolio)

Examples: **Serenity Villa, Unawatuna** (5-bedroom beachfront villa, completed 2023), **Boutique Hotel, Galle Fort** (renovation of a 1920s Dutch colonial building into 12 rooms, completed 2022) and **Ocean Breeze Villas, Weligama** (residential development, ongoing). Each project has a location, type, status, year, area, image and description.

## 7. Testimonials

Admins add client testimonials. The homepage section stays hidden until at least one is published.

---

## 8. Enquiries (contact system)

1. A visitor fills in the form: name, email, phone, service, property location and message.
2. **Cloudflare Turnstile** checks that the visitor is human.
3. `/api/contact` saves the enquiry to the D1 table `contact_enquiries` and gives it a reference number such as `PGL-00042`.
4. Two branded emails go out through **Resend**:
   - **To the admin:** "New Website Enquiry – Paradise Global Leisures", with a one-click reply button.
   - **To the customer:** "We Have Received Your Enquiry – Paradise Global Leisures".
5. The enquiry appears in the admin **Enquiry Inbox**.

**Enquiry categories** are detected automatically from the chosen service: Contact message, Property enquiry, Approval consultation and Hospitality booking.
**Statuses:** New → In progress → Resolved → Archived.

---

## 9. Admin console (`/admin`)

### Login and access
- Sign in at `/admin/login`. On first deployment, the first **Owner** account is created with a one-time setup token.
- Sessions end **20 minutes** after sign-in.
- Repeated failed logins lock the account temporarily. Passwords follow a policy with a minimum of 12 characters.
- Admin pages are never cached, and the server checks permissions before any admin page loads.

### Roles

| Role | What they can do |
| --- | --- |
| **Owner** | Everything: manage every role, settings, maintenance and publishing |
| **Admin** | Enquiries, website content, publishing, settings. Can manage Manager and Editor accounts |
| **Manager** | Enquiry inbox only |
| **Editor** | Sections an admin grants them (enquiries and/or activity log) |

### Admin sections

| Section | Purpose |
| --- | --- |
| **Dashboard** | Counts of new enquiries, published content, active users and maintenance status. Quick actions and recent activity |
| **Enquiry Inbox** | View, filter, change status, assign to staff and add internal notes |
| **Website Management** | Edit all site content (sub-sections below) |
| **Business Info** | Company name, phone, WhatsApp, email, address, hours, Facebook and Instagram |
| **Maintenance Mode** | Turn the public site off or on, choose a design (Standard or Launch), set title, message and reopening date, and preview |
| **SEO & Reports** | Site title and meta description, plus summary reports |
| **Users & Settings** | Add, edit, deactivate and change the role of staff accounts and reset passwords |
| **Activity Logs** | The last 100 admin actions, showing who did what and when |
| **My Account** | Change your own password |

### Website Management sub-sections
- **Property Listings:** add, edit, publish, reorder and delete properties.
- **Services & Divisions:** service text, features, process steps and images.
- **Hospitality:** destinations.
- **Projects & Testimonials**
- **Website Content:** page text and page images. Leaving an image blank keeps the bundled original photo.
- **Media & Translations**

Content supports search, drafts, published/hidden status, up/down ordering and URL slugs.

### Automatic Hebrew translation
Admins write in **English only**. When they save, changed text is translated into Hebrew automatically by **Cloudflare Workers AI**, or by **Google Cloud Translation** if `GOOGLE_TRANSLATE_API_KEY` is set. Text that didn't change keeps its existing Hebrew.

---

## 10. Backend API (Cloudflare Pages Functions)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/contact` | Submit an enquiry (Turnstile check, save to D1, send emails) |
| `GET /api/content` | Published website content |
| `GET /api/settings` | Public settings (maintenance, company info, SEO) |
| `/api/admin/setup` | Create the first Owner |
| `/api/admin/login-challenge`, `/login`, `/logout`, `/me` | Authentication |
| `/api/admin/password` | Change password |
| `/api/admin/dashboard` | Dashboard metrics |
| `/api/admin/enquiries`, `/enquiry-assignees` | Inbox, notes and assignment |
| `/api/admin/content`, `/content/publish`, `/content/reorder` | Content management |
| `/api/admin/settings` | Business info, maintenance and SEO |
| `/api/admin/users/...` | Staff accounts |
| `/api/admin/activity` | Activity log |
| `/api/admin/translate` | English to Hebrew translation |

## 11. Database (Cloudflare D1)

| Table | Holds |
| --- | --- |
| `contact_enquiries` | Website enquiries |
| `enquiry_notes` | Internal notes on enquiries |
| `admin_users` | Staff accounts and roles |
| `admin_sessions` | Login sessions (tokens are stored hashed) |
| `admin_login_attempts` | Lockout tracking |
| `admin_invitations` | Account invitations |
| `content_items` | Properties, services, destinations, projects, testimonials and page content |
| `media_assets` | Uploaded media records |
| `site_settings` | Company info, maintenance and SEO |
| `admin_activity` | Audit log |

Changes are versioned in `migrations/` (0001 to 0005).

---

## 12. Security

- **Security headers:** Content-Security-Policy, HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy, and a Permissions-Policy that blocks camera, microphone and location.
- **Cloudflare Turnstile** bot protection on forms.
- Hashed passwords, hashed session tokens, an encrypted login envelope and login lockout.
- Role-based access is checked on the server for both pages and the API.
- Secrets are never committed. They live in Cloudflare encrypted secrets: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `OWNER_SETUP_TOKEN` and the optional `GOOGLE_TRANSLATE_API_KEY`.

---

## 13. Technology stack

| Area | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router 7 |
| Styling | Tailwind CSS 4, PostCSS, Autoprefixer |
| Icons and animation | Lucide React, Motion |
| Languages | i18next and react-i18next (English and Hebrew) |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| AI translation | Cloudflare Workers AI, with optional Google Translate |
| Email | Resend |
| Bot protection | Cloudflare Turnstile |
| Code quality | Oxlint, TypeScript type-check |

## 14. Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Frontend only, at http://localhost:5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run dev:pages` | Full site with the API and admin, at http://localhost:8788 (run `npm run build` first) |
| `npm run lint` | Oxlint |
| `npm test` | TypeScript check |
| `npx wrangler d1 migrations apply paradise-global-new --remote` | Apply database migrations |

## 15. Business details (defaults, editable in admin)

- **Company:** Paradise Global Leisures (PVT) LTD
- **Phone:** 075 166 8705 · **WhatsApp:** +94 75 166 8705
- **Email:** info@paradisegloballeisures.com
- **Address:** Kandy & Colombo, Sri Lanka
- **Hours:** Mon–Fri 9:00 AM – 6:00 PM; Sat 9:00 AM – 1:00 PM

## 16. Project structure

```text
functions/            Cloudflare Pages Functions (API, auth, email, translation, Turnstile)
  _lib/               Shared server helpers
  api/                /api/contact, /api/content, /api/settings, /api/admin/*
migrations/           D1 database migrations
public/               Static assets and security headers (_headers)
src/
  components/         home, layout, legal, motion, properties, services, ui, admin
  data/               Built-in properties, services, destinations, service details
  i18n/               English and Hebrew text, legal text
  lib/                Content loading, schemas, access rules, API clients, helpers
  pages/              Every public and admin page
  App.tsx             Routes and maintenance handling
schema.sql            Full database schema
wrangler.toml         Cloudflare configuration
```
