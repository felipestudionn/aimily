/**
 * Aimily Assistant — knowledge base
 *
 * Logic-first, not GPS. We do NOT explain "click the red button on the top right".
 * The buttons are visible. We explain the WHY: what this slot thinks about, what
 * decision it captures, what feeds it, what flows out, how it connects to the
 * other 19 slots in the spine.
 *
 * Source of truth for IDs: src/components/wizard/WizardSidebar.tsx → SIDEBAR_BLOCKS.
 * If an ID changes there, fix it here too. The Rubik's-cube alignment is the UX.
 */

export type KnowledgeCategory =
  | 'philosophy'      // why aimily exists, the 4×5 spine, CIS, the cube
  | 'block'           // one of the 4 macro phases
  | 'mini_block'      // one of the 20 slots
  | 'concept'         // fashion industry term explained for outsiders
  | 'flow'            // how block A feeds block B
  | 'admin';          // billing, plans, account, support

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  /** Block coordinate when applicable, e.g. "01", "02.3" */
  coord?: string;
  /** Title shown in suggestions / cited in answers */
  title: string;
  /** Internal route — never invented. Pulled from SIDEBAR_BLOCKS.route. */
  route?: string;
  /** 1–2 sentences. The elevator pitch of this slot or concept. */
  short: string;
  /** The WHY. What decision this captures, what mental model it carries. 2–4 sentences. */
  the_logic: string;
  /** What feeds into this slot — names of upstream slots or external inputs. */
  inputs?: string[];
  /** What this slot produces — names of downstream slots or outputs. */
  outputs?: string[];
  /** IDs of related entries the assistant may want to cite. */
  related?: string[];
  /** Optional fashion-industry term tied to this entry. */
  fashion_concept?: string;
}

/* ──────────────────────────────────────────────────────────────────
   PHILOSOPHY — why aimily exists, the spine, the cube
   ────────────────────────────────────────────────────────────────── */

const PHILOSOPHY: KnowledgeEntry[] = [
  {
    id: 'aimily-overview',
    category: 'philosophy',
    title: 'What aimily is',
    short:
      'aimily takes a fashion idea from the spark of a moodboard to a sold-out launch. One platform, four blocks, every decision connected.',
    the_logic:
      'Indie brands and emerging designers stitch their workflow together with Excel for the range plan, PowerPoint for the brand book, Notion for tech packs, Photoshop for renders, Mailchimp for launch — and lose the through-line. aimily is one continuous spine: every input in Block 01 (Creative) shapes Block 02 (Merchandising), feeds Block 03 (Design & Development), and lands in Block 04 (Marketing & Sales). The platform remembers your decisions so you don\'t repeat yourself.',
  },
  {
    id: 'the-rubiks-cube',
    category: 'philosophy',
    title: 'The Rubik\'s cube — 4 blocks × 5 mini-blocks',
    short:
      'aimily is one spine of 4 blocks × 5 mini-blocks = 20 slots. The sidebar never changes; only the right-hand body morphs into Work, Calendar or Presentation.',
    the_logic:
      'The same 20 slots show up everywhere: as workspaces (Work mode), as horizontal timeline tracks (Calendar mode), as 21 slides (Presentation mode — Cover + 20). When you build a collection in Work mode and then click Presentation, you don\'t generate slides — they are already there, populated from your decisions. That is the cube: one mental model, three faces, zero duplication.',
    related: ['aimily-overview', 'cis', 'block-01', 'block-02', 'block-03', 'block-04'],
  },
  {
    id: 'cis',
    category: 'philosophy',
    title: 'CIS — Collection Intelligence System',
    short:
      'Every meaningful decision you make is recorded as a fact. The next slot reads those facts; the AI reads them too. You never re-explain who your consumer is.',
    the_logic:
      'CIS is the database under everything. When you write your consumer definition in 01.1, it lands as a fact tagged "creative.consumer.target". When the merchandising AI generates families in 02.2, it reads that fact instead of asking you again. This is why the right answer in aimily is rarely "where do I configure that" — it is "what decision are you trying to capture". Capture it once; it propagates.',
    related: ['the-rubiks-cube', 'aimily-overview'],
  },
  {
    id: 'why-blocks-not-features',
    category: 'philosophy',
    title: 'Why aimily is organised by phases of work, not by "features"',
    short:
      'The 4 blocks mirror how a real fashion collection actually moves: Creative → Merchandising → Design → Marketing. Not a feature list — a workflow.',
    the_logic:
      'Most SaaS gives you tools. aimily gives you a sequence. Block 01 makes you decide what story you are telling. Block 02 makes you decide what you are selling and to whom. Block 03 makes you build it. Block 04 makes you sell it. If you skip a block, the next one doesn\'t have what it needs. The order is the value.',
    related: ['the-rubiks-cube', 'block-01', 'block-02', 'block-03', 'block-04'],
  },
  {
    id: 'aimily-vs-excel',
    category: 'philosophy',
    title: 'Why aimily replaces Excel + PowerPoint + tutorials',
    short:
      'Excel doesn\'t teach you what a range plan is. PowerPoint doesn\'t know your moodboard. YouTube tutorials are someone else\'s workflow. aimily is yours, narrated by a teacher who lives inside it.',
    the_logic:
      'A spreadsheet asks "how many SKUs and at what price". aimily asks "what is your retail strategy, what does that imply for tier mix, what does that imply for the family count". The math is a side effect of the conversation. That is also why this assistant exists — to be the teacher inside the tool, so you don\'t leave to find a YouTube channel that almost answers your question.',
    related: ['aimily-overview', 'cis'],
  },
];

/* ──────────────────────────────────────────────────────────────────
   BLOCKS — high-level logic per macro phase
   ────────────────────────────────────────────────────────────────── */

