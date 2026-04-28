/* ═══════════════════════════════════════════════════════════════════
   src/i18n/home.ts — translations for the consolidated public landing.

   Lives outside the per-locale files (en.ts, es.ts, ...) because the
   home content is large enough (~200 strings) and self-contained
   enough to merit its own module.

   Strategy:
     - en + es defined explicitly.
     - All other 7 locales fall back to en at runtime via the
       `useHomeTranslation()` hook below.
     - Locale-specific entries can be added as Felipe translates.

   Proper nouns (place names, supplier names, fashion brands) stay
   literal across locales — translating "Côte d'Azur" or "Solbiati"
   would be wrong.
   ═══════════════════════════════════════════════════════════════════ */

import { useLanguage, type Language } from '@/contexts/LanguageContext';

export type HomeDict = {
  // Layer 1 — minimal portada
  hero: {
    scrollCue: string;
  };
  // Layer 2 — meet aimily hero (DWP angle)
  meet: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Italic: string;
    subtitle: string;
    cta: string;
    noCard: string;
    scrollCue: string;
  };
  // Silogism Emily → aimily
  silogism: {
    eyebrow: string;
    titleA: string;
    titleAItalic: string;
    titleAEnd: string;
    titleB: string;
    titleBItalic: string;
    titleBEnd: string;
    emilyDate: string;
    emilyText: string;
    emilyCaption: string;
    aimilyDate: string;
    aimilyText: string;
    aimilyCaption: string;
    quoteLine1: string;
    quoteLine2: string;
  };
  // The problem
  problem: {
    eyebrow: string;
    titleStart: string;
    titleItalic: string;
    titleEnd: string;
    subtitle: string;
    statSpreadsheets: string;
    statEmails: string;
    statApps: string;
    statTuesdays: string;
  };
  // Pull the thread — journey overview
  thread: {
    eyebrow: string;
    titleStart: string;
    titleItalic1: string;
    titleMid: string;
    titleItalic2: string;
    titleEnd: string;
    subtitle: string;
    step1Label: string;
    step1Title: string;
    step1Outputs: string;
    step1Stat: string;
    step2Label: string;
    step2Title: string;
    step2Outputs: string;
    step2Stat: string;
    step3Label: string;
    step3Title: string;
    step3Outputs: string;
    step3Stat: string;
    step4Label: string;
    step4Title: string;
    step4Outputs: string;
    step4Stat: string;
    captionStart: string;
    captionAzur: string;
    captionEnd: string;
  };
  // Block-level shared
  blocks: {
    beforeAimily: string;
    withAimily: string;
  };
  // Block 01 — Creative & Brand
  block1: {
    label: string;
    titleStart: string;
    titleItalic: string;
    titleEnd: string;
    description: string;
    before: string;
    after: string;
    brandDnaEyebrow: string;
    brandDnaTitle: string;
    brandDnaHeritage: string;
    brandDnaHeritageVal: string;
    brandDnaVoice: string;
    brandDnaVoiceVal: string;
    brandDnaValues: string;
    brandDnaValuesVal: string;
    brandDnaRefs: string;
    brandDnaRefsVal: string;
    consumerEyebrow: string;
    consumerTitle: string;
    consumerDemographics: string;
    consumerDemographicsVal: string;
    consumerPsychographics: string;
    consumerPsychographicsVal: string;
    consumerWhereShops: string;
    consumerWhereShopsVal: string;
    consumerAvoids: string;
    consumerAvoidsVal: string;
    consumerCaption: string;
    moodboardEyebrow: string;
    paletteExtracted: string;
    paletteSeaFoam: string;
    paletteLinen: string;
    paletteTerracotta: string;
    paletteCarbon: string;
    paletteCitronella: string;
  };
  // Block 02 — Merchandising
  block2: {
    label: string;
    titleStart: string;
    titleItalic: string;
    titleEnd: string;
    description: string;
    before: string;
    after: string;
    rangePlanEyebrow: string;
    rangePlanTitle: string;
    rangePlanTotalCost: string;
    rangePlanRevenue: string;
    rangePlanMargin: string;
    rangePlanSkus: string;
    rangePlanUnits: string;
    rangePlanEg: string;
    family1Name: string;
    family2Name: string;
    family3Name: string;
    family4Name: string;
    channelEyebrow: string;
    channelTitle: string;
    channel1: string;
    channel2: string;
    channel3: string;
    channel4: string;
    channelCaption: string;
    budgetEyebrow: string;
    budgetTitle: string;
    budget1: string;
    budget2: string;
    budget3: string;
    budget4: string;
    budgetTotalLabel: string;
    budgetCycle: string;
    captionFooter: string;
  };
  // Block 03 — Design & Development
  block3: {
    label: string;
    titleStart: string;
    titleItalic: string;
    titleEnd: string;
    description: string;
    before: string;
    after: string;
    sketchEyebrow: string;
    renderEyebrow: string;
    techPackEyebrow: string;
    techPackTitle: string;
    techPackBadge: string;
    measurements: string;
    bom: string;
    pinComments: string;
    timelineEyebrow: string;
    timelineCaption: string;
    statusResolved: string;
    statusOpen: string;
  };
  // Block 04 — Marketing & Launch
  block4: {
    label: string;
    titleStart: string;
    titleItalic: string;
    titleEnd: string;
    description: string;
    before: string;
    after: string;
    editorialEyebrow: string;
    dropEyebrow: string;
    dropTitle: string;
    dropSkus: string;
    salesEyebrow: string;
    salesTitle: string;
    salesKpi1: string;
    salesKpi2: string;
    salesKpi3: string;
    salesKpi4: string;
    salesKpi5: string;
    salesKpi6: string;
    contentEyebrow: string;
    contentTitle: string;
    tier: string;
  };
  // Enterprise artifacts
  artifacts: {
    eyebrow: string;
    titleItalic: string;
    titleEnd: string;
    techPackTitle: string;
    techPackDesc: string;
    techPackTag: string;
    deckTitle: string;
    deckDesc: string;
    deckTag: string;
    calendarTitle: string;
    calendarDesc: string;
    calendarTag: string;
    rangeTitle: string;
    rangeDesc: string;
    rangeTag: string;
    wholesaleTitle: string;
    wholesaleDesc: string;
    wholesaleTag: string;
    contentTitle: string;
    contentDesc: string;
    contentTag: string;
  };
  // StudioNN origin
  studionn: {
    eyebrow: string;
    titleStart: string;
    titleItalic1: string;
    titleMid: string;
    titleItalic2: string;
    titleEnd: string;
    p1: string;
    p2: string;
    p3: string;
  };
  // Final CTA
  finalCta: {
    title: string;
    subtitle: string;
    button: string;
  };
  // Pricing
  pricing: {
    eyebrow: string;
    titleItalic: string;
    titleEnd: string;
    subtitle: string;
    monthly: string;
    annual: string;
    annualSave: string;
    recommended: string;
    starterName: string;
    professionalName: string;
    proMaxName: string;
    enterpriseName: string;
    starterTagline: string;
    professionalTagline: string;
    proMaxTagline: string;
    enterpriseTagline: string;
    perMonth: string;
    perYear: string; // includes a {price} placeholder, replaced manually
    customPrice: string;
    customFrom: string;
    imagery: string;
    seats: string;
    unlimited: string;
    ctaStart: string;
    ctaContact: string;
    ctaCurrent: string;
    h: {
      starter1: string; starter2: string; starter3: string; starter4: string;
      pro1: string; pro2: string; pro3: string; pro4: string;
      proMax1: string; proMax2: string; proMax3: string; proMax4: string;
      ent1: string; ent2: string; ent3: string; ent4: string;
    };
    topupsEyebrow: string;
    topupsTitle: string;
    topupsBuy: string;
    whatCounts: string;
    countSketch: string;
    countColorize: string;
    countEditorial: string;
    countStillLife: string;
    countVisualRefs: string;
    countVideo: string;
    countText: string;
    countResearch: string;
    countFree: string;
    countImg: string; // placeholder: "{n} img"
    footerNote: string;
    manage: string;
  };
};

