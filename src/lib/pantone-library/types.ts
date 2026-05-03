/**
 * Pantone TCX / TPX library — type system
 *
 * Canonical industry reference for textile color codes. The catalog
 * stores codes + sRGB hex + Lab values so we can:
 *   1. Browse / search by name or code
 *   2. Match a freeform hex to its closest Pantone (Lab ΔE2000)
 *   3. Pre-populate sku_colorways.pantone_primary + tech_pack
 *      materials.zones[].pantone with verified codes
 *
 * Legal note: Pantone codes (e.g. "18-1664 TCX") are industry references
 * widely used across fashion software; using the codes as identifiers is
 * standard practice. We do NOT redistribute Pantone's proprietary
 * formula guides or use Pantone-the-company branding in the UI beyond
 * the codes themselves. Hex values published here are public-source
 * approximations; the catalog is for designer ideation, not contractual
 * color matching (factories must still receive a physical chip or a
 * digital LAB target via the brand's normal color-management workflow).
 */

/** Series of Pantone color books. */
export type PantoneSeries =
  | 'TCX'    // Textile Cotton eXtended — 2,625 cotton-based colors (most common in fashion)
  | 'TPX'    // Textile Paper eXtended — 2,310 paper-based colors (legacy / interior + apparel)
  | 'TPG'    // Textile Paper Green — newer eco-friendly paper version of TPX
  | 'PMS';   // Pantone Matching System — uncoated/coated print colors (some used in fashion)

/** Canonical color family bucket (mirrors Pantone's own family browser). */
export type PantoneFamily =
  | 'red' | 'pink' | 'orange' | 'yellow' | 'green'
  | 'blue' | 'purple' | 'brown' | 'neutral' | 'white' | 'black'
  | 'metallic';

/** sRGB color, channels 0-255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** CIE Lab color (used for perceptual distance in ΔE2000). */
export interface Lab {
  l: number;  // 0-100
  a: number;  // typically -128 to +127
  b: number;  // typically -128 to +127
}

/** Single Pantone color entry. */
export interface PantoneColor {
  /** Stable id for React keys + DB linkage. */
  id: string;
  /** Full code as used industry-wide, e.g. "18-1664 TCX" or "11-0601 TCX". */
  code: string;
  /** Pantone name, e.g. "Fiery Red", "Cloud Dancer". */
  name: string;
  /** Series the color belongs to. */
  series: PantoneSeries;
  /** Color family for grouping in the picker. */
  family: PantoneFamily;
  /** sRGB hex string lowercase, e.g. "#cb2c30". */
  hex: string;
  /** Pre-computed RGB channels (avoid parsing hex on every render). */
  rgb: RGB;
  /** Pre-computed CIE Lab (used for ΔE2000 closest-match without recomputation). */
  lab: Lab;
}

/** A Pantone color plus its perceptual distance from a target hex. */
export interface PantoneMatch extends PantoneColor {
  /** ΔE2000 distance — lower is closer. <1 imperceptible, <5 close, >10 noticeably different. */
  delta: number;
}
