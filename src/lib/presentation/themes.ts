/* ═══════════════════════════════════════════════════════════════════
   PRESENTATION THEMES — 10 brand-archetype token sets

   Each theme is a self-contained set of design tokens consumed by the
   templates via CSS variables. Adding a new theme = adding tokens
   here. NEVER edit templates to support a new theme.

   Status:
   - 'wired'   → ships in F1, fully tested visual fidelity
   - 'preview' → tokens defined, ships in F2/F3 after polish pass
   ═══════════════════════════════════════════════════════════════════ */

import type { Theme } from './types';

/* Font stacks — system-safe fallbacks. F2 will swap in next/font for
   each display family (Playfair, Cormorant, Archivo Black…). */
const SERIF_DIDONE = '"Playfair Display", "GT Sectra", "Bodoni 72", Didot, "Times New Roman", serif';
const SERIF_GARAMOND = '"EB Garamond", "Cormorant Garamond", Garamond, Georgia, serif';
const SERIF_SLAB = '"Fraunces", "Roboto Slab", "Rockwell", serif';
const SERIF_TIMES = '"Times New Roman", Times, serif';
const SANS_INTER = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';
const SANS_GROTESK = '"Space Grotesk", "Inter", -apple-system, sans-serif';
const SANS_CONDENSED = '"Archivo Narrow", "Oswald", "Helvetica Neue Condensed", "Inter", sans-serif';
const SANS_DISPLAY = '"Archivo Black", "Anton", "Inter", -apple-system, sans-serif';
const MONO_JETBRAINS = '"JetBrains Mono", "IBM Plex Mono", "SF Mono", Menlo, monospace';

/* ─────────────────────────────────────────────────────────────────
   1 · EDITORIAL HERITAGE — luxury silent
   Hermès, Bottega Veneta, The Row, Loewe
   ────────────────────────────────────────────────────────────── */
const editorialHeritage: Theme = {
  id: 'editorial-heritage',
  name: 'Editorial Heritage',
  archetype: 'Luxury silent · Muted serif · Editorial restraint',
  status: 'wired',
  tokens: {
    bg: '#F5F2EB',
    surface: '#FFFFFF',
    fg: '#0F0E0C',
    mute: '#7A726A',
    accent: '#8C6E3F',
    accent2: '#2A2622',
    border: 'rgba(15,14,12,0.10)',
    displayFont: SERIF_DIDONE,
    bodyFont: SERIF_GARAMOND,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 400,
    displayTracking: '-0.02em',
    bodyTracking: '0',
    radius: '0px',
    density: 'spacious',
    photoTreatment: 'full-bleed',
  },
};

/* ─────────────────────────────────────────────────────────────────
   2 · STREETWEAR DROP — urban hype
   Supreme, Off-White, Stüssy, Palace
   ────────────────────────────────────────────────────────────── */
const streetwearDrop: Theme = {
  id: 'streetwear-drop',
  name: 'Streetwear Drop',
  archetype: 'Urban hype · Condensed uppercase · Drop-culture',
  status: 'wired',
  tokens: {
    bg: '#0A0A0A',
    surface: '#1A1A1A',
    fg: '#FFFFFF',
    mute: 'rgba(255,255,255,0.55)',
    accent: '#FF3B1F',
    accent2: '#FFEB3B',
    border: 'rgba(255,255,255,0.12)',
    displayFont: SANS_DISPLAY,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'upper',
    displayWeight: 900,
    displayTracking: '-0.04em',
    bodyTracking: '0',
    radius: '0px',
    density: 'tight',
    photoTreatment: 'editorial-grid',
  },
};

/* ─────────────────────────────────────────────────────────────────
   3 · ROMANTIC FEMININE — soft dreamy
   Zimmermann, Cecilie Bahnsen, Ulla Johnson
   ────────────────────────────────────────────────────────────── */
const romanticFeminine: Theme = {
  id: 'romantic-feminine',
  name: 'Romantic Feminine',
  archetype: 'Soft dreamy · Blush palette · Garamond italic',
  status: 'wired',
  tokens: {
    bg: '#FAF1EC',
    surface: '#FFFFFF',
    fg: '#3A2A28',
    mute: '#8B6F66',
    accent: '#C97A6E',
    accent2: '#D9B370',
    border: 'rgba(58,42,40,0.10)',
    displayFont: SERIF_GARAMOND,
    bodyFont: SERIF_GARAMOND,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 400,
    displayTracking: '-0.01em',
    bodyTracking: '0',
    radius: '24px',
    density: 'spacious',
    photoTreatment: 'soft-focus',
  },
};