// ═════════════════════════════════════ EN ═════════════════════════════════════
const en: HomeDict = {
  hero: { scrollCue: 'Discover' },
  meet: {
    eyebrow: 'Meet aimily',
    titleLine1: 'The AI assistant',
    titleLine2Italic: 'Miranda would have hired.',
    subtitle: 'One platform takes a fashion idea from the spark of a moodboard to a sold-out launch. Brand DNA. Range plan. Tech packs. Campaigns. Every block, connected.',
    cta: 'Start your collection — free 14 days',
    noCard: 'No credit card required',
    scrollCue: 'See the journey',
  },
  silogism: {
    eyebrow: 'The Devil Wears Prada · 2006 → 2026',
    titleA: 'Emily did it ',
    titleAItalic: 'by hand',
    titleAEnd: '.',
    titleB: 'aimily does it ',
    titleBItalic: 'in seconds',
    titleBEnd: '.',
    emilyDate: '2006 · Emily',
    emilyText: 'An assistant who never slept. Coordinated suppliers. Tracked samples. Managed Miranda\'s diary. Held the office together with caffeine, gut feeling, and grace.',
    emilyCaption: 'Did everything in fashion — exhausted, exploited, limited.',
    aimilyDate: '2026 · aimily',
    aimilyText: 'An AI assistant who never sleeps. Generates moodboards. Builds range plans. Drafts campaigns. Walks a collection from spark to launch — across every block of the business.',
    aimilyCaption: 'Does it too — at scale, in seconds, never burned out.',
    quoteLine1: '"Miranda needed Emily.',
    quoteLine2: 'You need aimily."',
  },
  problem: {
    eyebrow: 'The problem',
    titleStart: 'Today, fashion runs on ',
    titleItalic: '14 spreadsheets',
    titleEnd: ', one creative director, and a prayer.',
    subtitle: 'The brand brief lives in Notion. The range plan in Excel. The tech pack in PDF. The drop calendar in Google Calendar. The campaign in InDesign. Nothing talks to anything else. Information walks the building.',
    statSpreadsheets: 'spreadsheets',
    statEmails: 'emails per day',
    statApps: 'apps to switch',
    statTuesdays: 'Tuesdays',
  },
  thread: {
    eyebrow: 'Pull the thread',
    titleStart: 'From a ',
    titleItalic1: 'spark',
    titleMid: ' in your head to a ',
    titleItalic2: 'sold-out',
    titleEnd: ' drop.',
    subtitle: 'Four blocks, one platform. A vision becomes a brand DNA card. The DNA becomes a range plan. The plan becomes tech packs. The packs become product photos. The photos become a launch. Each block reads from the one before — nothing gets retyped.',
    step1Label: 'Creative & Brand',
    step1Title: 'Codify the vision',
    step1Outputs: 'Brand DNA · Consumer profile · Moodboard · Trend signal',
    step1Stat: '3 weeks → 1 hour',
    step2Label: 'Merchandising',
    step2Title: 'Make it a business',
    step2Outputs: 'Range plan · Pricing strategy · Channel split · Budget',
    step2Stat: 'CFO-ready in 1 day',
    step3Label: 'Design & Development',
    step3Title: 'Ship it to the factory',
    step3Outputs: 'Sketches · Colorways · Tech packs · Production timeline',
    step3Stat: '6 weeks → 6 days',
    step4Label: 'Marketing & Launch',
    step4Title: 'Sell it before launch',
    step4Outputs: 'Editorials · Drop calendar · GTM · Sales dashboard',
    step4Stat: 'Sold-out before ribbon-cut',
    captionStart: 'Below: the same thread pulled all the way through, using ',
    captionAzur: 'AZUR · SS27',
    captionEnd: ' — a real Mediterranean resort collection, generated end-to-end inside aimily.',
  },
  blocks: {
    beforeAimily: 'Before aimily',
    withAimily: 'With aimily',
  },
  block1: {
    label: 'Creative & Brand',
    titleStart: 'Start with a ',
    titleItalic: 'vision',
    titleEnd: ', not a spreadsheet.',
    description: 'Type the brief. aimily extracts the brand DNA, builds the consumer profile, generates a curated moodboard, and pulls trend signals from live social data — so every downstream output speaks the same language.',
    before: 'Three weeks of mood meetings. PDFs that nobody reads. A creative direction that lives in one designer\'s head.',
    after: 'Vision codified in 60 minutes. Brand DNA, target consumer, color palette and references — all stored, all queryable, all reused by every other block.',
    brandDnaEyebrow: 'Brand DNA · azur',
    brandDnaTitle: 'Wear what the sea would wear.',
    brandDnaHeritage: 'Heritage',
    brandDnaHeritageVal: 'Côte d\'Azur — sun-bleached linen, raffia, terracotta tile',
    brandDnaVoice: 'Voice',
    brandDnaVoiceVal: 'Quiet luxury · fluent French · "Côte du Sol"',
    brandDnaValues: 'Values',
    brandDnaValuesVal: 'Heritage materials · slow craft · zero plastic',
    brandDnaRefs: 'Refs',
    brandDnaRefsVal: 'Jacquemus · Khaite · Hereu · La DoubleJ',
    consumerEyebrow: 'Consumer profile · azur woman',
    consumerTitle: 'She summers the same way every year.',
    consumerDemographics: 'Demographics',
    consumerDemographicsVal: 'Women 28–45 · €120–250k HHI · Paris, NYC, Madrid, Milan',
    consumerPsychographics: 'Psychographics',
    consumerPsychographicsVal: 'Heritage-conscious · slow-shopper · post-trend',
    consumerWhereShops: 'Where she shops',
    consumerWhereShopsVal: 'Net-a-Porter · Mytheresa · concept stores in resort towns',
    consumerAvoids: 'What she avoids',
    consumerAvoidsVal: 'Logos · synthetics · anything that follows trends',
    consumerCaption: 'Generated from the brief by aimily — used to lock pricing tier, channel mix, and campaign tone in the next blocks.',
    moodboardEyebrow: 'Moodboard generated · 30 seconds · azur · ss27',
    paletteExtracted: 'Palette extracted',
    paletteSeaFoam: 'Sea Foam',
    paletteLinen: 'Linen',
    paletteTerracotta: 'Terracotta',
    paletteCarbon: 'Carbon',
    paletteCitronella: 'Citronella',
  },
  block2: {
    label: 'Merchandising',
    titleStart: 'From ',
    titleItalic: 'gut feeling',
    titleEnd: ' to a business model.',
    description: 'The block your CFO actually cares about. aimily turns the brand DNA into a range plan: families, SKUs, pricing tiers, channel split, and budget — every line aware of margin, sell-through risk, and production capacity.',
    before: 'An Excel that nobody trusts. Buyers ask for a line sheet, you scramble. The CFO asks for margin per family, you escape the meeting.',
    after: 'A range plan that finance signs in a day. Pricing locked by family. Channel allocation based on consumer signal. Budget reconciled with production capacity.',
    rangePlanEyebrow: 'Range plan · azur · ss27',
    rangePlanTitle: '24 SKUs across 4 families.',
    rangePlanTotalCost: 'Total Cost',
    rangePlanRevenue: 'Revenue forecast',
    rangePlanMargin: 'Avg. margin',
    rangePlanSkus: 'SKUs',
    rangePlanUnits: 'units forecast',
    rangePlanEg: 'e.g.',
    family1Name: 'Skin Linens',
    family2Name: 'Sculpted Knits',
    family3Name: 'Sun Footwear',
    family4Name: 'Marea Objects',
    channelEyebrow: 'Channel allocation',
    channelTitle: 'Where the units go.',
    channel1: 'DTC · azur.com',
    channel2: 'Wholesale · 6 stockists',
    channel3: 'Concept stores · resort towns',
    channel4: 'Pop-up · Cap Ferret',
    channelCaption: 'Driven by the consumer profile — DTC over wholesale because she shops direct, pop-up because she summers in coastal towns.',
    budgetEyebrow: 'Budget · ss27 cycle',
    budgetTitle: 'Reconciled to production.',
    budget1: 'Materials & sampling',
    budget2: 'Production (5 factories)',
    budget3: 'Marketing & launch',
    budget4: 'Logistics & 3PL',
    budgetTotalLabel: 'Total invested',
    budgetCycle: 'of cycle',
    captionFooter: 'Range plan, channel mix and budget all generated by aimily from the brand DNA above. Excel export ready for ERP.',
  },
  block3: {
    label: 'Design & Development',
    titleStart: 'Pixel to ',
    titleItalic: 'pattern',
    titleEnd: ', ready for the factory.',
    description: 'The range plan becomes design briefs. aimily generates technical sketches, applies colorways, builds tech packs the patternmaker can read, and tracks production from sample to delivery — every step linked to the SKU above.',
    before: 'Sketches the factory can\'t read. Tech packs that miss measurements. Three back-and-forth rounds before the first sample lands.',
    after: 'Each SKU comes with a generated sketch, a colorway grid, a tech pack, a BOM and a pin-comment thread. First sample matches the brief.',
    sketchEyebrow: 'Sketch · auto-generated · 4 SKUs',
    renderEyebrow: 'Sketch → 3D render · 60 seconds · colorway applied',
    techPackEyebrow: 'Tech pack · solène · maxi linen dress',
    techPackTitle: 'A3 landscape · factory inbox ready.',
    techPackBadge: 'PDF · annotated · 6 pages',
    measurements: 'Measurements (S)',
    bom: 'Bill of materials',
    pinComments: 'Open pin comments',
    timelineEyebrow: 'Production timeline · 5 factories',
    timelineCaption: '14 weeks · 24 SKUs · 4 drops',
    statusResolved: 'resolved',
    statusOpen: 'open',
  },
  block4: {
    label: 'Marketing & Launch',
    titleStart: 'Sold-out ',
    titleItalic: 'before',
    titleEnd: ' the ribbon-cut.',
    description: 'The collection isn\'t done when it ships — it\'s done when it sells. aimily produces editorials without a photoshoot, schedules drops, plans content per channel, and tracks sales in a single dashboard. Marketing reads from the SKUs above — never from a brief PDF.',
    before: 'Marketing scrambles two weeks before launch. Photographer cancels. Lookbook is rushed. Drop date slips. Pre-orders die in the pipe.',
    after: 'The day a SKU is signed, its editorial is ready. Drop calendar locked across stockists. KPIs live before the launch email goes out.',
    editorialEyebrow: 'Editorial · on-model · no photoshoot',
    dropEyebrow: 'Drop calendar · azur · ss27',
    dropTitle: 'Three drops, locked across stockists.',
    dropSkus: 'SKUs',
    salesEyebrow: 'Sales dashboard · live (mock)',
    salesTitle: 'Did the launch work?',
    salesKpi1: 'Day 1 revenue',
    salesKpi2: 'Sell-through',
    salesKpi3: 'Top SKU',
    salesKpi4: 'Gross margin',
    salesKpi5: 'DTC vs WS',
    salesKpi6: 'Pop-up footfall',
    contentEyebrow: 'Content studio · per SKU · per channel',
    contentTitle: 'One SKU. Every visual format. One click.',
    tier: 'Tier',
  },
  artifacts: {
    eyebrow: 'Every artifact a fashion brand needs',
    titleItalic: 'Production-ready.',
    titleEnd: ' Buyer-ready. Press-ready.',
    techPackTitle: 'Tech Pack PDF',
    techPackDesc: 'A3 landscape, every measurement and BOM, pin-comments threaded by team. Ready for the factory inbox.',
    techPackTag: 'A3 · annotated',
    deckTitle: 'Presentation Deck',
    deckDesc: '21-slide collection deck. 10 themes. PDF export in 3 seconds. Public share link with view counter.',
    deckTag: '21 slides · 10 themes',
    calendarTitle: 'Drop Calendar',
    calendarDesc: '45 milestones across 4 blocks. Cross-block dependencies. Excel export to share with team.',
    calendarTag: 'Gantt · cross-team',
    rangeTitle: 'Range Plan',
    rangeDesc: 'Full SKU grid with PVP/COGS/units/margin. Excel export. Pre-baked for ERP imports.',
    rangeTag: 'XLS · ERP-ready',
    wholesaleTitle: 'Wholesale Order Sheet',
    wholesaleDesc: 'Per-buyer line sheets, drop-by-drop allocations, status tracking from PO to delivery.',
    wholesaleTag: 'Per buyer',
    contentTitle: 'Content Calendar',
    contentDesc: 'Multi-channel campaign plan. Per-SKU 4-tier visual pipeline. Drop coordination built-in.',
    contentTag: 'Multi-channel',
  },
  studionn: {
    eyebrow: 'Built by StudioNN — the fashion agency',
    titleStart: 'We\'re not a startup that ',
    titleItalic1: 'heard about',
    titleMid: ' fashion. We\'re a ',
    titleItalic2: 'fashion agency',
    titleEnd: ' that built a SaaS.',
    p1: 'For three years, StudioNN consulted independent fashion brands across Europe — from emerging designers in Madrid and Barcelona to established houses in Milan and Paris. We watched every team coordinate their collections across 14 spreadsheets, three WhatsApp groups, and a Notion graveyard.',
    p2: 'aimily is the tool we built to fix it. For ourselves, then for everyone.',
    p3: 'Every workflow inside aimily comes from a real production cycle we ran. Every AI prompt was refined by a real designer. Every artifact format matches what factories actually accept and what buyers actually open.',
  },
  finalCta: {
    title: "That's all.",
    subtitle: 'Start a collection in 90 seconds. Free 14 days. No credit card required.',
    button: 'Try aimily free',
  },
  pricing: {
    eyebrow: 'Pricing',
    titleItalic: '14 days',
    titleEnd: ' free. Same models on every plan.',
    subtitle: 'Differentiation by quantity, never by quality.',
    monthly: 'Monthly',
    annual: 'Annual',
    annualSave: '−20%',
    recommended: 'Recommended',
    starterName: 'Starter',
    professionalName: 'Professional',
    proMaxName: 'Pro Max',
    enterpriseName: 'Enterprise',
    starterTagline: 'For solo founders.',
    professionalTagline: 'For teams shipping multiple drops.',
    proMaxTagline: 'For studios at peak creative pace.',
    enterpriseTagline: 'For consolidated brands.',
    perMonth: '/mo',
    perYear: '€{price}/year',
    customPrice: 'Custom',
    customFrom: 'From €3,000/mo',
    imagery: 'Imagery',
    seats: 'Users',
    unlimited: 'Unlimited',
    ctaStart: 'Start free',
    ctaContact: 'Contact sales',
    ctaCurrent: 'Current plan',
    h: {
      starter1: 'Unlimited brands & collections',
      starter2: 'All 28 aimily models',
      starter3: 'Top quality AI on every render',
      starter4: 'Email support',
      pro1: 'Everything in Starter',
      pro2: 'Video generation (Kling 2.1)',
      pro3: 'Priority email support',
      pro4: 'Roles, permissions & collaboration',
      proMax1: 'Everything in Professional',
      proMax2: '5× more imagery / month',
      proMax3: 'Priority support + setup call',
      proMax4: 'Top-up packs at volume discount',
      ent1: 'Custom imagery & seats',
      ent2: 'SSO + API access',
      ent3: 'Custom integrations',
      ent4: 'Dedicated onboarding (3 sessions)',
    },
    topupsEyebrow: 'Top-ups',
    topupsTitle: 'More imagery whenever you need it.',
    topupsBuy: 'Buy',
    whatCounts: 'What counts as one imagery?',
    countSketch: 'Sketch from photo',
    countColorize: 'Colorize / 3D render',
    countEditorial: 'Editorial with model',
    countStillLife: 'Still life / try-on',
    countVisualRefs: 'Visual references (×4)',
    countVideo: 'Kling Pro video',
    countText: 'Text generation',
    countResearch: 'Research / analysis',
    countFree: 'free',
    countImg: '{n} img',
    footerNote: 'Prices excl. VAT · 14 days free, no credit card',
    manage: 'Manage my subscription',
  },
};