const BLOCKS: KnowledgeEntry[] = [
  {
    id: 'block-01',
    category: 'block',
    coord: '01',
    title: 'Block 01 · Creative & Brand Direction',
    route: '/collection/[id]/creative',
    short:
      'The story before the spreadsheet. Who is this collection for, what world does it inhabit, what does the brand sound like.',
    the_logic:
      'Block 01 captures the irrational layer: consumer, moodboard, research, brand identity. Without these, every later decision is arbitrary. Skip Block 01 and your range plan becomes a list of products instead of a collection. The output is a creative brief that the merchandising AI uses to make its first proposal.',
    outputs: ['creative-overview', 'block-02'],
    related: ['mini-consumer', 'mini-moodboard', 'mini-research', 'mini-brand-identity', 'mini-creative-overview'],
  },
  {
    id: 'block-02',
    category: 'block',
    coord: '02',
    title: 'Block 02 · Merchandising & Planning',
    route: '/collection/[id]/merchandising',
    short:
      'What you sell, to whom, at what price, in what mix. The block that turns a brand vision into a plan that lands.',
    the_logic:
      'Block 02 answers four questions in order: which buying strategy (anchor + scenario), which families and prices (assortment), which channels and markets (distribution), which financial frame (sales target, margin, discounts). At the end, Collection Builder materialises the SKU grid — the atoms of everything that comes next.',
    inputs: ['block-01'],
    outputs: ['collection-builder', 'block-03'],
    related: ['mini-buying-strategy', 'mini-assortment-pricing', 'mini-distribution', 'mini-financial-plan', 'mini-collection-builder'],
  },
  {
    id: 'block-03',
    category: 'block',
    coord: '03',
    title: 'Block 03 · Design & Development',
    route: '/collection/[id]/product',
    short:
      'From plan to physical product. Sketch → Color & Materials → 3D Render → Tech Pack → Prototype → Production → Final Selection.',
    the_logic:
      'Block 03 is where each SKU from the Builder grows up. The 6-step EvolutionStrip is the canonical lifecycle: nothing skips ahead. Sketch precedes color because shape decides palette. Tech pack consolidates everything for the factory. Prototyping is where reality pushes back. Final Selection is the moment you lock the collection — only approved SKUs go to Block 04.',
    inputs: ['block-02', 'collection-builder'],
    outputs: ['final-selection', 'block-04'],
    related: ['mini-sketch-color', 'mini-tech-pack', 'mini-prototyping', 'mini-production', 'mini-final-selection'],
  },
  {
    id: 'block-04',
    category: 'block',
    coord: '04',
    title: 'Block 04 · Marketing & Sales',
    route: '/collection/[id]/marketing/creation',
    short:
      'Take the locked collection to market. GTM, content, communications, sales dashboard, point of sale.',
    the_logic:
      'Block 04 is downstream of everything: it reads the consumer from Block 01, the merchandising frame from Block 02, the locked SKUs from Block 03 — and it produces the launch. Content Studio generates per-SKU visuals at four levels (e-commerce, still life, editorial, campaign). GTM & Launch Plan sequences the drops. Sales Dashboard is the only block that lights up after launch — it tracks what actually happened.',
    inputs: ['block-03', 'final-selection'],
    related: ['mini-gtm-launch', 'mini-content-studio', 'mini-communications', 'mini-sales-dashboard', 'mini-point-of-sale'],
  },
];

/* ──────────────────────────────────────────────────────────────────
   MINI-BLOCKS — the 20 slots
   ────────────────────────────────────────────────────────────────── */

