/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION SPINE — the 20 micro-block slides

   Source of truth for the deck order. Each entry mirrors a sidebar
   sub-item (so Calendar / Workspace / Presentation share one mental
   model — the Rubik's cube). When the sidebar adds/removes a sub-item,
   add/remove its slide here in the SAME commit.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide } from './types';

export const SPINE: MicroBlockSlide[] = [
  /* ── 01 · CREATIVE & BRAND ──────────────────────────────────────── */
  { id: 'consumer',          block: 'creative',     blockIndex: 1, microIndex: 1, template: 'narrative-portrait', titleKey: 'consumer',         eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'moodboard',         block: 'creative',     blockIndex: 1, microIndex: 2, template: 'grid-tile',          titleKey: 'moodboard',        eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'market-research',   block: 'creative',     blockIndex: 1, microIndex: 3, template: 'editorial-stat',     titleKey: 'marketResearch',   eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'brand-identity',    block: 'creative',     blockIndex: 1, microIndex: 4, template: 'narrative-portrait', titleKey: 'brandIdentity',    eyebrow: '01 · CREATIVE & BRAND' },
  { id: 'creative-overview', block: 'creative',     blockIndex: 1, microIndex: 5, template: 'hero',               titleKey: 'creativeOverview', eyebrow: '01 · CREATIVE & BRAND' },

  /* ── 02 · MERCHANDISING ─────────────────────────────────────────── */
  { id: 'buying-strategy',     block: 'planning',     blockIndex: 2, microIndex: 1, template: 'narrative-portrait', titleKey: 'buyingStrategy',     eyebrow: '02 · MERCHANDISING' },
  { id: 'assortment-pricing',  block: 'planning',     blockIndex: 2, microIndex: 2, template: 'grid-tile',          titleKey: 'assortmentPricing',  eyebrow: '02 · MERCHANDISING' },
  { id: 'distribution',        block: 'planning',     blockIndex: 2, microIndex: 3, template: 'editorial-stat',     titleKey: 'distribution',       eyebrow: '02 · MERCHANDISING' },
  { id: 'financial-plan',      block: 'planning',     blockIndex: 2, microIndex: 4, template: 'editorial-stat',     titleKey: 'financialPlan',      eyebrow: '02 · MERCHANDISING' },
  { id: 'collection-builder',  block: 'planning',     blockIndex: 2, microIndex: 5, template: 'hero',               titleKey: 'collectionBuilder',  eyebrow: '02 · MERCHANDISING' },

  /* ── 03 · DESIGN & DEVELOPMENT ──────────────────────────────────── */
  { id: 'sketch-color',     block: 'development',  blockIndex: 3, microIndex: 1, template: 'grid-tile',          titleKey: 'sketchColor',     eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'tech-pack',        block: 'development',  blockIndex: 3, microIndex: 2, template: 'narrative-portrait', titleKey: 'techPack',        eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'prototyping',      block: 'development',  blockIndex: 3, microIndex: 3, template: 'timeline-strip',     titleKey: 'prototyping',     eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'production',       block: 'development',  blockIndex: 3, microIndex: 4, template: 'timeline-strip',     titleKey: 'production',      eyebrow: '03 · DESIGN & DEVELOPMENT' },
  { id: 'final-selection',  block: 'development',  blockIndex: 3, microIndex: 5, template: 'hero',               titleKey: 'finalSelection',  eyebrow: '03 · DESIGN & DEVELOPMENT' },

  /* ── 04 · MARKETING & SALES ─────────────────────────────────────── */
  { id: 'gtm-launch',       block: 'go_to_market', blockIndex: 4, microIndex: 1, template: 'timeline-strip',     titleKey: 'gtmLaunchPlan',   eyebrow: '04 · MARKETING & SALES' },
  { id: 'content-studio',   block: 'go_to_market', blockIndex: 4, microIndex: 2, template: 'grid-tile',          titleKey: 'contentStudio',   eyebrow: '04 · MARKETING & SALES' },
  { id: 'communications',   block: 'go_to_market', blockIndex: 4, microIndex: 3, template: 'narrative-portrait', titleKey: 'communications',  eyebrow: '04 · MARKETING & SALES' },
  { id: 'sales-dashboard',  block: 'go_to_market', blockIndex: 4, microIndex: 4, template: 'editorial-stat',     titleKey: 'salesDashboard',  eyebrow: '04 · MARKETING & SALES' },
  { id: 'point-of-sale',    block: 'go_to_market', blockIndex: 4, microIndex: 5, template: 'hero',               titleKey: 'pointOfSale',     eyebrow: '04 · MARKETING & SALES' },
];

/* Quick lookups */
export const SPINE_BY_ID = Object.fromEntries(SPINE.map(s => [s.id, s]));

/* Block boundaries — used by ThemePicker, TOC, and slide N/M counters */
export const SLIDE_COUNT = SPINE.length;
