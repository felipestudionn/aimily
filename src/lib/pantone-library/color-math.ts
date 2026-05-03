/**
 * Color math for the Pantone library.
 *
 * Pure functions, no DOM. Used to:
 *   - Convert sRGB hex → Lab so we can compare any user-picked color
 *     against the catalog perceptually.
 *   - Score perceptual distance via the standard CIEDE2000 formula
 *     (industry default for textile color matching).
 */

import type { RGB, Lab } from './types';

// ─── Hex / RGB ────────────────────────────────────────────────────────

/** Parse a "#rrggbb" or "rrggbb" hex string into RGB. Returns null on invalid input. */
export function hexToRgb(hex: string): RGB | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Convert RGB to a normalized "#rrggbb" hex string (lowercase). */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// ─── sRGB → CIE Lab ──────────────────────────────────────────────────

/**
 * sRGB (0-255) → CIE Lab (D65 illuminant, 2° observer).
 * Reference: https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation
 */
export function rgbToLab(rgb: RGB): Lab {
  // Step 1: sRGB companding (gamma reverse)
  const srgbToLinear = (c: number) => {
    const cn = c / 255;
    return cn <= 0.04045 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
  };
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  // Step 2: Linear sRGB → XYZ (D65, M_RGB→XYZ)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  // Step 3: XYZ → Lab (D65 white point Xn=0.95047, Yn=1, Zn=1.08883)
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** Convenience: hex → Lab in one step. Returns null on invalid hex. */
export function hexToLab(hex: string): Lab | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToLab(rgb);
}

// ─── ΔE2000 ──────────────────────────────────────────────────────────

/**
 * CIEDE2000 color difference. The standard for perceptual distance
 * across textile + print + cosmetic industries since 2001.
 *
 * Reference: G. Sharma, W. Wu, E. N. Dalal (2005), "The CIEDE2000
 * Color-Difference Formula: Implementation Notes, Supplementary
 * Test Data, and Mathematical Observations".
 *
 * Result interpretation:
 *   ΔE < 1     — imperceptible
 *   ΔE 1 - 2   — only trained observers notice
 *   ΔE 2 - 5   — slight but perceptible
 *   ΔE 5 - 10  — clearly perceptible, still in the "neighborhood"
 *   ΔE > 10    — different colors
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const { l: l1, a: a1, b: b1 } = lab1;
  const { l: l2, a: a2, b: b2 } = lab2;

  const avgL = (l1 + l2) / 2;
  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (c1 + c2) / 2;

  const g = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.sqrt(a1p * a1p + b1 * b1);
  const c2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (c1p + c2p) / 2;

  const h1p = hPrime(b1, a1p);
  const h2p = hPrime(b2, a2p);

  const dHp =
    Math.abs(h1p - h2p) <= 180
      ? h2p - h1p
      : h2p <= h1p
      ? h2p - h1p + 360
      : h2p - h1p - 360;

  const dLp = l2 - l1;
  const dCp = c2p - c1p;
  const dHpFinal = 2 * Math.sqrt(c1p * c2p) * Math.sin(deg2rad(dHp) / 2);

  let avgHp: number;
  if (c1p * c2p === 0) {
    avgHp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    avgHp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    avgHp = (h1p + h2p + 360) / 2;
  } else {
    avgHp = (h1p + h2p - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(deg2rad(avgHp - 30)) +
    0.24 * Math.cos(deg2rad(2 * avgHp)) +
    0.32 * Math.cos(deg2rad(3 * avgHp + 6)) -
    0.2 * Math.cos(deg2rad(4 * avgHp - 63));

  const sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * t;

  const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const rt = -rc * Math.sin(2 * deg2rad(dTheta));

  const kL = 1, kC = 1, kH = 1;
  const term1 = dLp / (kL * sl);
  const term2 = dCp / (kC * sc);
  const term3 = dHpFinal / (kH * sh);

  return Math.sqrt(term1 * term1 + term2 * term2 + term3 * term3 + rt * term2 * term3);
}

function hPrime(b: number, ap: number): number {
  if (b === 0 && ap === 0) return 0;
  const angle = rad2deg(Math.atan2(b, ap));
  return angle >= 0 ? angle : angle + 360;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

function rad2deg(r: number): number {
  return (r * 180) / Math.PI;
}
