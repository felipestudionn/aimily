/**
 * Phase 7 — RSL annotation layer.
 *
 * Applies REACH / AAFA-RSL / CPSIA / CITES flags to the catalog at
 * module init, without touching the rama-*.ts files. Two strategies:
 *
 *   1. Family-level rules — every Material with `family === X`
 *      receives the listed flags. Used for blanket cases (every
 *      conventional chrome-tanned leather has chromium-VI risk).
 *
 *   2. Name-substring rules — fine-grained overrides where the family
 *      isn't specific enough (e.g. "real fur" inside an otherwise
 *      generic "fur trim" entry). These run AFTER family rules so
 *      they can append flags but never overwrite.
 *
 * Both strategies write into `Material.rslFlags`. Findings produced
 * by these flags surface as 'violation' severity in the compliance
 * engine — the catalog is curated, so when it says "this material
 * has a flag", we mean it.
 *
 * If you want the heuristics to be 'warning' rather than 'violation',
 * use the engine's FAMILY_HEURISTICS instead. Catalog-level rslFlags
 * are the strong signal.
 */

import type { Material, MaterialFamily } from './types';

// Family-level flags. These apply to EVERY entry of the family unless
// the entry's name explicitly opts out (e.g. "veg-tanned" leather).
const FAMILY_FLAGS: Partial<Record<MaterialFamily, string[]>> = {
  // Chrome tanning is the default for leather; we mark catalog entries
  // unless the name signals an alternative tanning method.
  'leather-animal': ['chromium-vi-untested'],
  'leather-synthetic-pu': ['phthalates-pu', 'pfas-coating-possible'],
  // Synthetic dyeing without OEKO-TEX cert can release azo-aryl-amines.
  // Marked 'untested' so the user uplifts via certification when adding
  // certs to the SKU.
  synthetic: ['azo-dye-untested'],
  // Hardware in skin contact must clear EN 1811 nickel-release.
  'hardware-button': ['nickel-release-untested'],
  'hardware-zipper': ['nickel-release-untested'],
  'hardware-snap': ['nickel-release-untested'],
  'hardware-eyelet': ['nickel-release-untested'],
  'hardware-buckle': ['nickel-release-untested'],
};

// Name-substring rules. Run after family rules.
const NAME_RULES: Array<{ keywords: string[]; flags: string[] }> = [
  { keywords: ['pvc', 'vinyl'], flags: ['phthalate-pvc', 'reach-restricted'] },
  { keywords: ['chrome', 'chrome-tanned'], flags: ['chromium-vi-untested'] },
  { keywords: ['real fur', 'fur trim', 'mink', 'sable', 'fox fur'], flags: ['cites-fur', 'eu-retailer-banned'] },
  { keywords: ['exotic', 'crocodile', 'python', 'alligator'], flags: ['cites-exotic'] },
  { keywords: ['lead', 'lead-painted', 'lead-coated'], flags: ['cpsia-lead'] },
  { keywords: ['cadmium'], flags: ['cpsia-cadmium'] },
  { keywords: ['formaldehyde'], flags: ['formaldehyde-resin'] },
  { keywords: ['pfc', 'pfas', 'fluorocarbon'], flags: ['pfas-restricted'] },
];

// Names that opt OUT of the family-level chrome flag (vegetable-tanned,
// LWG-certified, etc.). When matched, we skip the family flag for that
// entry; name-rule flags still apply.
const LEATHER_OPT_OUT_KEYWORDS = ['veg-tan', 'vegetable-tan', 'vegetable tanned', 'lwg', 'olive-tan', 'aldehyde-tan'];

/**
 * Mutates the catalog in-place to attach rslFlags. Idempotent — calling
 * twice produces the same result. Returns the catalog for chaining.
 */
export function annotateRslFlags(catalog: Material[]): Material[] {
  for (const m of catalog) {
    const flags = new Set<string>(m.rslFlags ?? []);
    const name = m.name.toLowerCase();
    const optOutLeather =
      m.family === 'leather-animal' && LEATHER_OPT_OUT_KEYWORDS.some((k) => name.includes(k));

    const familyFlags = FAMILY_FLAGS[m.family];
    if (familyFlags && !optOutLeather) {
      familyFlags.forEach((f) => flags.add(f));
    }

    for (const rule of NAME_RULES) {
      if (rule.keywords.some((k) => name.includes(k))) {
        rule.flags.forEach((f) => flags.add(f));
      }
    }

    if (flags.size > 0) m.rslFlags = Array.from(flags);
  }
  return catalog;
}
