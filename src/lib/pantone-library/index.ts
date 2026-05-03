/**
 * Pantone library — public API.
 *
 * Used by:
 *   - <PantonePicker> in src/components/materials/
 *   - sku_colorways.pantone_primary / pantone_secondary writes
 *   - tech_pack_data.materials.zones[].pantone writes
 */

export type {
  PantoneColor,
  PantoneSeries,
  PantoneFamily,
  PantoneMatch,
  RGB,
  Lab,
} from './types';

export { hexToRgb, hexToLab, rgbToHex, rgbToLab, deltaE2000 } from './color-math';

export { PANTONE_CATALOG, PANTONE_BY_CODE, PANTONE_BY_ID } from './catalog';

import { PANTONE_CATALOG } from './catalog';
import { hexToLab, deltaE2000 } from './color-math';
import type { PantoneColor, PantoneMatch, PantoneFamily } from './types';

/**
 * Find the closest Pantone codes to a given hex.
 *
 * Returns up to `limit` matches sorted by perceptual distance (Lab
 * ΔE2000), nearest first. Useful for "I have this color, what
 * Pantone is it?" workflows.
 *
 * Returns empty array if hex is malformed.
 */
export function closestPantone(hex: string, limit = 5, catalog: PantoneColor[] = PANTONE_CATALOG): PantoneMatch[] {
  const targetLab = hexToLab(hex);
  if (!targetLab) return [];

  return catalog
    .map((c) => ({ ...c, delta: deltaE2000(targetLab, c.lab) }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
}

/**
 * Search the catalog by free text.
 *
 * Matches against code, name, and family (case-insensitive). Useful
 * for typeahead in the picker. Returns full catalog entries (no
 * scoring) — caller decides ordering.
 */
export function searchPantone(query: string, limit = 30, catalog: PantoneColor[] = PANTONE_CATALOG): PantoneColor[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return catalog.slice(0, limit);

  return catalog
    .filter((c) => {
      const haystack = `${c.code} ${c.name} ${c.family}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, limit);
}

/** Filter the catalog by family (e.g. all reds). */
export function pantoneByFamily(family: PantoneFamily): PantoneColor[] {
  return PANTONE_CATALOG.filter((c) => c.family === family);
}

/** Catalog size (useful for "showing N of M" UI). */
export const PANTONE_CATALOG_SIZE = PANTONE_CATALOG.length;

/**
 * The 12 family buckets, ordered for UI grouping (warm → cool → neutral).
 */
export const PANTONE_FAMILIES: PantoneFamily[] = [
  'red', 'pink', 'orange', 'yellow',
  'green', 'blue', 'purple',
  'brown', 'neutral', 'white', 'black', 'metallic',
];

export const PANTONE_FAMILY_LABELS: Record<PantoneFamily, string> = {
  red: 'Red',
  pink: 'Pink',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  brown: 'Brown',
  neutral: 'Neutral',
  white: 'White',
  black: 'Black',
  metallic: 'Metallic',
};
