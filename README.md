# Paradise Global Leisures

Paradise Global Leisures is a responsive property services and real estate website for clients investing, building, selling, or managing property in Sri Lanka. The site presents the company's complete property journey support, including property discovery, approvals, legal consultation, architectural services, construction, and property management.

The website is designed to give visitors a premium, trustworthy experience while making it easy to explore services and properties, view destinations, and submit an enquiry to the business.

## Features

- Responsive marketing website for desktop, tablet, and mobile
- Home page with:
  - Hero section and primary calls to action
  - Core services overview
  - Featured properties
  - Popular Sri Lankan destinations
  - Company benefits and enquiry banner
- About page describing the company and team
- Services overview and dedicated pages for:
  - Plan approvals
  - Property management
  - Legal advice and consultation
  - Architectural support
  - Construction
- Real estate property listing and filtering
- Individual property detail pages
- Destinations page for Sri Lankan coastal locations
- Contact page with enquiry form
- Cloudflare D1 storage for contact enquiries
- Cloudflare Pages Function API for secure database access
- Responsive navigation with desktop dropdowns and mobile menu
- Custom footer with company contact information and service links
- Custom 404 page for unknown routes

## Technology Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- PostCSS and Autoprefixer
- Lucide React icons
- Cloudflare Pages Functions
- Cloudflare D1
- Oxlint

## Requirements

- Node.js 18 or newer
- npm
- A Cloudflare account with a D1 database for contact form submissions

## Getting Started

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:5173`.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build locally |

## Cloudflare D1

The contact form sends requests to the `/api/contact` Cloudflare Pages Function. The function writes enquiries to the `contact_enquiries` D1 table. Each enquiry includes:

- Name
- Email
- Phone
- Requested service
- Property location
- Message
- Submission status
- Submission timestamp

Before using the contact form in production:

1. Install and authenticate the Wrangler CLI.
2. Create the D1 database:

   ```bash
   npx wrangler d1 create paradise-global-leisures
   ```

3. Replace `database_id` in `wrangler.toml` with the returned database ID.
4. Apply the schema:

   ```bash
   npx wrangler d1 execute paradise-global-leisures --remote --file=./schema.sql
   ```

5. Add the D1 binding in Cloudflare Pages using the binding name `DB`.

For local Pages Functions development:

```bash
npm run build
npx wrangler pages dev dist
```

The frontend must be served through Wrangler for `/api/contact` to reach D1.

## Project Structure

```text
src/
├── components/
│   ├── home/          Homepage sections
│   ├── layout/        Navbar, footer, and layout
│   ├── properties/    Property cards and filters
│   └── ui/            Reusable interface components
├── data/              Service and property data
├── functions/         Cloudflare Pages Functions
├── lib/               API integration
├── pages/             Route-level pages
├── App.tsx            Application routes
├── index.css          Global styles
└── main.tsx           Application entry point
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/about` | Company information |
| `/services` | All services |
| `/services/plan-approvals` | Planning and approval support |
| `/services/property-management` | Property management service |
| `/services/legal-consultation` | Legal consultation service |
| `/services/architectural-support` | Architectural support service |
| `/services/construction` | Construction service |
| `/properties` | Property listings |
| `/properties/:slug` | Property details |
| `/destinations` | Featured destinations |
| `/contact` | Contact and enquiry form |

## Production Build

Create a production build with:

```bash
npm run build
```

The compiled website is generated in the `dist` directory. Deploy through Cloudflare Pages so the `functions` directory is deployed together with the frontend and the D1 `DB` binding is available.

## Brand and Content

The site uses a navy, gold, and beige visual palette with serif headings and responsive card-based layouts. Property images and selected visual content are sourced from Unsplash URLs, while the company logo and static brand assets are stored in the `public` directory.

## License

This project is private and intended for Paradise Global Leisures. Add a formal license before distributing the source code publicly.