/* ─────────────────────────────────────────────────────────────────
   4 · MINIMAL ARCHITECT — swiss geometric
   Jil Sander, COS, Lemaire, Phoebe Philo Céline
   ────────────────────────────────────────────────────────────── */
const minimalArchitect: Theme = {
  id: 'minimal-architect',
  name: 'Minimal Architect',
  archetype: 'Swiss geometric · Monochrome · Modular grid',
  status: 'wired',
  tokens: {
    bg: '#FFFFFF',
    surface: '#F4F4F4',
    fg: '#0A0A0A',
    mute: '#8C8C8C',
    accent: '#0A0A0A',
    accent2: '#D8D8D8',
    border: 'rgba(10,10,10,0.08)',
    displayFont: SANS_INTER,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 500,
    displayTracking: '-0.03em',
    bodyTracking: '0',
    radius: '2px',
    density: 'balanced',
    photoTreatment: 'framed',
  },
};

/* ─────────────────────────────────────────────────────────────────
   5 · PERFORMANCE TECH — data dynamic
   Nike, ON Running, ACRONYM, ASICS
   ────────────────────────────────────────────────────────────── */
const performanceTech: Theme = {
  id: 'performance-tech',
  name: 'Performance Tech',
  archetype: 'Data dynamic · Neon accents · Technical type',
  status: 'wired',
  tokens: {
    bg: '#0E0E10',
    surface: '#19191D',
    fg: '#F2F2F2',
    mute: 'rgba(242,242,242,0.55)',
    accent: '#C7FF3D',
    accent2: '#3DFFE1',
    border: 'rgba(242,242,242,0.10)',
    displayFont: SANS_GROTESK,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'upper',
    displayWeight: 700,
    displayTracking: '-0.02em',
    bodyTracking: '0.01em',
    radius: '4px',
    density: 'tight',
    photoTreatment: 'editorial-grid',
  },
};

/* ─────────────────────────────────────────────────────────────────
   6 · AVANT-GARDE CONCEPT — art-book
   Rick Owens, Margiela, CdG, Yohji
   ────────────────────────────────────────────────────────────── */
const avantGardeConcept: Theme = {
  id: 'avant-garde-concept',
  name: 'Avant-Garde Concept',
  archetype: 'Art-book · Stark contrast · Off-grid composition',
  status: 'wired',
  tokens: {
    bg: '#FAFAF5',
    surface: '#FFFFFF',
    fg: '#0A0A0A',
    mute: '#5C5C5C',
    accent: '#A30000',
    accent2: '#0A0A0A',
    border: 'rgba(10,10,10,0.20)',
    displayFont: SERIF_TIMES,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 400,
    displayTracking: '-0.04em',
    bodyTracking: '0',
    radius: '0px',
    density: 'spacious',
    photoTreatment: 'raw-scan',
  },
};

/* ─────────────────────────────────────────────────────────────────
   7 · SUSTAINABLE CRAFT — earth transparency  (preview)
   ────────────────────────────────────────────────────────────── */
const sustainableCraft: Theme = {
  id: 'sustainable-craft',
  name: 'Sustainable Craft',
  archetype: 'Earth transparency · Slab serif · Craft warmth',
  status: 'preview',
  tokens: {
    bg: '#EEE6D7',
    surface: '#F8F2E4',
    fg: '#3D2E1F',
    mute: '#7C6B55',
    accent: '#B85C2A',
    accent2: '#7A8B5C',
    border: 'rgba(61,46,31,0.18)',
    displayFont: SERIF_SLAB,
    bodyFont: SERIF_GARAMOND,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 600,
    displayTracking: '-0.02em',
    bodyTracking: '0',
    radius: '8px',
    density: 'balanced',
    photoTreatment: 'soft-focus',
  },
};

/* ─────────────────────────────────────────────────────────────────
   8 · Y2K DIGITAL NATIVE — chrome glitch  (preview)
   ────────────────────────────────────────────────────────────── */