// ═════════════════════════════════════ ES ═════════════════════════════════════
const es: HomeDict = {
  hero: { scrollCue: 'Descubrir' },
  meet: {
    eyebrow: 'Conoce aimily',
    titleLine1: 'La asistente IA',
    titleLine2Italic: 'que Miranda habría contratado.',
    subtitle: 'Una plataforma lleva una idea de moda desde el primer moodboard hasta el sold-out. ADN de marca. Range plan. Tech packs. Campañas. Cada bloque, conectado.',
    cta: 'Empieza tu colección — 14 días gratis',
    noCard: 'Sin tarjeta de crédito',
    scrollCue: 'Ver el recorrido',
  },
  silogism: {
    eyebrow: 'El Diablo Viste de Prada · 2006 → 2026',
    titleA: 'Emily lo hacía ',
    titleAItalic: 'a mano',
    titleAEnd: '.',
    titleB: 'aimily lo hace ',
    titleBItalic: 'en segundos',
    titleBEnd: '.',
    emilyDate: '2006 · Emily',
    emilyText: 'Una asistente que nunca dormía. Coordinaba proveedores. Seguía muestras. Gestionaba la agenda de Miranda. Sostenía la oficina con cafeína, instinto y elegancia.',
    emilyCaption: 'Lo hacía todo en la moda — agotada, explotada, limitada.',
    aimilyDate: '2026 · aimily',
    aimilyText: 'Una asistente IA que nunca duerme. Genera moodboards. Construye range plans. Redacta campañas. Lleva una colección de la chispa al lanzamiento — en cada bloque del negocio.',
    aimilyCaption: 'Hace lo mismo — a escala, en segundos, sin agotarse jamás.',
    quoteLine1: '"Miranda necesitaba a Emily.',
    quoteLine2: 'Tú necesitas aimily."',
  },
  problem: {
    eyebrow: 'El problema',
    titleStart: 'Hoy, la moda funciona con ',
    titleItalic: '14 hojas de cálculo',
    titleEnd: ', un director creativo y un rezo.',
    subtitle: 'El brief de marca vive en Notion. El range plan en Excel. El tech pack en PDF. El calendario de drops en Google Calendar. La campaña en InDesign. Nada se habla con nada. La información camina por la oficina.',
    statSpreadsheets: 'hojas de cálculo',
    statEmails: 'emails al día',
    statApps: 'apps que abrir',
    statTuesdays: 'martes 2 am',
  },
  thread: {
    eyebrow: 'Tira del hilo',
    titleStart: 'De una ',
    titleItalic1: 'chispa',
    titleMid: ' en tu cabeza a un drop ',
    titleItalic2: 'sold-out',
    titleEnd: '.',
    subtitle: 'Cuatro bloques, una plataforma. Una visión se convierte en un ADN de marca. El ADN en range plan. El plan en tech packs. Los packs en fotos de producto. Las fotos en un lanzamiento. Cada bloque lee del anterior — nada se reescribe.',
    step1Label: 'Creativo y Marca',
    step1Title: 'Codifica la visión',
    step1Outputs: 'ADN de marca · Perfil de consumidor · Moodboard · Señal de tendencia',
    step1Stat: '3 semanas → 1 hora',
    step2Label: 'Merchandising',
    step2Title: 'Conviértelo en negocio',
    step2Outputs: 'Range plan · Estrategia de precios · Mix de canales · Presupuesto',
    step2Stat: 'Listo para CFO en 1 día',
    step3Label: 'Diseño y Desarrollo',
    step3Title: 'Llévalo a fábrica',
    step3Outputs: 'Sketches · Colorways · Tech packs · Timeline de producción',
    step3Stat: '6 semanas → 6 días',
    step4Label: 'Marketing y Lanzamiento',
    step4Title: 'Véndelo antes del lanzamiento',
    step4Outputs: 'Editoriales · Calendario de drops · GTM · Dashboard de ventas',
    step4Stat: 'Sold-out antes del corte de cinta',
    captionStart: 'Debajo: el mismo hilo tirado de principio a fin, usando ',
    captionAzur: 'AZUR · SS27',
    captionEnd: ' — una colección resort mediterránea real, generada end-to-end dentro de aimily.',
  },
  blocks: {
    beforeAimily: 'Antes de aimily',
    withAimily: 'Con aimily',
  },
  block1: {
    label: 'Creativo y Marca',
    titleStart: 'Empieza con una ',
    titleItalic: 'visión',
    titleEnd: ', no con una hoja de cálculo.',
    description: 'Escribe el brief. aimily extrae el ADN de marca, construye el perfil de consumidor, genera un moodboard curado y captura señales de tendencia desde redes sociales en vivo — para que cada output downstream hable el mismo idioma.',
    before: 'Tres semanas de reuniones creativas. PDFs que nadie lee. Una dirección creativa que vive en la cabeza de un solo diseñador.',
    after: 'Visión codificada en 60 minutos. ADN de marca, consumidor objetivo, paleta de color y referencias — todo guardado, todo consultable, todo reutilizado por cada bloque.',
    brandDnaEyebrow: 'ADN · azur',
    brandDnaTitle: 'Vístete como el mar.',
    brandDnaHeritage: 'Heritage',
    brandDnaHeritageVal: 'Côte d\'Azur — lino curtido al sol, rafia, terracota',
    brandDnaVoice: 'Voz',
    brandDnaVoiceVal: 'Lujo silencioso · francés fluido · "Côte du Sol"',
    brandDnaValues: 'Valores',
    brandDnaValuesVal: 'Materiales heritage · slow craft · cero plástico',
    brandDnaRefs: 'Refs',
    brandDnaRefsVal: 'Jacquemus · Khaite · Hereu · La DoubleJ',
    consumerEyebrow: 'Perfil de consumidor · azur woman',
    consumerTitle: 'Veranea igual cada año.',
    consumerDemographics: 'Demografía',
    consumerDemographicsVal: 'Mujeres 28–45 · 120–250k€ HHI · París, NYC, Madrid, Milán',
    consumerPsychographics: 'Psicografía',
    consumerPsychographicsVal: 'Heritage-conscious · slow-shopper · post-tendencia',
    consumerWhereShops: 'Dónde compra',
    consumerWhereShopsVal: 'Net-a-Porter · Mytheresa · concept stores en pueblos resort',
    consumerAvoids: 'Lo que evita',
    consumerAvoidsVal: 'Logos · sintéticos · cualquier cosa que siga tendencias',
    consumerCaption: 'Generado del brief por aimily — usado para cerrar tier de precios, mix de canales y tono de campaña en los siguientes bloques.',
    moodboardEyebrow: 'Moodboard generado · 30 segundos · azur · ss27',
    paletteExtracted: 'Paleta extraída',
    paletteSeaFoam: 'Sea Foam',
    paletteLinen: 'Linen',
    paletteTerracotta: 'Terracota',
    paletteCarbon: 'Carbon',
    paletteCitronella: 'Citronella',
  },
  block2: {
    label: 'Merchandising',
    titleStart: 'Del ',
    titleItalic: 'instinto',
    titleEnd: ' al modelo de negocio.',
    description: 'El bloque que tu CFO de verdad cuida. aimily convierte el ADN de marca en un range plan: familias, SKUs, tiers de precio, mix de canales y presupuesto — cada línea consciente del margen, riesgo de sell-through y capacidad de producción.',
    before: 'Un Excel que nadie se cree. Los buyers piden un line sheet, te peleas. El CFO pide margen por familia, escapas de la reunión.',
    after: 'Un range plan que finanzas firma en un día. Precios cerrados por familia. Asignación de canales basada en señal de consumidor. Presupuesto reconciliado con capacidad productiva.',
    rangePlanEyebrow: 'Range plan · azur · ss27',
    rangePlanTitle: '24 SKUs en 4 familias.',
    rangePlanTotalCost: 'Coste total',
    rangePlanRevenue: 'Forecast de ingresos',
    rangePlanMargin: 'Margen medio',
    rangePlanSkus: 'SKUs',
    rangePlanUnits: 'unidades forecast',
    rangePlanEg: 'p.ej.',
    family1Name: 'Skin Linens',
    family2Name: 'Sculpted Knits',
    family3Name: 'Sun Footwear',
    family4Name: 'Marea Objects',
    channelEyebrow: 'Asignación de canales',
    channelTitle: 'Dónde van las unidades.',
    channel1: 'DTC · azur.com',
    channel2: 'Wholesale · 6 stockists',
    channel3: 'Concept stores · pueblos resort',
    channel4: 'Pop-up · Cap Ferret',
    channelCaption: 'Dirigido por el perfil de consumidor — DTC sobre wholesale porque compra directo, pop-up porque veranea en pueblos costeros.',
    budgetEyebrow: 'Presupuesto · ciclo ss27',
    budgetTitle: 'Reconciliado con producción.',
    budget1: 'Materiales y muestreo',
    budget2: 'Producción (5 fábricas)',
    budget3: 'Marketing y lanzamiento',
    budget4: 'Logística y 3PL',
    budgetTotalLabel: 'Total invertido',
    budgetCycle: 'del ciclo',
    captionFooter: 'Range plan, mix de canales y presupuesto generados por aimily desde el ADN de marca de arriba. Export Excel listo para ERP.',
  },
  block3: {
    label: 'Diseño y Desarrollo',
    titleStart: 'Del píxel al ',
    titleItalic: 'patrón',
    titleEnd: ', listo para fábrica.',
    description: 'El range plan se convierte en briefs de diseño. aimily genera sketches técnicos, aplica colorways, construye tech packs que el patronista puede leer y trackea producción de muestra a entrega — cada paso enlazado al SKU de arriba.',
    before: 'Sketches que la fábrica no entiende. Tech packs sin medidas. Tres rondas de ida y vuelta antes de la primera muestra.',
    after: 'Cada SKU viene con sketch generado, grid de colorways, tech pack, BOM e hilo de pin-comments. La primera muestra coincide con el brief.',
    sketchEyebrow: 'Sketch · auto-generado · 4 SKUs',
    renderEyebrow: 'Sketch → render 3D · 60 segundos · colorway aplicado',
    techPackEyebrow: 'Tech pack · solène · vestido maxi de lino',
    techPackTitle: 'A3 horizontal · listo para inbox de fábrica.',
    techPackBadge: 'PDF · anotado · 6 páginas',
    measurements: 'Medidas (S)',
    bom: 'Bill of materials',
    pinComments: 'Pin comments abiertos',
    timelineEyebrow: 'Timeline de producción · 5 fábricas',
    timelineCaption: '14 semanas · 24 SKUs · 4 drops',
    statusResolved: 'resuelto',
    statusOpen: 'abierto',
  },
  block4: {
    label: 'Marketing y Lanzamiento',
    titleStart: 'Sold-out ',
    titleItalic: 'antes',
    titleEnd: ' del corte de cinta.',
    description: 'La colección no termina cuando se envía — termina cuando se vende. aimily produce editoriales sin photoshoot, programa drops, planifica contenido por canal y trackea ventas en un único dashboard. Marketing lee de los SKUs de arriba — nunca de un brief en PDF.',
    before: 'Marketing improvisa dos semanas antes del lanzamiento. El fotógrafo cancela. El lookbook va con prisa. La fecha del drop se mueve. Las pre-orders mueren en el pipe.',
    after: 'El día que se firma un SKU, su editorial está listo. Calendario de drops cerrado en todos los stockists. KPIs en vivo antes de que salga el email del lanzamiento.',
    editorialEyebrow: 'Editorial · on-model · sin photoshoot',
    dropEyebrow: 'Calendario de drops · azur · ss27',
    dropTitle: 'Tres drops, cerrados en todos los stockists.',
    dropSkus: 'SKUs',
    salesEyebrow: 'Dashboard de ventas · live (mock)',
    salesTitle: '¿Funcionó el lanzamiento?',
    salesKpi1: 'Revenue día 1',
    salesKpi2: 'Sell-through',
    salesKpi3: 'SKU top',
    salesKpi4: 'Margen bruto',
    salesKpi5: 'DTC vs WS',
    salesKpi6: 'Footfall pop-up',
    contentEyebrow: 'Content studio · por SKU · por canal',
    contentTitle: 'Un SKU. Cada formato visual. Un click.',
    tier: 'Tier',
  },
  artifacts: {
    eyebrow: 'Cada artefacto que necesita una marca de moda',
    titleItalic: 'Listo para producción.',
    titleEnd: ' Listo para buyers. Listo para prensa.',
    techPackTitle: 'Tech Pack PDF',
    techPackDesc: 'A3 horizontal, cada medida y BOM, pin-comments threaded por equipo. Listo para el inbox de fábrica.',
    techPackTag: 'A3 · anotado',
    deckTitle: 'Presentación',
    deckDesc: 'Deck de colección de 21 slides. 10 temas. Export a PDF en 3 segundos. Share link público con contador de vistas.',
    deckTag: '21 slides · 10 temas',
    calendarTitle: 'Calendario de Drops',
    calendarDesc: '45 milestones en 4 bloques. Dependencias cross-bloque. Export Excel para compartir con el equipo.',
    calendarTag: 'Gantt · cross-team',
    rangeTitle: 'Range Plan',
    rangeDesc: 'Grid completo de SKUs con PVP/COGS/unidades/margen. Export Excel. Pre-cocinado para imports a ERP.',
    rangeTag: 'XLS · ERP-ready',
    wholesaleTitle: 'Hoja de Pedido Wholesale',
    wholesaleDesc: 'Line sheets por buyer, asignaciones drop por drop, tracking de estado de PO a entrega.',
    wholesaleTag: 'Por buyer',
    contentTitle: 'Calendario de Contenido',
    contentDesc: 'Plan de campaña multi-canal. Pipeline visual 4-tier por SKU. Coordinación de drops integrada.',
    contentTag: 'Multi-canal',
  },
  studionn: {
    eyebrow: 'Construido por StudioNN — la agencia de moda',
    titleStart: 'No somos una startup que ',
    titleItalic1: 'oyó hablar',
    titleMid: ' de moda. Somos una ',
    titleItalic2: 'agencia de moda',
    titleEnd: ' que construyó un SaaS.',
    p1: 'Durante tres años, StudioNN consultó a marcas de moda independientes en Europa — desde diseñadores emergentes en Madrid y Barcelona hasta casas establecidas en Milán y París. Vimos cómo cada equipo coordinaba sus colecciones con 14 hojas de cálculo, tres grupos de WhatsApp y un cementerio de Notion.',
    p2: 'aimily es la herramienta que construimos para arreglarlo. Para nosotros, después para todos.',
    p3: 'Cada workflow dentro de aimily viene de un ciclo de producción real que ejecutamos. Cada prompt de IA fue refinado por un diseñador real. Cada formato de artefacto coincide con lo que las fábricas aceptan y lo que los buyers abren.',
  },
  finalCta: {
    title: 'Eso es todo.',
    subtitle: 'Empieza una colección en 90 segundos. 14 días gratis. Sin tarjeta de crédito.',
    button: 'Prueba aimily gratis',
  },
  pricing: {
    eyebrow: 'Precios',
    titleItalic: '14 días',
    titleEnd: ' gratis. Mismos modelos en cada plan.',
    subtitle: 'La diferencia es la cantidad, nunca la calidad.',
    monthly: 'Mensual',
    annual: 'Anual',
    annualSave: '−20%',
    recommended: 'Recomendado',
    starterName: 'Starter',
    professionalName: 'Professional',
    proMaxName: 'Pro Max',
    enterpriseName: 'Enterprise',
    starterTagline: 'Para fundadores en solitario.',
    professionalTagline: 'Para equipos que lanzan múltiples drops.',
    proMaxTagline: 'Para estudios al máximo ritmo creativo.',
    enterpriseTagline: 'Para marcas consolidadas.',
    perMonth: '/mes',
    perYear: '{price}€/año',
    customPrice: 'A medida',
    customFrom: 'Desde 3.000€/mes',
    imagery: 'Imagery',
    seats: 'Usuarios',
    unlimited: 'Ilimitado',
    ctaStart: 'Empezar gratis',
    ctaContact: 'Contactar ventas',
    ctaCurrent: 'Plan actual',
    h: {
      starter1: 'Marcas y colecciones ilimitadas',
      starter2: 'Los 28 modelos aimily',
      starter3: 'Calidad IA máxima en cada render',
      starter4: 'Soporte por email',
      pro1: 'Todo lo de Starter',
      pro2: 'Generación de vídeo (Kling 2.1)',
      pro3: 'Soporte email prioritario',
      pro4: 'Roles, permisos y colaboración',
      proMax1: 'Todo lo de Professional',
      proMax2: '5× más imagery / mes',
      proMax3: 'Soporte prioritario + setup call',
      proMax4: 'Packs de top-up con descuento',
      ent1: 'Imagery y asientos a medida',
      ent2: 'SSO + acceso API',
      ent3: 'Integraciones a medida',
      ent4: 'Onboarding dedicado (3 sesiones)',
    },
    topupsEyebrow: 'Top-ups',
    topupsTitle: 'Más imagery cuando lo necesites.',
    topupsBuy: 'Comprar',
    whatCounts: '¿Qué cuenta como una imagery?',
    countSketch: 'Sketch desde foto',
    countColorize: 'Colorize / render 3D',
    countEditorial: 'Editorial con modelo',
    countStillLife: 'Still life / try-on',
    countVisualRefs: 'Referencias visuales (×4)',
    countVideo: 'Vídeo Kling Pro',
    countText: 'Generación de texto',
    countResearch: 'Investigación / análisis',
    countFree: 'gratis',
    countImg: '{n} img',
    footerNote: 'Precios sin IVA · 14 días gratis sin tarjeta',
    manage: 'Gestionar mi suscripción',
  },
};

// Mapping — only EN and ES defined explicitly. Other locales fall back
// to EN at runtime via the hook below. Felipe (or future agent) can
// translate fr/it/de/pt/nl/sv/no by adding entries here.
const homeTranslations: Partial<Record<Language, HomeDict>> = { en, es };

export function useHomeTranslation(): HomeDict {
  const { language } = useLanguage();
  return homeTranslations[language] ?? en;
}