const MINI_BLOCKS: KnowledgeEntry[] = [
  /* ── Block 01 ───────────────────────────────────────────────── */
  {
    id: 'mini-consumer',
    category: 'mini_block',
    coord: '01.1',
    title: 'Consumer Definition',
    route: '/collection/[id]/creative?block=consumer',
    short: 'Who you are designing for. Not a persona doc — a sharp portrait that the rest of aimily uses as a compass.',
    the_logic:
      'Three modes: Free (write yourself), Assisted (guided fields), AI Proposal (Aimily proposes from a brief). The output lands in CIS as creative.consumer and is read by the merchandising AI when it proposes families and prices, and by the marketing AI when it writes copy. The consumer is the first decision; everything else triangulates from here.',
    outputs: ['mini-moodboard', 'mini-brand-identity', 'block-02'],
    related: ['block-01', 'cis'],
  },
  {
    id: 'mini-moodboard',
    category: 'mini_block',
    coord: '01.2',
    title: 'Moodboard & Research',
    route: '/collection/[id]/creative?block=moodboard',
    short: 'The visual atmosphere of the collection. Reference images, palettes, fabric swatches anchored to the season.',
    the_logic:
      'Moodboard is not decoration — it is a contract. Anything that does not match the moodboard does not belong in the collection. Upload references, ingest from Pinterest, organise into themes. The board is reused in tech packs (mood pages), in the Presentation deck (mood slide), and as a style reference for AI image generation in Block 04.',
    inputs: ['mini-consumer'],
    outputs: ['mini-brand-identity', 'mini-content-studio'],
    related: ['block-01'],
  },
  {
    id: 'mini-research',
    category: 'mini_block',
    coord: '01.3',
    title: 'Market Research',
    route: '/collection/[id]/creative?block=research',
    short: 'Four lenses to read the market: Global Trends, Deep Dive, Live Signals, Competitors. Each captures a different kind of evidence.',
    the_logic:
      'Global Trends is the macro story (silhouettes, palettes, attitudes for the season). Deep Dive is targeted research on a question you have. Live Signals reads what is happening right now (TikTok, retail visits, search queries). Competitors maps who else is in your lane and how they are playing it. Together they prevent the collection from being designed in a vacuum.',
    inputs: ['mini-consumer'],
    outputs: ['mini-creative-overview', 'block-02'],
    related: ['block-01'],
  },
  {
    id: 'mini-brand-identity',
    category: 'mini_block',
    coord: '01.4',
    title: 'Brand Identity',
    route: '/collection/[id]/creative?block=brand-dna',
    short: 'A bento board of logo, palette, voice, typography, visual identity, mockups and applications. The brand expressed across surfaces.',
    the_logic:
      'Brand Identity is the CIS\'s most-read fact set. Voice fuels every piece of copy in Block 04. Palette tints every slide in Presentation. Typography decides the deck templates. Logo and mockups land in tech packs and packaging. Treat this slot as the single source of brand truth — everything else borrows from it.',
    inputs: ['mini-consumer', 'mini-moodboard'],
    outputs: ['mini-creative-overview', 'mini-communications', 'mini-content-studio'],
    related: ['block-01'],
  },
  {
    id: 'mini-creative-overview',
    category: 'mini_block',
    coord: '01.5',
    title: 'Creative Overview',
    route: '/collection/[id]/creative?block=synthesis',
    short: 'The synthesis output of Block 01. The creative brief that Block 02 will read first.',
    the_logic:
      'Creative Overview is the only mini-block in 01 that does not capture new input. It reads everything from 01.1–01.4 and renders the consolidated creative brief. If a slot is empty, the brief shows it as missing. This is where you check that the story is coherent before you spend a euro on production.',
    inputs: ['mini-consumer', 'mini-moodboard', 'mini-research', 'mini-brand-identity'],
    outputs: ['block-02'],
    related: ['block-01'],
  },

  /* ── Block 02 ───────────────────────────────────────────────── */
  {
    id: 'mini-buying-strategy',
    category: 'mini_block',
    coord: '02.1',
    title: 'Buying Strategy',
    route: '/collection/[id]/merchandising?block=scenarios',
    short: 'Two anchor cards (revenue & strategic) plus three scenarios (A/B/C). Aimily proposes scenarios you adapt or replace.',
    the_logic:
      'Buying strategy is "how aggressive are we and where". Scenario A might be safe (mostly REVENUE tier), Scenario B balanced, Scenario C bold (more IMAGEN tier, fewer SKUs). The AI proposes scenarios from the creative brief and the financial frame. The scenario you pick becomes the constraint that 02.2, 02.3 and 02.4 honour.',
    inputs: ['mini-creative-overview'],
    outputs: ['mini-assortment-pricing', 'mini-distribution', 'mini-financial-plan'],
    related: ['block-02', 'concept-tier-system', 'concept-anchor-card'],
  },
  {
    id: 'mini-assortment-pricing',
    category: 'mini_block',
    coord: '02.2',
    title: 'Assortment & Pricing',
    route: '/collection/[id]/merchandising?block=families',
    short: 'Families and subcategories, with min/max price ranges and unit counts per family. The shape of what you will design.',
    the_logic:
      'A family is a thematic group of products (e.g. "Tailoring", "Knits"). Inside a family you set price min/max and unit count. The AI proposes a family mix from the buying strategy; you adjust. This decides how many SKUs Block 03 will design and at what price points Block 04 will sell. Get this wrong and the rest of the collection works against you.',
    inputs: ['mini-buying-strategy'],
    outputs: ['mini-collection-builder'],
    related: ['block-02', 'concept-family', 'concept-tier-system'],
  },
  {
    id: 'mini-distribution',
    category: 'mini_block',
    coord: '02.3',
    title: 'Distribution',
    route: '/collection/[id]/merchandising?block=channels',
    short: 'Where you sell: DTC vs Wholesale × Digital vs Physical × Markets. Channels carry different margins and different rules.',
    the_logic:
      'Distribution decides the retail price math. Wholesale takes ~50% — your retail price has to absorb that. Physical retail wants size runs; digital DTC tolerates shorter runs. Choosing channels also decides which markets you ship to, which decides duties and translations. The marketing block reads this slot to know where the launch lands.',
    inputs: ['mini-buying-strategy'],
    outputs: ['mini-financial-plan', 'mini-gtm-launch', 'mini-point-of-sale'],
    related: ['block-02', 'concept-dtc-vs-wholesale'],
  },
  {
    id: 'mini-financial-plan',
    category: 'mini_block',
    coord: '02.4',
    title: 'Financial Plan',
    route: '/collection/[id]/merchandising?block=budget',
    short: 'Sales target, target margin, expected discount rate, type segmentation. The collection\'s financial constitution.',
    the_logic:
      'This is not a P&L — it is the four levers that govern every later cost decision. Target margin sets the wholesale/retail math. Discount expectation pre-bakes markdown into pricing. Type segmentation splits revenue across REVENUE / IMAGEN / ENTRY tiers. The Final Selection workspace in Block 03 uses these targets to flag when your locked collection drifts off-plan.',
    inputs: ['mini-buying-strategy', 'mini-distribution'],
    outputs: ['mini-collection-builder', 'mini-final-selection'],
    related: ['block-02', 'concept-gross-margin', 'concept-tier-system'],
  },
  {
    id: 'mini-collection-builder',
    category: 'mini_block',
    coord: '02.5',
    title: 'Collection Builder',
    route: '/collection/[id]/product',
    short: 'The materialisation step. The plan from 02.1–02.4 becomes a real SKU grid you can design.',
    the_logic:
      'Collection Builder reads the families, prices, channels and financial plan and generates the SKU rows: name, family, target tier, target price, drop assignment. Each card is a flip card — visual front, finance back. From here every SKU is the atom of Block 03. Until you build, Block 03 has nothing to design.',
    inputs: ['mini-assortment-pricing', 'mini-distribution', 'mini-financial-plan'],
    outputs: ['block-03', 'mini-sketch-color'],
    related: ['block-02', 'concept-sku', 'concept-drop'],
  },

  /* ── Block 03 ───────────────────────────────────────────────── */
  {
    id: 'mini-sketch-color',
    category: 'mini_block',
    coord: '03.1',
    title: 'Sketch & Color',
    route: '/collection/[id]/product?phase=sketch',
    short: 'For each SKU: a sketch (front + top view), then colorways and material zones. Shape first, palette second.',
    the_logic:
      'Sketch precedes color because the silhouette is the irreversible decision. AI can colorize a sketch you upload, generate colorways from the brand palette, propose material zones. The point of this slot is to lock visual identity before tech pack — once the sketch is right, the tech pack is mostly mechanical.',
    inputs: ['mini-collection-builder', 'mini-brand-identity'],
    outputs: ['mini-tech-pack'],
    related: ['block-03', 'concept-sku', 'concept-evolution-strip'],
  },
  {
    id: 'mini-tech-pack',
    category: 'mini_block',
    coord: '03.2',
    title: 'Tech Pack',
    route: '/collection/[id]/product?phase=techpack',
    short: 'The factory document per SKU: specs, measurements, BOM, materials, suppliers, factory. Everything a manufacturer needs.',
    the_logic:
      'A tech pack is what you hand to a factory so they can quote and produce without asking 50 follow-up questions. aimily generates measurements and BOM from the sketch, you adjust, and the document exports as A3 landscape PDF with pin comments. The tech pack is also where the supplier and factory directories live — these names follow the SKU into Production.',
    inputs: ['mini-sketch-color'],
    outputs: ['mini-prototyping', 'mini-production'],
    related: ['block-03', 'concept-tech-pack', 'concept-bom'],
  },
  {
    id: 'mini-prototyping',
    category: 'mini_block',
    coord: '03.3',
    title: 'Prototyping',
    route: '/collection/[id]/product?phase=prototyping',
    short: 'Sample iterations from the factory. Status, photo, iteration count, red flags when iterations stall.',
    the_logic:
      'Prototyping is where reality pushes back on the design. Each iteration is a physical sample you photograph and approve, comment, or reject. aimily flags red when an SKU has been stuck pending for >21 days (footwear) or >14 days (apparel). When all SKUs are approved or no-proto, the collection is ready for Production.',
    inputs: ['mini-tech-pack'],
    outputs: ['mini-production', 'mini-final-selection'],
    related: ['block-03', 'concept-prototype-iteration'],
  },
  {
    id: 'mini-production',
    category: 'mini_block',
    coord: '03.4',
    title: 'Production',
    route: '/collection/[id]/product?phase=production',
    short: 'POs to the factory: status (draft → sent → in-production → shipped → approved), unit cost vs target, ETA vs deadline.',
    the_logic:
      'Production is the operational layer. Each SKU has a PO with a factory, qty, unit cost and ETA. aimily flags overruns vs your target cost (red) and ETA slips (amber under 14 days, red overdue). The summary strip aggregates open POs, total PO value, cost overruns and ETA slips so you can see exposure at a glance.',
    inputs: ['mini-tech-pack', 'mini-prototyping'],
    outputs: ['mini-final-selection'],
    related: ['block-03', 'concept-po'],
  },
  {
    id: 'mini-final-selection',
    category: 'mini_block',
    coord: '03.5',
    title: 'Final Selection',
    route: '/collection/[id]/product?phase=selection',
    short: 'Approve or reject each SKU against the merchandising plan. When you lock, the collection is sealed for Block 04.',
    the_logic:
      'Final Selection is the gate between Design and Marketing. The right sidebar shows live merch balance: family mix actual vs target, tier split, drop split. As you approve SKUs, the bars move. When the balance is acceptable, you click "Lock the collection" — only locked SKUs go to Marketing. After lock, Block 03 stops moving and Block 04 lights up.',
    inputs: ['mini-prototyping', 'mini-production', 'mini-financial-plan'],
    outputs: ['block-04'],
    related: ['block-03', 'mini-financial-plan'],
  },

  /* ── Block 04 ───────────────────────────────────────────────── */
  {
    id: 'mini-gtm-launch',
    category: 'mini_block',
    coord: '04.1',
    title: 'GTM & Launch Plan',
    route: '/collection/[id]/marketing/creation?block=gtm',
    short: 'Four cards: Go-to-Market, Launch, Content Calendar, Paid Growth. The sequence by which the collection meets the world.',
    the_logic:
      'GTM decides the audience pyramid (warm list → press → public). Launch sequences the drops over the season. Content Calendar plots organic posts day by day. Paid Growth budgets and channels (Meta, Google, TikTok). All four read from the locked collection in 03.5 and the distribution plan in 02.3.',
    inputs: ['mini-final-selection', 'mini-distribution'],
    outputs: ['mini-content-studio', 'mini-communications', 'mini-sales-dashboard'],
    related: ['block-04', 'concept-gtm', 'concept-launch-window'],
  },
  {
    id: 'mini-content-studio',
    category: 'mini_block',
    coord: '04.2',
    title: 'Content Studio',
    route: '/collection/[id]/marketing/creation?block=content',
    short: 'Per-SKU four-level visual pipeline: e-commerce → still life → editorial → campaign. 28 aimily models available.',
    the_logic:
      'The four levels are not optional steps — they are different tools. E-commerce is clean ghost-mannequin (catalogue). Still life is product-only with mood (look book). Editorial is on-model narrative (campaign assets). Campaign is the moving image (ads, social). Each uses a different AI pipeline. The model roster (28 aimily models) is your in-house casting; pick a model headshot as the third reference image to lock the look.',
    inputs: ['mini-final-selection', 'mini-brand-identity', 'mini-moodboard'],
    outputs: ['mini-communications', 'mini-sales-dashboard'],
    related: ['block-04', 'concept-still-life-vs-editorial-vs-tryon', 'concept-model-roster'],
  },
  {
    id: 'mini-communications',
    category: 'mini_block',
    coord: '04.3',
    title: 'Communications',
    route: '/collection/[id]/marketing/creation?block=comms',
    short: 'Copy, social templates, email sequences, brand voice, SEO. Everything your audience reads about the collection.',
    the_logic:
      'Communications reads the brand voice from 01.4 and writes in it — every product description, social post and email lands in the same tone. The point is consistency: a buyer who hears about you on Instagram, then reads your email, then lands on the e-commerce page should not feel three different brands.',
    inputs: ['mini-brand-identity', 'mini-content-studio', 'mini-final-selection'],
    outputs: ['mini-sales-dashboard'],
    related: ['block-04'],
  },
  {
    id: 'mini-sales-dashboard',
    category: 'mini_block',
    coord: '04.4',
    title: 'Sales Dashboard',
    route: '/collection/[id]/marketing/creation?block=sales',
    short: 'Eight live KPIs, revenue curve, stories overview, drop calendar, post-launch performance. The only block that lights up after launch.',
    the_logic:
      'Until launch, this slot is plan vs target. After launch, it becomes plan vs actual. The post-launch tab compares forecast to reality SKU by SKU. This is also where you decide whether to repeat a drop, kill a slow SKU, or pivot a story. The dashboard reads collection_skus, drops and stories — no manual entry of sales numbers.',
    inputs: ['mini-final-selection', 'mini-financial-plan', 'mini-gtm-launch'],
    related: ['block-04', 'concept-post-launch'],
  },
  {
    id: 'mini-point-of-sale',
    category: 'mini_block',
    coord: '04.5',
    title: 'Point of Sale',
    route: '/collection/[id]/marketing/creation?block=pos',
    short: 'Web store placeholder (Shopify integration coming) plus wholesale order CRUD. Where transactions actually happen.',
    the_logic:
      'POS is the operational endpoint. Wholesale orders are tracked here SKU-by-SKU with status, qty, unit price. The web store integration with Shopify is on the roadmap — for now, the placeholder shows the structure that will receive your storefront data when wired.',
    inputs: ['mini-distribution', 'mini-final-selection'],
    related: ['block-04'],
  },
];

