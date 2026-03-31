/* ═══════════════════════════════════════════════════════════
   Sanzo Wada Color System
   Based on "A Dictionary of Color Combinations" (1934) by Sanzo Wada.
   348 palettes curated by Japan's foremost colorist — considered the
   gold standard for harmonious color combinations in fashion and design.

   Wada's principles:
   • Every combination is tested for visual harmony, not just theory
   • Colors are named with poetic precision (Isabella Color, Cossack Green)
   • Palettes balance warm/cool, light/dark, saturated/muted
   • Each combination tells a "color story" — a mood, a season, a world

   Usage in product design:
   • 1st color (dominant) → main body/upper — the identity color
   • 2nd color (secondary) → accent zones — creates visual interest
   • 3rd color (tertiary) → small details, lining, midsole — grounds the palette
   • Neutral zones (outsole, hardware) use complementary neutrals
   ═══════════════════════════════════════════════════════════ */

import palettesData from '@/data/sanzo-palettes.json';

export interface SanzoColor {
  name: string;
  hex: string;
}

export interface SanzoPalette {
  colors: SanzoColor[];
  contrast: number;      // 0-100 lightness range
  temperature: 'warm' | 'cool' | 'mixed';
  mood: string;          // computed mood descriptor
}

/* ── Color math helpers ── */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getTemperature(avgHue: number): 'warm' | 'cool' | 'mixed' {
  if ((avgHue >= 0 && avgHue < 70) || avgHue > 330) return 'warm';
  if (avgHue > 170 && avgHue < 280) return 'cool';
  return 'mixed';
}

function getMood(temp: 'warm' | 'cool' | 'mixed', contrast: number, avgSat: number): string {
  if (contrast > 50 && avgSat > 50) return 'bold';
  if (contrast > 50 && avgSat <= 50) return 'dramatic';
  if (contrast <= 30 && avgSat > 40) return 'rich';
  if (contrast <= 30 && temp === 'warm') return 'earthy';
  if (contrast <= 30 && temp === 'cool') return 'serene';
  if (avgSat < 30) return 'muted';
  return 'balanced';
}

/* ── Build indexed palette collection ── */
function buildPalettes(): SanzoPalette[] {
  return (palettesData as SanzoColor[][]).map(colors => {
    const hsls = colors.map(c => hexToHSL(c.hex));
    const lValues = hsls.map(h => h.l);
    const contrast = Math.max(...lValues) - Math.min(...lValues);
    const avgHue = hsls.reduce((a, b) => a + b.h, 0) / hsls.length;
    const avgSat = hsls.reduce((a, b) => a + b.s, 0) / hsls.length;
    const temperature = getTemperature(avgHue);
    const mood = getMood(temperature, contrast, avgSat);

    return { colors, contrast, temperature, mood };
  });
}

const ALL_PALETTES = buildPalettes();

/* ── Public API ── */

/** Get all 3-color palettes (ideal for product zones: upper + accent + detail) */
export function getTriadPalettes(): SanzoPalette[] {
  return ALL_PALETTES.filter(p => p.colors.length === 3);
}

/** Get high-contrast palettes (lightness range > 35) — best for product visibility */
export function getHighContrastPalettes(): SanzoPalette[] {
  return ALL_PALETTES.filter(p => p.colors.length >= 3 && p.contrast > 35);
}

/** Get palettes by temperature */
export function getPalettesByTemperature(temp: 'warm' | 'cool' | 'mixed'): SanzoPalette[] {
  return ALL_PALETTES.filter(p => p.colors.length >= 3 && p.temperature === temp);
}

/** Get palettes by mood */
export function getPalettesByMood(mood: string): SanzoPalette[] {
  return ALL_PALETTES.filter(p => p.colors.length >= 3 && p.mood === mood);
}

/** Select N random palettes with good contrast for product colorways */
export function selectProductPalettes(count: number = 4, preferHighContrast: boolean = true): SanzoPalette[] {
  const pool = preferHighContrast
    ? ALL_PALETTES.filter(p => p.colors.length >= 3 && p.contrast > 30)
    : ALL_PALETTES.filter(p => p.colors.length >= 3);

  // Shuffle and take N
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Format palettes as context string for AI prompts.
 * Returns a block of text that can be injected into the color-suggest prompt.
 */
export function formatPalettesForPrompt(count: number = 8): string {
  const selected = selectProductPalettes(count, true);

  const formatted = selected.map((p, i) => {
    const colorList = p.colors.map(c => `${c.name} (${c.hex})`).join(', ');
    return `  ${i + 1}. [${p.mood}/${p.temperature}] ${colorList}`;
  }).join('\n');

  return `SANZO WADA REFERENCE PALETTES (from "A Dictionary of Color Combinations", 1934):
These are masterfully curated color harmonies by Sanzo Wada, Japan's foremost colorist.
Use these as INSPIRATION and FOUNDATION for your proposals — adapt them to the product context.

${formatted}

WADA'S PRINCIPLES FOR PRODUCT APPLICATION (60-30-10 rule):
• Color 1 — 60% DOMINANT → upper/body panels. The identity of the product. Use the boldest Wada color here.
• Color 2 — 30% SECONDARY → midsole, structural zones. Must CONTRAST with Color 1. Prefer neutral/light tones (white, cream, gum, bone) to ground the palette visually.
• Color 3 — 10% ACCENT → tongue, heel counter, lining, branding. The "pop" — creates visual interest and completes the story.
• Wada's genius: TENSION between colors — warm vs cool, saturated vs muted, light vs dark. Never 3 colors at the same saturation/lightness.
• If the dominant (upper) is bold/saturated, the secondary (midsole) should be muted/neutral. If the dominant is earthy/muted, allow the accent to carry vibrancy.
• Wada's palette names evoke poetic worlds — "Spinel Red", "Naples Yellow", "Dark Tyrian Blue" — name colorways with this same evocative precision.`;
}

/** Standard neutral colors for structural zones (outsole, hardware, etc.) */
export const NEUTRAL_ZONES: Record<string, string[]> = {
  outsole: ['#F5F0E6', '#D4C9B0', '#2B2B2B', '#8B7D6B', '#E8DFD0'],  // cream, tan, black, gum, light gray
  midsole: ['#FFFFFF', '#F5F0E6', '#E8E4DD', '#D4CBC0', '#2B2B2B'],   // white, cream, bone, stone, black
  hardware: ['#C0C0C0', '#8C8C8C', '#B87333', '#FFD700', '#2B2B2B'],   // silver, gunmetal, copper, gold, matte black
  laces: ['#FFFFFF', '#2B2B2B', '#D4CBC0', '#8B7D6B'],                 // white, black, cream, tan
};
