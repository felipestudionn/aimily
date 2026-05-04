/**
 * Materials Library — public API
 *
 * Aggregates the catalog from every rama into a single in-memory array
 * and exposes the filter/scoring engine to the UI.
 *
 * Catalog is currently empty — entries land here as each rama's research
 * file is converted to TypeScript. Order in CATALOG matches the order in
 * which ramas were researched, but doesn't matter for correctness (the
 * scoring engine handles relevance).
 */

export type {
  Material,
  MaterialFamily,
  CategoryMaster,
  ProductSubtype,
  Zone,
  PriceTier,
  AestheticTag,
  SeasonFit,
  Certification,
  Layer,
  WeightRange,
  CogsHint,
  SupplierMeta,
  MaterialFilterContext,
  ScoredMaterial,
  RamaMeta,
} from './types';

export { scoreMaterial, rankMaterials } from './scoring';

import type { Material, RamaMeta } from './types';

// ─── Rama registry ───────────────────────────────────────────────────────
// Each rama, once converted from .research/*.md to TS data, exports its
// entries from a sibling file (rama-1-natural-fibers.ts, etc.) and the
// import is added below. This keeps the catalog modular — one file per rama.

export const RAMAS: RamaMeta[] = [
  {
    id: 1,
    name: 'Natural fibers',
    family: ['natural-cellulosic', 'natural-animal'],
    sourceFile: '.research/materials-rama-1-natural-fibers.md',
  },
  {
    id: 2,
    name: 'Regenerated and semi-synthetic fibers',
    family: ['regenerated-cellulosic', 'regenerated-protein', 'bio-based'],
    sourceFile: '.research/materials-rama-2-regenerated-fibers.md',
  },
  {
    id: 3,
    name: 'Synthetic and performance fibers',
    family: ['synthetic', 'synthetic-recycled', 'performance'],
    sourceFile: '.research/materials-rama-3-synthetic-performance.md',
  },
  {
    id: 4,
    name: 'Leather and plant-leather alternatives',
    family: ['leather-animal', 'leather-plant-alt', 'leather-synthetic-pu'],
    sourceFile: '.research/materials-rama-4-leather-and-alternatives.md',
  },
  {
    id: 5,
    name: 'Hardware closures',
    family: [
      'hardware-button',
      'hardware-zipper',
      'hardware-snap',
      'hardware-eyelet',
      'hardware-buckle',
      'hardware-misc',
      'thread',
    ],
    sourceFile: '.research/materials-rama-5-hardware-closures.md',
  },
  {
    id: 6,
    name: 'Linings, interfacings, and wadding',
    family: ['lining', 'interfacing', 'wadding'],
    sourceFile: '.research/materials-rama-6-linings-interfacings.md',
  },
  {
    id: 7,
    name: 'Footwear components',
    family: ['sole-rubber', 'sole-foam', 'sole-leather', 'sole-textile'],
    sourceFile: '.research/materials-rama-7-footwear-components.md',
  },
  {
    id: 8,
    name: 'Accessory specifics',
    family: ['accessory-chain', 'accessory-cord', 'accessory-decoration'],
    sourceFile: '.research/materials-rama-8-accessory-specifics.md',
  },
];

// Catalog imports — all 8 ramas wired (Phase 1 catalog complete).
import { rama1 } from './rama-1';
import { rama2 } from './rama-2';
import { rama3 } from './rama-3';
import { rama4 } from './rama-4';
import { rama5 } from './rama-5';
import { rama6 } from './rama-6';
import { rama7 } from './rama-7';
import { rama8 } from './rama-8';

/**
 * Aggregate catalog. All 8 ramas registered. Order doesn't matter for
 * correctness — the rankMaterials engine handles relevance regardless.
 * Combobox + tests depend on this shape (Material[]).
 *
 * Total entries (Phase 1 cleanup, 2026-05-04):
 *   Rama 1 — Natural fibers              ~181
 *   Rama 2 — Regenerated fibers           ~93
 *   Rama 3 — Synthetic + performance     ~166
 *   Rama 4 — Leather + plant-leather alt ~141
 *   Rama 5 — Hardware closures           ~122
 *   Rama 6 — Linings + interfacings      ~135
 *   Rama 7 — Footwear components          ~53
 *   Rama 8 — Accessory specifics          ~72
 *   ───────
 *   Total: ~963 verified entries
 */
import { annotateRslFlags } from './rsl-annotations';
import { applyHiggScores } from './higg-annotations';

// Phase 7+8 — module-init annotations. RSL flags first, then Higg
// MSI scores. Both annotate in place; explicit values on rama
// entries are never overwritten.
export const CATALOG: Material[] = applyHiggScores(
  annotateRslFlags([
    ...rama1,
    ...rama2,
    ...rama3,
    ...rama4,
    ...rama5,
    ...rama6,
    ...rama7,
    ...rama8,
  ]),
);