/* ──────────────────────────────────────────────────────────────────
   FASHION CONCEPTS — terms explained for brilliant outsiders
   ────────────────────────────────────────────────────────────────── */

const CONCEPTS: KnowledgeEntry[] = [
  {
    id: 'concept-sku',
    category: 'concept',
    title: 'SKU — the atom of a collection',
    short: 'Stock Keeping Unit. One SKU = one variant of one product (a specific colour, a specific size combo). The smallest thing you produce, sell and count.',
    the_logic:
      'In aimily, an SKU is a row in collection_skus with a name, family, tier, price, drop, and (eventually) a sketch, tech pack, factory, PO. Block 02 decides how many SKUs you will have. Block 03 designs each one. Block 04 sells each one. When somebody asks "what is in your collection", the truthful answer is "these N SKUs".',
    fashion_concept: 'SKU',
  },
  {
    id: 'concept-range-plan',
    category: 'concept',
    title: 'Range plan — the architecture of a collection',
    short: 'The structured list of what you will sell, in what families, at what price points, in what mix of tiers. Block 02\'s output.',
    the_logic:
      'A range plan is to a collection what a wireframe is to a product. It does not tell you what each SKU looks like — it tells you how many you have, how they are grouped, how they ladder in price, how they split between revenue-driving and image-driving. The range plan exists before the first sketch.',
    fashion_concept: 'range plan',
    related: ['mini-assortment-pricing', 'mini-collection-builder'],
  },
  {
    id: 'concept-tier-system',
    category: 'concept',
    title: 'Tiers — REVENUE / IMAGEN / ENTRY',
    short: 'Every SKU plays one of three roles. REVENUE pays the bills. IMAGEN sets the image. ENTRY brings new customers in.',
    the_logic:
      'REVENUE SKUs are the workhorses — solid margin, broad appeal, high unit count. IMAGEN SKUs are the press pieces — high creative, low volume, sometimes loss-leading. ENTRY SKUs are the gateway — accessible price, designed to convert browsers into first-time buyers. A healthy collection mixes all three. aimily tracks the split in the merch balance and flags when you over-rotate on one tier.',
    fashion_concept: 'tier mix',
    related: ['mini-financial-plan', 'mini-final-selection'],
  },
  {
    id: 'concept-family',
    category: 'concept',
    title: 'Family — a group of related products',
    short: 'A thematic cluster of SKUs (e.g. "Tailoring", "Knits", "Outerwear"). The first level of structure inside a collection.',
    the_logic:
      'Families let you reason about a collection without listing 80 SKUs. You decide how many families, what each one carries, what the price range inside each family is. The AI proposes family mix from the buying strategy; you adjust. Sub-categories live one level deeper inside each family.',
    fashion_concept: 'family',
    related: ['mini-assortment-pricing'],
  },
  {
    id: 'concept-drop',
    category: 'concept',
    title: 'Drop — a release window',
    short: 'A subset of the collection released together on a specific date. Most modern brands stagger releases instead of one big launch.',
    the_logic:
      'A drop is a marketing event with merchandising consequences. SS27 might have 3 drops: pre-season, peak, end-of-season. Each drop carries a slice of the SKU grid. Calendar mode in aimily plots drops as bars on the timeline; the GTM block sequences them; the Sales Dashboard tracks each one.',
    fashion_concept: 'drop',
    related: ['mini-collection-builder', 'mini-gtm-launch'],
  },
  {
    id: 'concept-anchor-card',
    category: 'concept',
    title: 'Anchor cards — revenue & strategic',
    short: 'In Buying Strategy, two cards anchor the conversation: one revenue anchor (what you must make) and one strategic anchor (what positions the brand).',
    the_logic:
      'The revenue anchor sets the floor — the SKU type that has to land for the season to be financially viable. The strategic anchor sets the ceiling — the SKU type that has to land for the brand to gain ground. The three scenarios proposed under the anchors are different bets on how aggressively to chase each.',
    fashion_concept: 'anchor product',
    related: ['mini-buying-strategy'],
  },
  {
    id: 'concept-bom',
    category: 'concept',
    title: 'BOM — Bill of Materials',
    short: 'The list of every component that goes into one SKU: fabric, lining, trims, labels, hardware, packaging. With consumption per unit.',
    the_logic:
      'BOM is the sourcing blueprint. Without it, the factory cannot quote and procurement cannot order. aimily generates a first-pass BOM from the sketch and material zones; you refine it. BOM lines link to suppliers in the directory, which feeds factory selection in Production.',
    fashion_concept: 'BOM',
    related: ['mini-tech-pack'],
  },
  {
    id: 'concept-tech-pack',
    category: 'concept',
    title: 'Tech pack — the factory document',
    short: 'A multi-page document per SKU: front/back/detail sketches, measurements (graded by size), BOM, construction notes, label and packaging spec.',
    the_logic:
      'A tech pack is what stops factory iterations from being expensive. The clearer the tech pack, the fewer questions, the fewer wrong samples. aimily exports tech packs as A3 landscape PDFs with pin comments anchored to specific points on the sketch — the comment lives where the issue is, not buried in an email thread.',
    fashion_concept: 'tech pack',
    related: ['mini-tech-pack'],
  },
  {
    id: 'concept-prototype-iteration',
    category: 'concept',
    title: 'Prototype iterations',
    short: 'Sample 1, sample 2, sample 3 — the loop between brand and factory until the SKU is right.',
    the_logic:
      'Most SKUs need 2–3 iterations before approval. Each loop costs time and money — that is why the tech pack quality matters. aimily tracks iterations per SKU and surfaces red flags when an SKU is stuck >21 days for footwear or >14 days for apparel: signal to call the factory, not wait.',
    fashion_concept: 'prototyping',
    related: ['mini-prototyping'],
  },
  {
    id: 'concept-po',
    category: 'concept',
    title: 'PO — Purchase Order',
    short: 'The formal contract with the factory: which SKU, how many units, at what unit cost, by what date.',
    the_logic:
      'A PO is the moment money is committed. aimily tracks each PO\'s status (draft → sent → in-production → shipped → approved) and surfaces unit cost vs target and ETA vs deadline. When unit cost overruns or ETA slips, the dashboard flags it; the cost summary shows total exposure.',
    fashion_concept: 'purchase order',
    related: ['mini-production'],
  },
  {
    id: 'concept-moq',
    category: 'concept',
    title: 'MOQ — Minimum Order Quantity',
    short: 'The minimum unit count a factory will produce per SKU. Often the constraint that decides whether an SKU survives Final Selection.',
    the_logic:
      'A factory that requires 300 units per SKU forces you to commit. If you only believe in 80 units of a piece, that piece either dies, or moves to a smaller-MOQ factory, or gets reframed as IMAGEN tier where the unit math is different. MOQ is one of the silent forces shaping the range plan.',
    fashion_concept: 'MOQ',
  },
  {
    id: 'concept-dtc-vs-wholesale',
    category: 'concept',
    title: 'DTC vs Wholesale',
    short: 'DTC = Direct-to-Consumer (your e-commerce, your store). Wholesale = selling to retailers who resell. Two different price math, two different speeds.',
    the_logic:
      'DTC keeps the full retail price minus your costs. Wholesale typically takes ~50% of retail. A collection that is 70% wholesale needs different pricing math than one that is 90% DTC. Distribution (02.3) decides the split; Financial Plan (02.4) absorbs the implications.',
    fashion_concept: 'DTC vs wholesale',
    related: ['mini-distribution'],
  },
  {
    id: 'concept-still-life-vs-editorial-vs-tryon',
    category: 'concept',
    title: 'Still life · Editorial · Try-on — three visual categories',
    short: 'Three different photographic logics. aimily uses three different AI pipelines for them — they never share an endpoint.',
    the_logic:
      'Still life = product alone, no body. Editorial = product on a model, narrative scene. Try-on (a.k.a. catalogue) = product on a brand model, neutral pose. The three solve different jobs: still life for catalogue and look book, editorial for campaigns and press, try-on for e-commerce. aimily generates each via a dedicated endpoint because the prompt logic and reference images differ.',
    fashion_concept: 'still life · editorial · try-on',
    related: ['mini-content-studio'],
  },
  {
    id: 'concept-model-roster',
    category: 'concept',
    title: 'aimily model roster — 28 in-house faces',
    short: '14 female + 14 male AI-generated models, identity-locked. Pick a headshot as the third reference image and the editorial AI keeps the face consistent.',
    the_logic:
      'Casting models is expensive and slow. aimily ships a roster of 28 models you can use as virtual talent — same face across the season, no face drift between shots. The roster is plugged into the editorial endpoint as the third reference; aimily blurs human faces in style references first to prevent the AI from cloning the wrong face.',
    fashion_concept: 'model roster',
    related: ['mini-content-studio'],
  },
  {
    id: 'concept-gtm',
    category: 'concept',
    title: 'GTM — Go-to-Market',
    short: 'The plan for how the collection meets the world: who hears first (warm list, press), who hears next (organic), who hears last (paid).',
    the_logic:
      'A good GTM is a sequence, not a moment. The mistake is to flip every channel on launch day. aimily structures GTM as a pyramid that ramps over weeks: warm-list pre-orders, press embargo, public reveal, paid amplification. Each layer feeds the next.',
    fashion_concept: 'GTM',
    related: ['mini-gtm-launch'],
  },
  {
    id: 'concept-launch-window',
    category: 'concept',
    title: 'Launch window',
    short: 'The 4–8 weeks around a drop where attention is bought, earned and converted. Most of a season\'s revenue lands here.',
    the_logic:
      'A season has a few launch windows (one per drop). Outside of windows, the brand is in maintenance mode. The Calendar in aimily plots launch windows as bands; the GTM block sequences activity inside each band; the Sales Dashboard tracks revenue by window so you can see which drop carried the season.',
    fashion_concept: 'launch window',
    related: ['mini-gtm-launch', 'mini-sales-dashboard'],
  },
  {
    id: 'concept-post-launch',
    category: 'concept',
    title: 'Post-launch performance',
    short: 'The 30–90 days after a drop where the truth about a collection arrives. Sell-through, returns, repeat-buyers, press hits.',
    the_logic:
      'Pre-launch everything is hypothesis. Post-launch is data. aimily compares forecast to actual at the SKU level: which SKUs hit, which under-performed, which generated repeat buys. This is the input that sharpens the next season\'s buying strategy — without it, every season is a fresh guess.',
    fashion_concept: 'post-launch',
    related: ['mini-sales-dashboard'],
  },
  {
    id: 'concept-gross-margin',
    category: 'concept',
    title: 'Gross margin',
    short: '(Revenue − COGS) ÷ Revenue. The percentage of every euro of sale that survives after the cost of making the product.',
    the_logic:
      'Margin is the breathing room for everything else: salaries, marketing, returns, mistakes. A common indie brand target is 65–75% on DTC; wholesale halves it. The Financial Plan in 02.4 sets target margin; every later cost decision (factory choice, MOQ, fabric tier) lives or dies by whether it preserves that target.',
    fashion_concept: 'gross margin',
    related: ['mini-financial-plan'],
  },
  {
    id: 'concept-evolution-strip',
    category: 'concept',
    title: 'Evolution Strip — the 6-step SKU lifecycle',
    short: 'Concept → Sketch → Color & Materials → 3D Render → Prototype → Production. The horizontal status bar at the top of every SKU detail.',
    the_logic:
      'The Evolution Strip is how aimily makes the lifecycle visible. Each step has its own state (empty, in-progress, ready). You cannot fake forward progress — the strip refuses to show "ready" on a step that has no data. The strip is also how Final Selection knows whether an SKU is producible.',
    fashion_concept: 'product lifecycle',
    related: ['mini-sketch-color', 'mini-tech-pack', 'mini-prototyping', 'mini-production'],
  },
  {
    id: 'concept-season-naming',
    category: 'concept',
    title: 'Season codes — SS27, FW26, etc.',
    short: 'Industry shorthand for when a collection sells. SS = Spring/Summer, FW = Fall/Winter, followed by the year.',
    the_logic:
      'SS27 means the collection sells in Spring/Summer 2027 — but it is designed and produced in 2026 (about 12 months earlier). This is why fashion calendars feel time-warped: the team is wearing SS25 while making SS27. aimily uses season codes everywhere so the timeline matches industry convention.',
    fashion_concept: 'season code',
  },
];

