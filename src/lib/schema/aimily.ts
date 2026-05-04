/* ═══════════════════════════════════════════════════════════════════
   Schema.org JSON-LD generators for aimily.

   All schema is server-rendered for crawlability (Google AI Overviews,
   ChatGPT search, Perplexity, Bing). Reference: SEO-GEO-STRATEGY §5.2.

   Verified against:
   - https://developers.google.com/search/docs/appearance/structured-data/software-app
   - https://schema.org/WebApplication
   - https://schema.org/Organization
   ═══════════════════════════════════════════════════════════════════ */

const BASE = 'https://www.aimily.app';

export const ORG_ID = `${BASE}/#organization`;
export const APP_ID = `${BASE}/#webapp`;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'aimily',
    alternateName: 'aimily.app',
    url: BASE,
    logo: `${BASE}/images/aimily-logo-white.png`,
    description:
      'aimily is the only AI-native, end-to-end fashion platform. Brand DNA, range plan, tech packs and campaigns in one continuous data flow.',
    foundingDate: '2023',
    founder: [
      {
        '@type': 'Person',
        name: 'Felipe Martínez Cutillas',
        jobTitle: 'Co-founder, Creative & Strategy',
      },
      {
        '@type': 'Person',
        name: 'Noelia Noguera Pardo',
        jobTitle: 'Co-founder, Creative & Product',
      },
    ],
    parentOrganization: {
      '@type': 'Organization',
      name: 'StudioNN Agency',
      url: 'https://www.studionnagency.com',
    },
    sameAs: [
      'https://www.instagram.com/studionnagency',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'hello@aimily.app',
      availableLanguage: ['English', 'Spanish', 'French', 'Italian', 'German', 'Portuguese'],
    },
  };
}

export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': APP_ID,
    name: 'aimily',
    url: BASE,
    description:
      'The only AI-native, end-to-end fashion platform — Brand DNA, range plan, tech packs and campaigns in one continuous data flow. Replaces the fragmented stack of PLM + design tool + ERP + marketing software.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'FashionDesignSoftware',
    operatingSystem: 'Web Browser',
    browserRequirements:
      'Requires modern browser with JavaScript enabled. Optimized for Chrome, Safari, Firefox, Edge.',
    softwareVersion: '1.0',
    inLanguage: ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'no', 'sv'],
    publisher: { '@id': ORG_ID },
    featureList: [
      // Block 1 — Creative & Brand
      'AI Brand DNA generation from one-paragraph brief',
      'AI Consumer profile generation',
      'AI Moodboard generation with palette extraction',
      'Trend signals from live social data',
      // Block 2 — Merchandising
      'Range plan with SKU grid, pricing tiers, channel split',
      'Budget reconciliation with production capacity',
      'AI Margin Protection with material substitution suggestions',
      // Block 3 — Design & Development (PLM-equivalent)
      'Tech pack PDF export in under 5 seconds',
      'Multi-view technical drawings up to 7 slots per SKU',
      'Pantone TCX library — 2,317 entries with closest-match Delta E2000',
      'Materials library — 963 verified B2B-supplier entries across 8 categories',
      'BOM-driven costing engine with multi-currency ECB FX rates',
      'Sample tracking chain with AI photo comparison vs sketch',
      'Multi-stage approval workflow with email notifications',
      'Version control with side-by-side diff',
      'Multi-pin annotations on tech pack drawings',
      'Compliance Hub and Vendor Portal',
      'Construction Details and Artworks Library',
      'PO variance tracking — actual vs projected landed cost',
      // Block 4 — Marketing & Launch
      'AI editorial generation without photoshoot',
      'Drop calendar coordination across stockists',
      'Content studio per SKU per channel',
      'Live sales dashboard',
      // Cross-cutting
      'In-product AI assistant powered by Anthropic Claude Haiku 4.5',
      '9 languages — EN, ES, FR, IT, DE, PT, NL, NO, SV',
      '16 specialized AI endpoints in a connected data flow',
      'Stripe LIVE billing with imagery quotas and top-up packs',
    ],
    offers: [
      offer('Starter', 159, 'For solo founders'),
      offer('Professional', 479, 'For teams shipping multiple drops'),
      offer('Pro Max', 1199, 'For studios at peak creative pace'),
      enterpriseOffer(),
    ],
  };
}

function offer(name: string, price: number, description: string) {
  return {
    '@type': 'Offer',
    name,
    description,
    price,
    priceCurrency: 'EUR',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price,
      priceCurrency: 'EUR',
      billingDuration: 'P1M',
      unitText: 'MONTH',
    },
    availability: 'https://schema.org/InStock',
    url: `${BASE}/#pricing`,
  };
}

function enterpriseOffer() {
  return {
    '@type': 'Offer',
    name: 'Enterprise',
    description: 'For consolidated brands. Custom seats + SSO + API + dedicated onboarding.',
    priceCurrency: 'EUR',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      priceCurrency: 'EUR',
      minPrice: 3000,
      billingDuration: 'P1M',
      unitText: 'MONTH',
    },
    availability: 'https://schema.org/InStock',
    url: `${BASE}/contact`,
  };
}

/** Renders the JSON-LD as a <script> string. Server-side, no XSS risk
 *  because content is fully controlled (no user input). */
export function jsonLdScript(schema: object) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

// ────────────────────────────────────────────────────────────────────
// Page-level helpers (workflows + comparison pages)
// ────────────────────────────────────────────────────────────────────

export interface FaqEntry { q: string; a: string; }
export interface HowToStepIn { name: string; text: string; }

export function faqPageSchema(faqs: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

export function howToSchema({
  name,
  description,
  totalTime,
  steps,
  url,
}: {
  name: string;
  description: string;
  totalTime?: string;
  steps: HowToStepIn[];
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime ? { totalTime } : {}),
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'EUR', value: '0' },
    tool: [{ '@type': 'HowToTool', name: 'aimily account (free trial)' }],
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: `${url}#step-${i + 1}`,
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** ItemList for comparison pages — Google understands these for
 *  "best X" listicle-style queries. */
export function comparisonItemListSchema({
  name,
  competitorName,
  url,
}: {
  name: string;
  competitorName: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: 2,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'aimily',
        url: BASE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: competitorName,
      },
    ],
    url,
  };
}
