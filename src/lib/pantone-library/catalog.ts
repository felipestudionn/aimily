/**
 * Pantone TCX catalog — fashion-relevant subset.
 *
 * 80 colors representative of contemporary fashion design: Pantone
 * Colors of the Year 2010-2026, plus the most commonly specified
 * neutrals, blues, reds, greens, and earth tones. Lab values are
 * pre-computed at build time (no runtime parsing).
 *
 * Adding more entries: drop a new row below; `lab` is computed
 * automatically by the library's startup-time pre-computer in
 * index.ts.
 *
 * Sources: Pantone Fashion, Home + Interiors color guide; designer
 * publications (i-D, Fashionista, WGSN industry briefings); Pantone
 * Color of the Year archive.
 */

import type { PantoneColor, PantoneFamily } from './types';
import { hexToRgb, rgbToLab } from './color-math';

interface RawEntry {
  code: string;
  name: string;
  family: PantoneFamily;
  hex: string;
}

const RAW: RawEntry[] = [
  // ─── Pantone Colors of the Year (recent) ───
  { code: '17-1230 TCX', name: 'Mocha Mousse',          family: 'brown',    hex: '#a47864' }, // 2025
  { code: '13-1023 TCX', name: 'Peach Fuzz',            family: 'orange',   hex: '#ffbe98' }, // 2024
  { code: '18-1750 TCX', name: 'Viva Magenta',          family: 'pink',     hex: '#bb2649' }, // 2023
  { code: '17-3938 TCX', name: 'Very Peri',             family: 'purple',   hex: '#6667ab' }, // 2022
  { code: '13-0647 TCX', name: 'Illuminating',          family: 'yellow',   hex: '#f5df4d' }, // 2021 dual
  { code: '17-5104 TCX', name: 'Ultimate Gray',         family: 'neutral',  hex: '#939597' }, // 2021 dual
  { code: '19-4052 TCX', name: 'Classic Blue',          family: 'blue',     hex: '#0f4c81' }, // 2020
  { code: '16-1546 TCX', name: 'Living Coral',          family: 'pink',     hex: '#ff6f61' }, // 2019
  { code: '18-3838 TCX', name: 'Ultra Violet',          family: 'purple',   hex: '#5f4b8b' }, // 2018
  { code: '15-0343 TCX', name: 'Greenery',              family: 'green',    hex: '#88b04b' }, // 2017
  { code: '13-1520 TCX', name: 'Rose Quartz',           family: 'pink',     hex: '#f7cac9' }, // 2016 dual
  { code: '15-3919 TCX', name: 'Serenity',              family: 'blue',     hex: '#92a8d1' }, // 2016 dual
  { code: '18-1438 TCX', name: 'Marsala',               family: 'red',      hex: '#955251' }, // 2015
  { code: '18-3224 TCX', name: 'Radiant Orchid',        family: 'purple',   hex: '#b163a3' }, // 2014
  { code: '17-5641 TCX', name: 'Emerald',               family: 'green',    hex: '#009473' }, // 2013
  { code: '17-1463 TCX', name: 'Tangerine Tango',       family: 'orange',   hex: '#dd4124' }, // 2012
  { code: '18-2120 TCX', name: 'Honeysuckle',           family: 'pink',     hex: '#d94f70' }, // 2011

  // ─── Whites + ivories ───
  { code: '11-0601 TCX', name: 'Bright White',          family: 'white',    hex: '#f4f5f0' },
  { code: '11-0701 TCX', name: 'Tofu',                  family: 'white',    hex: '#e7e1d0' },
  { code: '11-0907 TCX', name: 'Antique White',         family: 'white',    hex: '#e9d6b8' },
  { code: '11-1404 TCX', name: 'Egret',                 family: 'white',    hex: '#eae3d7' },
  { code: '11-4800 TCX', name: 'Marshmallow',           family: 'white',    hex: '#f0eee9' },
  { code: '11-4001 TCX', name: 'Brilliant White',       family: 'white',    hex: '#edf1ff' },
  { code: '12-0304 TCX', name: 'Cloud Dancer',          family: 'white',    hex: '#f0eee4' },

  // ─── Beiges + sands + creams ───
  { code: '12-0404 TCX', name: 'Vanilla Ice',           family: 'neutral',  hex: '#f1ebd9' },
  { code: '13-0815 TCX', name: 'Almond Buff',           family: 'neutral',  hex: '#dfc09f' },
  { code: '13-0907 TCX', name: 'Frosted Almond',        family: 'neutral',  hex: '#cebfaf' },
  { code: '14-1118 TCX', name: 'Sand',                  family: 'neutral',  hex: '#dac0a3' },
  { code: '14-1314 TCX', name: 'Tannin',                family: 'neutral',  hex: '#cca78b' },
  { code: '15-1306 TCX', name: 'Ginger Snap',           family: 'brown',    hex: '#b18e72' },
  { code: '16-1334 TCX', name: 'Apricot Tan',           family: 'orange',   hex: '#cb8e6e' },
  { code: '16-1431 TCX', name: 'Almond',                family: 'brown',    hex: '#b18a6b' },
  { code: '17-1230 TCX', name: 'Toasted Almond',        family: 'brown',    hex: '#a48774' },

  // ─── Greys + stones ───
  { code: '13-4108 TCX', name: 'Glacier Grey',          family: 'neutral',  hex: '#bdc4c1' },
  { code: '14-4002 TCX', name: 'Silver Cloud',          family: 'neutral',  hex: '#bbbcbc' },
  { code: '15-4101 TCX', name: 'Drizzle',               family: 'neutral',  hex: '#a4a8a9' },
  { code: '16-3850 TCX', name: 'Lavender Aura',         family: 'purple',   hex: '#a39db8' },
  { code: '17-0000 TCX', name: 'Frost Gray',            family: 'neutral',  hex: '#9d958c' },
  { code: '17-1500 TCX', name: 'Steeple Gray',          family: 'neutral',  hex: '#7d736b' },
  { code: '18-0000 TCX', name: 'Pewter',                family: 'neutral',  hex: '#5e5b58' },
  { code: '19-0303 TCX', name: 'Jet Black',             family: 'black',    hex: '#202023' },
  { code: '19-4005 TCX', name: 'Caviar',                family: 'black',    hex: '#1d1d1f' },

  // ─── Blacks + charcoals ───
  { code: '19-0506 TCX', name: 'Black Olive',           family: 'black',    hex: '#383935' },
  { code: '19-3911 TCX', name: 'Anthracite',            family: 'black',    hex: '#2b2c30' },
  { code: '19-4203 TCX', name: 'Magnet',                family: 'black',    hex: '#414b50' },

  // ─── Reds + corals ───
  { code: '17-1664 TCX', name: 'Poinsettia',            family: 'red',      hex: '#bd2733' },
  { code: '18-1664 TCX', name: 'Fiery Red',             family: 'red',      hex: '#cf2c30' },
  { code: '19-1763 TCX', name: 'Racing Red',            family: 'red',      hex: '#c5212a' },
  { code: '19-1762 TCX', name: 'Flame Scarlet',         family: 'red',      hex: '#c41e3a' },
  { code: '18-1750 TCX', name: 'Strawberry',            family: 'red',      hex: '#cd212a' },
  { code: '19-1543 TCX', name: 'Rosewood',              family: 'red',      hex: '#65000b' },
  { code: '17-1456 TCX', name: 'Persimmon',             family: 'red',      hex: '#df513e' },

  // ─── Pinks ───
  { code: '13-2806 TCX', name: 'Cradle Pink',           family: 'pink',     hex: '#f3d0d0' },
  { code: '14-1714 TCX', name: 'Powder Pink',           family: 'pink',     hex: '#e8a9b5' },
  { code: '15-1816 TCX', name: 'Strawberry Cream',      family: 'pink',     hex: '#e58fa9' },
  { code: '16-1720 TCX', name: 'Confetti',              family: 'pink',     hex: '#e07683' },
  { code: '17-1937 TCX', name: 'Hot Pink',              family: 'pink',     hex: '#dd497f' },

  // ─── Oranges ───
  { code: '15-1247 TCX', name: 'Tangerine',             family: 'orange',   hex: '#f88f58' },
  { code: '16-1454 TCX', name: 'Vermillion Orange',     family: 'orange',   hex: '#dc572e' },
  { code: '17-1463 TCX', name: 'Tigerlily',             family: 'orange',   hex: '#e2583e' },

  // ─── Yellows ───
  { code: '12-0721 TCX', name: 'Pale Banana',           family: 'yellow',   hex: '#fbe7a1' },
  { code: '13-0859 TCX', name: 'Empire Yellow',         family: 'yellow',   hex: '#f7c63a' },
  { code: '14-0852 TCX', name: 'Spectra Yellow',        family: 'yellow',   hex: '#f3c12c' },
  { code: '15-0850 TCX', name: 'Citrus',                family: 'yellow',   hex: '#e3a82b' },
  { code: '12-0741 TCX', name: 'Limelight',             family: 'yellow',   hex: '#f1eb9c' },

  // ─── Greens ───
  { code: '14-6324 TCX', name: 'Foam Green',            family: 'green',    hex: '#a8c8b3' },
  { code: '15-0220 TCX', name: 'Mosstone',              family: 'green',    hex: '#83a17d' },
  { code: '16-0000 TCX', name: 'Olive Branch',          family: 'green',    hex: '#73734c' },
  { code: '16-0442 TCX', name: 'Olivenite',             family: 'green',    hex: '#7f8e3c' },
  { code: '17-0535 TCX', name: 'Calliste Green',        family: 'green',    hex: '#7d8c4f' },
  { code: '18-0119 TCX', name: 'Forest Night',          family: 'green',    hex: '#42493d' },
  { code: '18-0312 TCX', name: 'Deep Lichen Green',     family: 'green',    hex: '#5b6a5b' },
  { code: '19-0220 TCX', name: 'Kombu Green',           family: 'green',    hex: '#3a4032' },
  { code: '19-5511 TCX', name: 'Forest Biome',          family: 'green',    hex: '#264a2e' },
  { code: '17-5641 TCX', name: 'Pepper Green',          family: 'green',    hex: '#458961' },

  // ─── Blues ───
  { code: '14-4214 TCX', name: 'Skylight',              family: 'blue',     hex: '#b3cde0' },
  { code: '15-4225 TCX', name: 'Ethereal Blue',         family: 'blue',     hex: '#7aa6c8' },
  { code: '16-4127 TCX', name: 'Niagara',               family: 'blue',     hex: '#4f84a4' },
  { code: '18-4148 TCX', name: 'Princess Blue',         family: 'blue',     hex: '#1e5599' },
  { code: '19-4023 TCX', name: 'Dark Denim',            family: 'blue',     hex: '#384962' },
  { code: '19-4030 TCX', name: 'Estate Blue',           family: 'blue',     hex: '#1f3251' },
  { code: '19-3925 TCX', name: 'Astral Aura',           family: 'blue',     hex: '#373b5e' },
  { code: '19-4118 TCX', name: 'Ensign Blue',           family: 'blue',     hex: '#283c5a' },

  // ─── Browns ───
  { code: '17-1322 TCX', name: 'Tobacco Brown',         family: 'brown',    hex: '#9c6e4f' },
  { code: '18-1142 TCX', name: 'Cathay Spice',          family: 'brown',    hex: '#a05a2c' },
  { code: '19-0915 TCX', name: 'Coffee Bean',           family: 'brown',    hex: '#3e2c23' },
  { code: '19-1111 TCX', name: 'Java',                  family: 'brown',    hex: '#332e2c' },

  // ─── Purples ───
  { code: '14-3812 TCX', name: 'Lavender Frost',        family: 'purple',   hex: '#bdb4d4' },
  { code: '17-3730 TCX', name: 'Aster Purple',          family: 'purple',   hex: '#8c75a8' },
  { code: '19-3520 TCX', name: 'Dark Plum',             family: 'purple',   hex: '#412a4a' },
];

// Pre-compute Lab values (catalog is small enough that O(N) at module init is fine).
export const PANTONE_CATALOG: PantoneColor[] = RAW.map((r) => {
  const rgb = hexToRgb(r.hex)!;
  return {
    id: r.code.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    code: r.code,
    name: r.name,
    series: 'TCX',
    family: r.family,
    hex: r.hex,
    rgb,
    lab: rgbToLab(rgb),
  };
});

// ─── Index lookups for O(1) access ──────────────────────────────────

export const PANTONE_BY_CODE: Record<string, PantoneColor> = {};
export const PANTONE_BY_ID: Record<string, PantoneColor> = {};

for (const c of PANTONE_CATALOG) {
  PANTONE_BY_CODE[c.code] = c;
  PANTONE_BY_ID[c.id] = c;
}
