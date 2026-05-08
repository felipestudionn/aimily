/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION SPINE — the 30 micro-block slides

   The deck is no longer 1:1 with sidebar mini-blocks. Some sidebar
   entries (Brand Identity, Buying Strategy, Sketch & Color, Content
   Studio) explode into multiple slides because the underlying data
   merits a magazine-style spread, not a single overcrowded card.

   Sidebar still groups by mini-block — the Presentation aside renders
   one section per mini-block id, with all sub-slides nested inside.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide } from './types';

export const SPINE: MicroBlockSlide[] = [
  /* ── 01 · CREATIVE & BRAND ──────────────────────────────────────── */
  { id: 'consumer',          block: 'creative',     blockIndex: 1, microIndex: 1, template: 'narrative-portrait', titleKey: 'consumer',         eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'moodboard',         block: 'creative',     blockIndex: 1, microIndex: 2, template: 'grid-tile',          titleKey: 'moodboard',        eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'market-research',   block: 'creative',     blockIndex: 1, microIndex: 3, template: 'editorial-stat',     titleKey: 'marketResearch',   eyebrow: '01 · CREATIVE & BRAND' },
  /* Brand Identity expanded into a 4-slide editorial: DNA narrative,
     logo as full-bleed visual, palette + typography specimen, voice
     and tone narrative. Each gets its own moment. */
  { id: 'brand-identity',    block: 'creative',     blockIndex: 1, microIndex: 4, template: 'narrative-portrait', titleKey: 'brandIdentity',    eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'brand-logo',        block: 'creative',     blockIndex: 1, microIndex: 4, template: 'narrative-portrait', titleKey: 'brandLogo',        eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'brand-palette',     block: 'creative',     blockIndex: 1, microIndex: 4, template: 'palette',            titleKey: 'brandPalette',     eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'brand-voice',       block: 'creative',     blockIndex: 1, microIndex: 4, template: 'narrative-portrait', titleKey: 'brandVoice',       eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'creative-overview', block: 'creative',     blockIndex: 1, microIndex: 5, template: 'hero',               titleKey: 'creativeOverview', eyebrow: '01 · CREATIVE & BRAND' },

  /* ── 02 · MERCHANDISING ─────────────────────────────────────────── */
  /* Buying Strategy expands into 3 slides: thesis narrative, side-by-side
     comparison of the 3 AI-generated scenarios, and the drop architecture. */
  { id: 'buying-strategy',     block: 'merchandising',     blockIndex: 2, microIndex: 1, template: 'narrative-portrait', titleKey: 'buyingStrategy',     eyebrow: '02 · MERCHANDISING' },
  { id: 'buying-scenarios',    block: 'merchandising',     blockIndex: 2, microIndex: 1, template: 'scenario-compare',   titleKey: 'buyingScenarios',    eyebrow: '02 · MERCHANDISING' },
  { id: 'buying-drops',        block: 'merchandising',     blockIndex: 2, microIndex: 1, template: 'grid-tile',          titleKey: 'buyingDrops',        eyebrow: '02 · MERCHANDISING' },
  { id: 'assortment-pricing',  block: 'merchandising',     blockIndex: 2, microIndex: 2, template: 'grid-tile',          titleKey: 'assortmentPricing',  eyebrow: '02 · MERCHANDISING' },
  { id: 'distribution',        block: 'merchandising',     blockIndex: 2, microIndex: 3, template: 'editorial-stat',     titleKey: 'distribution',       eyebrow: '02 · MERCHANDISING' },
  { id: 'financial-plan',      block: 'merchandising',     blockIndex: 2, microIndex: 4, template: 'editorial-stat',     titleKey: 'financialPlan',      eyebrow: '02 · MERCHANDISING' },
  { id: 'collection-builder',  block: 'merchandising',     blockIndex: 2, microIndex: 5, template: 'range-wall',         titleKey: 'collectionBuilder',  eyebrow: '02 · MERCHANDISING' },

  /* ── 03 · DESIGN & DEVELOPMENT ──────────────────────────────────── */
  /* Sketch & Color expands into 3: range plan grid, color stories
     (one tile per colorway), and material zones (sketch + BOM). */
  { id: 'sketch-color',     block: 'development',  blockIndex: 3, microIndex: 1, template: 'grid-tile',          titleKey: 'sketchColor',     eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'colorways',        block: 'development',  blockIndex: 3, microIndex: 1, template: 'grid-tile',          titleKey: 'colorways',       eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'material-zones',   block: 'development',  blockIndex: 3, microIndex: 1, template: 'material-zones',     titleKey: 'materialZones',   eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'tech-pack',        block: 'development',  blockIndex: 3, microIndex: 2, template: 'narrative-portrait', titleKey: 'techPack',        eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'prototyping',      block: 'development',  blockIndex: 3, microIndex: 3, template: 'timeline-strip',     titleKey: 'prototyping',     eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'production',       block: 'development',  blockIndex: 3, microIndex: 4, template: 'timeline-strip',     titleKey: 'production',      eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'final-selection',  block: 'development',  blockIndex: 3, microIndex: 5, template: 'range-wall',         titleKey: 'finalSelection',  eyebrow: '03 · DESIGN & DEVELOPMENT' },

  /* ── 04 · MARKETING & SALES ─────────────────────────────────────── */
  { id: 'gtm-launch',          block: 'go_to_market', blockIndex: 4, microIndex: 1, template: 'timeline-strip',     titleKey: 'gtmLaunchPlan',     eyebrow: '04 · MARKETING & SALES' },
  /* Content Studio expands into 4: pillars grid, model roster,
     editorial photo wall, still life photo wall. */
  { id: 'content-studio',      block: 'go_to_market', blockIndex: 4, microIndex: 2, template: 'grid-tile',          titleKey: 'contentStudio',     eyebrow: '04 · MARKETING & SALES' },
  { id: 'content-models',      block: 'go_to_market', blockIndex: 4, microIndex: 2, template: 'range-wall',         titleKey: 'contentModels',     eyebrow: '04 · MARKETING & SALES' },
  { id: 'content-editorial',   block: 'go_to_market', blockIndex: 4, microIndex: 2, template: 'range-wall',         titleKey: 'contentEditorial',  eyebrow: '04 · MARKETING & SALES' },
  { id: 'content-still-life',  block: 'go_to_market', blockIndex: 4, microIndex: 2, template: 'range-wall',         titleKey: 'contentStillLife',  eyebrow: '04 · MARKETING & SALES' },
  { id: 'communications',      block: 'go_to_market', blockIndex: 4, microIndex: 3, template: 'narrative-portrait', titleKey: 'communications',    eyebrow: '04 · MARKETING & SALES' },
  { id: 'sales-dashboard',     block: 'go_to_market', blockIndex: 4, microIndex: 4, template: 'editorial-stat',     titleKey: 'salesDashboard',    eyebrow: '04 · MARKETING & SALES' },
  { id: 'point-of-sale',       block: 'go_to_market', blockIndex: 4, microIndex: 5, template: 'channel-map',        titleKey: 'pointOfSale',       eyebrow: '04 · MARKETING & SALES' },
];

/* Quick lookups */
export const SPINE_BY_ID = Object.fromEntries(SPINE.map(s => [s.id, s]));

/* Block boundaries — used by ThemePicker, TOC, and slide N/M counters */
export const SLIDE_COUNT = SPINE.length;