const y2kDigital: Theme = {
  id: 'y2k-digital',
  name: 'Y2K Digital Native',
  archetype: 'Chrome glitch · Neon-on-black · Mono display',
  status: 'preview',
  tokens: {
    bg: '#0F0F1A',
    surface: '#1A1A2E',
    fg: '#E5E5FF',
    mute: 'rgba(229,229,255,0.55)',
    accent: '#FF00E5',
    accent2: '#00E5FF',
    border: 'rgba(229,229,255,0.16)',
    displayFont: MONO_JETBRAINS,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'upper',
    displayWeight: 700,
    displayTracking: '0.02em',
    bodyTracking: '0',
    radius: '0px',
    density: 'tight',
    photoTreatment: 'editorial-grid',
  },
};

/* ─────────────────────────────────────────────────────────────────
   9 · WORKWEAR HERITAGE — utility blueprint  (preview)
   ────────────────────────────────────────────────────────────── */
const workwearHeritage: Theme = {
  id: 'workwear-heritage',
  name: 'Workwear Heritage',
  archetype: 'Utility blueprint · Condensed uppercase · Sand + indigo',
  status: 'preview',
  tokens: {
    bg: '#E8E2D2',
    surface: '#F2EDDD',
    fg: '#1F2937',
    mute: '#5C6470',
    accent: '#1B3A5C',
    accent2: '#8C5A2B',
    border: 'rgba(31,41,55,0.20)',
    displayFont: SANS_CONDENSED,
    bodyFont: MONO_JETBRAINS,
    monoFont: MONO_JETBRAINS,
    displayCase: 'upper',
    displayWeight: 700,
    displayTracking: '0.04em',
    bodyTracking: '0.02em',
    radius: '0px',
    density: 'tight',
    photoTreatment: 'framed',
  },
};

/* ─────────────────────────────────────────────────────────────────
   10 · RESORT LUXE — Mediterranean sun  (preview)
   ────────────────────────────────────────────────────────────── */
const resortLuxe: Theme = {
  id: 'resort-luxe',
  name: 'Resort Luxe',
  archetype: 'Mediterranean sun · Cobalt + terracotta · Rounded luxury',
  status: 'preview',
  tokens: {
    bg: '#F4EAD8',
    surface: '#FFF7E6',
    fg: '#5C2E1A',
    mute: '#A37452',
    accent: '#0F4C75',
    accent2: '#E27D2C',
    border: 'rgba(92,46,26,0.14)',
    displayFont: SERIF_GARAMOND,
    bodyFont: SANS_INTER,
    monoFont: MONO_JETBRAINS,
    displayCase: 'normal',
    displayWeight: 500,
    displayTracking: '-0.01em',
    bodyTracking: '0',
    radius: '32px',
    density: 'spacious',
    photoTreatment: 'full-bleed',
  },
};

/* Catalog (ordered: 6 wired first, then 4 previews) */
export const THEMES: Theme[] = [
  editorialHeritage,
  streetwearDrop,
  romanticFeminine,
  minimalArchitect,
  performanceTech,
  avantGardeConcept,
  sustainableCraft,
  y2kDigital,
  workwearHeritage,
  resortLuxe,
];

export const DEFAULT_THEME_ID = 'editorial-heritage';

export function getTheme(id: string | undefined | null): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

/* Inline-style object that injects all theme tokens as CSS variables.
   Apply at the deck root → templates consume via `var(--p-bg)` etc. */
export function themeStyle(theme: Theme): React.CSSProperties {
  const t = theme.tokens;
  return {
    '--p-bg': t.bg,
    '--p-surface': t.surface,
    '--p-fg': t.fg,
    '--p-mute': t.mute,
    '--p-accent': t.accent,
    '--p-accent2': t.accent2,
    '--p-border': t.border,
    '--p-display-font': t.displayFont,
    '--p-body-font': t.bodyFont,
    '--p-mono-font': t.monoFont,
    '--p-display-weight': String(t.displayWeight),
    '--p-display-tracking': t.displayTracking,
    '--p-body-tracking': t.bodyTracking,
    '--p-radius': t.radius,
  } as React.CSSProperties;
}