/* ──────────────────────────────────────────────────────────────────
   FLOWS — how blocks feed each other
   ────────────────────────────────────────────────────────────────── */

const FLOWS: KnowledgeEntry[] = [
  {
    id: 'flow-consumer-to-brand',
    category: 'flow',
    title: 'Flow — Consumer → Brand Identity',
    short: '01.1 (who) decides 01.4 (how the brand expresses itself). A brand identity that does not speak to the consumer is decoration.',
    the_logic:
      'When you save the consumer in 01.1, the AI proposal in 01.4 reads it: a Gen-Z streetwear consumer triggers different palette and voice proposals than a 35-year-old quiet-luxury consumer. You can override; the proposal is a starting point, not a verdict.',
    related: ['mini-consumer', 'mini-brand-identity'],
  },
  {
    id: 'flow-creative-to-merch',
    category: 'flow',
    title: 'Flow — Block 01 → Block 02',
    short: 'Creative Overview becomes the input prompt for the merchandising AI. No creative brief, no smart range plan.',
    the_logic:
      'The merchandising AI in 02.1 (Buying Strategy) reads the creative brief and proposes scenarios that match the consumer, brand voice and market positioning. You can run Block 02 without Block 01, but the proposals will be generic — exactly the Excel experience aimily exists to replace.',
    related: ['mini-creative-overview', 'mini-buying-strategy'],
  },
  {
    id: 'flow-merch-to-design',
    category: 'flow',
    title: 'Flow — Collection Builder → Sketch & Color',
    short: '02.5 generates the SKU rows; 03.1 starts designing them. From plan to physical product.',
    the_logic:
      'Each SKU in the Builder has a name, family, tier and target price. Click into 03.1 and each card shows the SKU\'s context. The sketch you upload (or AI-generate) becomes the seed for everything downstream: colorways, tech pack, prototype, production.',
    related: ['mini-collection-builder', 'mini-sketch-color'],
  },
  {
    id: 'flow-design-lifecycle',
    category: 'flow',
    title: 'Flow — Sketch → Tech Pack → Prototype → Production',
    short: 'The 6-step Evolution Strip in order. Each step gates the next.',
    the_logic:
      'You cannot generate a tech pack without a sketch. You cannot prototype without a tech pack. You cannot order production without an approved prototype (or "no-proto" decision). The strip is opinionated on purpose — skipping steps generates expensive factory iterations.',
    related: ['concept-evolution-strip', 'mini-sketch-color', 'mini-tech-pack', 'mini-prototyping', 'mini-production'],
  },
  {
    id: 'flow-final-selection-lock',
    category: 'flow',
    title: 'Flow — Final Selection lock → Block 04 unlocks',
    short: 'Until you lock the collection in 03.5, Block 04 is dormant. After lock, marketing has the SKU set it needs.',
    the_logic:
      'Locking is intentional friction: it forces a moment of "this is the collection I am taking to market". After lock, the GTM block can sequence drops, the Content Studio can generate per-SKU visuals, the Communications block can write product copy. Before lock, none of this can be trusted because the SKU set is still moving.',
    related: ['mini-final-selection', 'block-04'],
  },
  {
    id: 'flow-marketing-to-sales',
    category: 'flow',
    title: 'Flow — Marketing creation → Sales Dashboard',
    short: 'Content + Communications + GTM produce assets and a plan; Sales Dashboard tracks what those produce in revenue.',
    the_logic:
      'The Sales Dashboard is the only block that has two lives: pre-launch (plan vs target) and post-launch (plan vs actual). It reads from drops, stories and SKU sales — same primitives that Block 02 created. The dashboard closes the loop: plan, design, market, measure, learn.',
    related: ['mini-gtm-launch', 'mini-content-studio', 'mini-communications', 'mini-sales-dashboard'],
  },
  {
    id: 'flow-presentation-mode',
    category: 'flow',
    title: 'Flow — Presentation mode (the third face of the cube)',
    short: 'Click Presentation in the sidebar; the same 20 slots become 21 slides (Cover + 20). Auto-filled from your CIS.',
    the_logic:
      'Presentation does not generate slides — it renders facts you already captured. 16 of the 21 slides pull live data from CIS for SS27 SLAIZ. You can edit a slide inline (saved as override, non-destructive) or Promote the edit back to the workspace (writes to CIS, AI sees the new text). Themes (10 available) only change typography and palette; the structure is fixed.',
    related: ['the-rubiks-cube', 'cis'],
  },
  {
    id: 'flow-calendar-mode',
    category: 'flow',
    title: 'Flow — Calendar mode (the second face of the cube)',
    short: 'Same 20 slots rendered as horizontal timeline tracks. Pixel-aligned with sidebar rows. ~45 milestones across the season.',
    the_logic:
      'The Calendar is not a separate planner — it is the same spine extended rightward as time. Each milestone bar lives on its mini-block row. Click a bar and you exit calendar back to that mini-block\'s workspace. The calendar enforces the rhythm: pre-launch tasks, prototyping windows, drop dates, post-launch reviews.',
    related: ['the-rubiks-cube'],
  },
  {
    id: 'flow-cis-everywhere',
    category: 'flow',
    title: 'Flow — How CIS reads in every AI prompt',
    short: 'When you click any AI button, the server loads your full collection context: CIS facts + creative workspace + brief + plan. The AI never works blind.',
    the_logic:
      'Frontend never decides what the AI sees. The server loads the context for every AI endpoint via loadFullContext(). This is why the merchandising AI knows your consumer (from 01.1), the marketing copy AI knows your brand voice (from 01.4), the editorial image AI knows your moodboard. You captured it once; every later AI call benefits.',
    related: ['cis', 'aimily-overview'],
  },
];

