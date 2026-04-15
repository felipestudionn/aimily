/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION MODE — Core type system

   The cube's third face. Same spine (20 mini-blocks) → 20 slides.
   Each slide pairs a TEMPLATE (structure: hero, key facts, narrative…)
   with a THEME (visual tokens: typography, color, density, treatment).

   Architecture: 20 templates × 10 themes = 200 combinations without
   duplicating code. Templates consume theme tokens via CSS variables
   (--p-bg, --p-fg, --p-display-font…) injected at the deck root.
   ═══════════════════════════════════════════════════════════════════ */

import type { TimelinePhase } from '@/types/timeline';

/* ── 10 brand-archetype themes (6 wired in F1, 4 ship in F2/F3) ── */
export type ThemeId =
  | 'editorial-heritage'      // Hermès, Bottega — luxury silent
  | 'streetwear-drop'         // Supreme, Off-White — urban hype
  | 'romantic-feminine'       // Zimmermann, Ulla Johnson — soft dreamy
  | 'minimal-architect'       // Jil Sander, Lemaire — swiss geometric
  | 'performance-tech'        // Nike, ACRONYM — data dynamic
  | 'avant-garde-concept'     // Rick Owens, Margiela — art-book
  | 'sustainable-craft'       // Bode, Story mfg — earth transparency
  | 'y2k-digital'             // Coperni, Marine Serre — chrome glitch
  | 'workwear-heritage'       // Engineered Garments, Carhartt WIP — utility blueprint
  | 'resort-luxe';            // Jacquemus, Loewe Paula's — Mediterranean sun

export type ThemeStatus = 'wired' | 'preview';

export interface ThemeTokens {
  /* Palette */
  bg: string;          // canvas background
  surface: string;     // card / inset surface
  fg: string;          // primary text
  mute: string;        // secondary text
  accent: string;      // primary brand accent
  accent2: string;     // secondary accent
  border: string;      // hairlines + dividers
  /* Typography */
  displayFont: string;     // hero / titles
  bodyFont: string;        // paragraphs
  monoFont: string;        // KPIs / numerals / specs
  /* Treatments */
  displayCase: 'normal' | 'upper' | 'small-caps';
  displayWeight: number;    // 400 normal, 700 bold, etc.
  displayTracking: string;  // letter-spacing CSS value
  bodyTracking: string;
  /* Geometry */
  radius: string;       // border-radius for cards
  density: 'spacious' | 'balanced' | 'tight';
  /* Photo treatment hint (consumed by image components) */
  photoTreatment: 'full-bleed' | 'framed' | 'soft-focus' | 'raw-scan' | 'editorial-grid';
}

export interface Theme {
  id: ThemeId;
  name: string;
  archetype: string;
  status: ThemeStatus;
  tokens: ThemeTokens;
}

/* ── 20 micro-blocks = 20 slides ──────────────────────────────────── */

export type MicroBlockId =
  /* Block 1 — Creative & Brand */
  | 'consumer' | 'moodboard' | 'market-research' | 'brand-identity' | 'creative-overview'
  /* Block 2 — Merchandising */
  | 'buying-strategy' | 'assortment-pricing' | 'distribution' | 'financial-plan' | 'collection-builder'
  /* Block 3 — Design & Development */
  | 'sketch-color' | 'tech-pack' | 'prototyping' | 'production' | 'final-selection'
  /* Block 4 — Marketing & Sales */
  | 'gtm-launch' | 'content-studio' | 'communications' | 'sales-dashboard' | 'point-of-sale';

export type TemplateId =
  | 'cover'             // Brand-hero opening slide (Presentation's slide 0)
  | 'hero'              // Block-opening monolith (used for the 4 block intro slides)
  | 'editorial-stat'    // Big KPI + narrative bridge
  | 'narrative-portrait'// Story-driven, image + paragraph
  | 'grid-tile'         // Multi-tile (SKUs, looks, drops)
  | 'timeline-strip'    // Horizontal timeline of milestones
  | 'placeholder';      // Skeleton until per-mini-block design lands

export interface MicroBlockSlide {
  id: MicroBlockId;
  block: TimelinePhase;            // creative | planning | development | go_to_market
  blockIndex: number;              // 1..4 (display order of parent block)
  microIndex: number;              // 1..5 within parent block
  template: TemplateId;            // structural template
  /* i18n labels */
  titleKey: string;                // i18n key under presentation.slides
  subtitleKey?: string;
  /* Editorial elements (auto-generated from CIS in F2) */
  eyebrow?: string;                // small label above hero (e.g. "01 · CREATIVE")
}

export interface DeckMeta {
  collectionName: string;
  brandName?: string;
  season?: string;
  launchDate?: string | null;
}