/* ──────────────────────────────────────────────────────────────────
   ADMIN — billing, plans, account
   ────────────────────────────────────────────────────────────────── */

const ADMIN: KnowledgeEntry[] = [
  {
    id: 'admin-plans',
    category: 'admin',
    title: 'Plans — Starter, Pro, Pro Max',
    route: '/pricing',
    short: 'Three tiers. Starter for first projects. Pro for serious indie work. Pro Max for studios running multiple seasons in parallel.',
    the_logic:
      'Plans gate compute-heavy features (AI image generations, model roster usage, tech-pack PDFs) via monthly quotas. The Aimily Assistant itself is free on every plan — the platform should teach you regardless of what you pay. When you hit a quota, the relevant action is paused; you top up with Aimily Credits or upgrade the plan.',
  },
  {
    id: 'admin-aimily-credits',
    category: 'admin',
    title: 'Aimily Credits',
    route: '/account',
    short: 'Top-up packs you buy on top of your plan. Burn down per AI generation. Don\'t expire while your plan is active.',
    the_logic:
      'Credits decouple "how much creative work I do this month" from "what plan I am on". You can stay on Pro and buy a 500-credit pack for the launch month, then go back to baseline. Credits apply to images, tech-pack generations and editorial pipelines.',
  },
  {
    id: 'admin-billing',
    category: 'admin',
    title: 'Billing — Stripe Customer Portal',
    route: '/account',
    short: 'Manage subscription, payment method, invoices and cancel inside the Stripe Customer Portal, opened from the account page.',
    the_logic:
      'aimily uses Stripe in live mode (since 28 April 2026). Subscriptions, refunds, plan changes and invoice downloads all live in the portal — aimily does not duplicate that UI. The webhook synchronises plan state into Supabase so the app reflects changes within seconds.',
  },
  {
    id: 'admin-refund',
    category: 'admin',
    title: 'Refund policy',
    route: '/trust',
    short: 'Cancel any time, prorated refund within 14 days of subscription. Credit packs are non-refundable once any credit has been spent from them.',
    the_logic:
      'The 14-day window is a soft money-back guarantee for users who cannot evaluate aimily inside the trial. After the window, cancellation stops billing at the next cycle but does not refund the current cycle. Refund handling is automated through the Stripe webhook.',
  },
  {
    id: 'admin-account',
    category: 'admin',
    title: 'Account — profile, language, sign out',
    route: '/account',
    short: 'Display name, profile photo, default language, sign-out, delete account, billing portal entrypoint.',
    the_logic:
      'Sign-out is intentionally always one click from /account. Account deletion is GDPR-compliant: it cascades to collections, decisions, generated assets and conversation history. The default language sets the UI locale and the Aimily Assistant\'s reply language.',
  },
  {
    id: 'admin-languages',
    category: 'admin',
    title: 'Languages — 9 locales supported',
    short: 'English, Spanish, French, Italian, German, Portuguese, Dutch, Swedish, Norwegian. The whole product, every screen.',
    the_logic:
      'aimily is fully translated, not auto-translated — 2,200+ keys per locale. The Assistant replies in the user\'s account language by default. Switch language in /account; CIS data stays in whatever language you wrote it.',
  },
  {
    id: 'admin-privacy',
    category: 'admin',
    title: 'Privacy & data retention',
    route: '/trust',
    short: 'Your collection data stays in your Supabase rows, RLS-scoped to your user. AI providers see prompts under no-training contracts. Assistant history kept 90 days.',
    the_logic:
      'aimily does not train on your data — the AI providers (Anthropic, OpenAI, Freepik) operate under zero-data-retention contracts. Row-Level Security in Supabase guarantees no cross-user leakage. The Aimily Assistant stores conversations 90 days for context, then purges via pg_cron. You can clear conversation history any time.',
  },
  {
    id: 'admin-security',
    category: 'admin',
    title: 'Security — auth, RLS, audit log',
    route: '/trust',
    short: 'Email + magic link / Google OAuth. Every API route auth-guarded. RLS on every table. Audit log of every meaningful action.',
    the_logic:
      'No public reads on user data. Every API route runs getAuthenticatedUser() before doing anything. Every table has Row-Level Security policies. The audit log records mutations for incident response — if something goes wrong, the history is reconstructable.',
  },
  {
    id: 'admin-support',
    category: 'admin',
    title: 'Support — how to reach a human',
    short: 'Email hello@aimily.app for anything the assistant cannot answer. Response within one business day.',
    the_logic:
      'When the Aimily Assistant does not know the answer or hits a billing edge case, it offers to send the question to the team. You can also email hello@aimily.app directly. Slack alerts in #aimily-alerts notify the founder of urgent issues.',
  },
  {
    id: 'admin-imagery-quotas',
    category: 'admin',
    title: 'Imagery quotas',
    route: '/account',
    short: 'Each plan ships a monthly imagery allowance (still life, editorial, try-on, model headshots). Top up with Aimily Credits.',
    the_logic:
      'Imagery is the heaviest cost in aimily. The quota system bills cleanly: one image generation = one credit. The account page shows live remaining quota. When you hit zero, the relevant Content Studio buttons disable until you top up or the cycle resets.',
  },
];

/* ──────────────────────────────────────────────────────────────────
   COMPILE & EXPORT
   ────────────────────────────────────────────────────────────────── */

export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  ...PHILOSOPHY,
  ...BLOCKS,
  ...MINI_BLOCKS,
  ...CONCEPTS,
  ...FLOWS,
  ...ADMIN,
];

/**
 * Whitelist of internal routes the assistant is allowed to suggest via the
 * navigateToWorkspace tool. Anything outside this list is rejected client-side.
 *
 * NOTE: collection-scoped routes contain "[id]" — the client substitutes the
 * active collection id at click time. If there is no active collection,
 * collection-scoped suggestions are suppressed.
 */
export const ROUTE_WHITELIST: ReadonlyArray<string> = [
  // Collection-scoped (require [id])
  '/collection/[id]',
  '/collection/[id]/creative',
  '/collection/[id]/creative?block=consumer',
  '/collection/[id]/creative?block=moodboard',
  '/collection/[id]/creative?block=research',
  '/collection/[id]/creative?block=brand-dna',
  '/collection/[id]/creative?block=synthesis',
  '/collection/[id]/merchandising',
  '/collection/[id]/merchandising?block=scenarios',
  '/collection/[id]/merchandising?block=families',
  '/collection/[id]/merchandising?block=channels',
  '/collection/[id]/merchandising?block=budget',
  '/collection/[id]/product',
  '/collection/[id]/product?phase=sketch',
  '/collection/[id]/product?phase=techpack',
  '/collection/[id]/product?phase=prototyping',
  '/collection/[id]/product?phase=production',
  '/collection/[id]/product?phase=selection',
  '/collection/[id]/marketing/creation',
  '/collection/[id]/marketing/creation?block=gtm',
  '/collection/[id]/marketing/creation?block=content',
  '/collection/[id]/marketing/creation?block=comms',
  '/collection/[id]/marketing/creation?block=sales',
  '/collection/[id]/marketing/creation?block=pos',
  '/collection/[id]/calendar',
  '/collection/[id]/presentation',
  // Global
  '/my-collections',
  '/account',
  '/pricing',
  '/trust',
];

export function isRouteAllowed(route: string): boolean {
  return ROUTE_WHITELIST.includes(route);
}

/**
 * Resolve a whitelist template like "/collection/[id]/creative?block=moodboard"
 * to a concrete URL by substituting [id] with the active collection id.
 * Returns null if the template needs an [id] but none is provided.
 */
export function resolveRoute(template: string, collectionId?: string | null): string | null {
  if (!template.includes('[id]')) return template;
  if (!collectionId) return null;
  return template.replace('[id]', collectionId);
}
