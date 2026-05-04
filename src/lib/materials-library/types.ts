/**
 * aimily Materials Library — type system
 *
 * Single source of truth for the curated materials catalog. Every entry
 * across all 8 ramas (natural fibers, regenerated, synthetic, leather,
 * hardware, linings, footwear, accessory) conforms to this schema so
 * the filter / scoring engine can rank the same way regardless of family.
 *
 * Three-layer hierarchy:
 *   L1 — Base entry (the canonical fiber/material name; default for "I just want linen")
 *   L2 — Variant (construction × weight × finish; "Linen voile 90gsm")
 *   L3 — B2B commercial supplier (verified mill/tannery/component maker that sells to any brand)
 *
 * Felipe's rule: si no está claro, fuera. L3 entries are conservative —
 * only included when verified by ≥1 source URL. Brand-proprietary tech
 * (Boost, ZoomX, React, Flyknit, etc.) is forbidden.
 */

// ─── Categories & subtypes ────────────────────────────────────────────────

/** Top-level product category — already used across collection_skus.category */
export type CategoryMaster = 'CALZADO' | 'ROPA' | 'ACCESORIOS';

/** Granular product subtype — drives filter precision. */
export type ProductSubtype =
  // ROPA
  | 'dress' | 'top' | 'shirt' | 'blouse' | 'tshirt' | 'polo'
  | 'knitwear-top' | 'sweater' | 'bottom' | 'trouser' | 'jean'
  | 'short' | 'skirt' | 'jumpsuit'
  | 'outerwear-jacket' | 'outerwear-coat' | 'blazer' | 'suit' | 'tailoring'
  | 'lingerie' | 'swimwear' | 'activewear' | 'loungewear'
  // CALZADO
  | 'sneaker' | 'heel' | 'sandal' | 'boot' | 'espadrille' | 'loafer' | 'mule' | 'slipper'
  // ACCESORIOS
  | 'tote' | 'crossbody' | 'clutch' | 'backpack' | 'shoulder' | 'belt'
  | 'jewelry' | 'eyewear' | 'scarf' | 'hat';

// ─── Zones ────────────────────────────────────────────────────────────────

/**
 * Compatibility zones — must align with src/lib/product-zones.ts. A material
 * is offered for a zone only when its `zones` array includes that zone.
 */
export type Zone =
  // ROPA
  | 'Body' | 'Lining' | 'Collar' | 'Cuff' | 'Cuffs'
  | 'Closures' | 'Stitching' | 'Trim' | 'Branding'
  | 'Pocket' | 'Sleeve'
  // CALZADO
  | 'Upper' | 'Tongue' | 'Midsole' | 'Outsole' | 'Laces'
  | 'Heel Counter' | 'Eyelets' | 'Insole'
  // ACCESORIOS
  | 'Hardware' | 'Strap' | 'Padding (insulation)';

// ─── Family ───────────────────────────────────────────────────────────────

/** Top-level material family. Filter engine groups by family in the UI. */
export type MaterialFamily =
  | 'natural-cellulosic'      // cotton, linen, hemp, ramie, jute, bamboo, abaca, piña, kapok, nettle
  | 'natural-animal'          // wool, cashmere, mohair, alpaca, silk, etc.
  | 'regenerated-cellulosic'  // viscose, modal, lyocell, cupro, acetate, lyocell-recycled
  | 'regenerated-protein'     // milk fiber, soybean fiber
  | 'bio-based'               // orange fiber, sea-cell, crabyon, banana
  | 'synthetic'               // polyester, nylon, acrylic, polypropylene, elastane
  | 'synthetic-recycled'      // rPET, recycled nylon (Econyl)
  | 'performance'             // Cordura, Coolmax, Polartec, Gore-Tex, Pertex
  | 'leather-animal'          // cowhide, calfskin, lambskin, etc.
  | 'leather-plant-alt'       // cork, Piñatex, Mylo (if active), Desserto, MIRUM
  | 'leather-synthetic-pu'    // PU leather, vinyl
  | 'hardware-button'
  | 'hardware-zipper'
  | 'hardware-snap'
  | 'hardware-eyelet'
  | 'hardware-buckle'
  | 'hardware-misc'
  | 'thread'
  | 'lining'
  | 'interfacing'
  | 'wadding'                 // down, synthetic down (PrimaLoft, Thermore), batting
  | 'sole-rubber'
  | 'sole-foam'               // EVA, PU, cork foam
  | 'sole-leather'            // stacked leather sole
  | 'sole-textile'            // jute, raffia
  | 'footwear-upper'          // engineered knit, sock, raffia, wicker, ballistic, mesh, canvas duck
  | 'accessory-chain'
  | 'accessory-cord'          // webbing, drawstring
  | 'accessory-decoration';   // sequins, beads, feathers, crystals

// ─── Tiers, aesthetics, seasons ───────────────────────────────────────────

/** Brand price tier — pulled from CIS to filter the catalog contextually. */
export type PriceTier = 'fast' | 'contemporary' | 'premium' | 'luxury';

/** Aesthetic tag — pulled from CIS for relevance scoring. */
export type AestheticTag =
  | 'minimal' | 'romantic' | 'tailored' | 'resort'
  | 'sport' | 'streetwear' | 'workwear' | 'avant-garde'
  | 'sustainable' | 'bohemian' | 'preppy' | 'utility'
  | 'loungewear'; // relaxed at-home aesthetic (terry, fleece, jersey-heavy)

/** Season suitability. */
export type SeasonFit = 'SS' | 'FW' | 'transitional' | 'all-year';

// ─── Certifications ───────────────────────────────────────────────────────

/**
 * Certifications a material may carry. Used in Phase 5 Compliance Hub to
 * roll up brand certifications (currently just informational in P1).
 */
export type Certification =
  | 'OEKO-TEX' | 'OEKO-TEX-MADE-IN-GREEN' | 'OEKO-TEX-STEP'
  | 'GOTS' | 'BCI' | 'Organic-Content-Standard' | 'Fair-Trade'
  | 'Cradle-to-Cradle' | 'EU-Ecolabel' | 'GRS' | 'RCS'
  | 'RWS' | 'RDS'                                    // wool, down (Responsible Wool/Down Standards)
  | 'Woolmark'                                       // Australian Wool Innovation
  | 'ZQ-Merino'                                      // New Zealand Merino Co. program
  | 'NATIVA'                                         // Chargeurs Luxury Materials wool program
  | 'SFA-Cashmere'                                   // Sustainable Fibre Alliance Cashmere Standard
  | 'Good-Cashmere'                                  // The Good Cashmere Standard (Aid by Trade Foundation)
  | 'RMS'                                            // Responsible Mohair Standard
  | 'RAS'                                            // Responsible Alpaca Standard
  | 'FSC' | 'Canopy'                                  // forest certifications for cellulosics
  | 'WISICA'                                          // Sea Island cotton authority
  | 'Supima'                                          // Pima cotton trademark
  | 'Belgian-Linen'                                   // PGI trademark, Belgian Flax & Linen Association
  | 'European-Flax'                                   // CELC — Confédération Européenne du Lin et du Chanvre
  | 'Masters-of-Linen'                                // CELC premium European linen mark
  | 'LWG'                                             // Leather Working Group
  | 'OEKO-TEX-Leather'                                // OEKO-TEX Leather Standard
  | 'Leather-Standard'                                // Generic Leather Standard mark
  | 'REACH'                                           // EU chemical safety
  | 'ECARF'                                           // allergy-friendly
  | 'B-Corp'
  | 'bluesign';                                       // performance / synthetic textile cert (added Rama 3)

// ─── Layers ───────────────────────────────────────────────────────────────

export type Layer = 'L1' | 'L2' | 'L3';

// ─── Weight ranges ────────────────────────────────────────────────────────

export interface WeightRange {
  min: number | null;
  max: number | null;
  unit: 'gsm' | 'oz' | 'oz/yd2' | 'mm' | 'momme' | 'denier' | 'gauge' | 'micron' | null;
}

// ─── Cost hint ────────────────────────────────────────────────────────────

/**
 * Indicative cost per unit, in EUR. Used for the BOM-driven Costing Engine
 * in Phase 2. Always a hint — the user can override per BOM line.
 */
export interface CogsHint {
  value: number;
  unit: 'm' | 'kg' | 'm²' | 'piece' | 'pair';
  currency: 'EUR';
}

// ─── L3 supplier metadata ─────────────────────────────────────────────────

/**
 * Information about a verified B2B supplier (mill, tannery, component
 * maker). Only present on L3 entries.
 */
export interface SupplierMeta {
  /** Country / region of operation. */
  origin: string;
  /** Tier of supplier — not the brand price tier. */
  tier: 'mill' | 'tannery' | 'trim-maker' | 'component-maker' | 'finisher';
  /** Reference URL we used to verify the supplier exists & is B2B. */
  verificationUrl?: string;
  /** Optional second URL for cross-reference (preferred). */
  secondaryUrl?: string;
}

// ─── Material entry ──────────────────────────────────────────────────────

/** The canonical entry shape used across every rama. */
export interface Material {
  /** Stable identifier in kebab-case. Used as React key + filter param. */
  id: string;
  /** Display name shown in the Combobox. */
  name: string;
  /** Layer in the 3-tier hierarchy. */
  layer: Layer;
  /** Parent ID for L2 (back to L1) and L3 (back to L1). Undefined for L1. */
  parentId?: string;
  /** Top-level family (drives Combobox grouping). */
  family: MaterialFamily;
  /** Composition string for tech pack display: "100% linen", "70% wool 30% nylon". */
  composition: string;
  /** Optional fabric/leather weight range. */
  weightRange?: WeightRange;
  /** Default finish to auto-apply when material picked. */
  defaultFinish?: string;
  /** All commonly-available finish options. */
  finishOptions?: string[];
  /** Compatible product zones. */
  zones: Zone[];
  /** Compatible product subtypes. */
  subtypes: ProductSubtype[];
  /** Brand price tiers it makes sense for. */
  priceTier: PriceTier[];
  /** Aesthetic tags it aligns with (used for relevance scoring vs CIS). */
  aestheticTags: AestheticTag[];
  /** Season fit. */
  seasonFit: SeasonFit[];
  /** Certifications typically available for this material. */
  certifications?: Certification[];
  /**
   * Phase 5 — Compliance Hub. Curated REACH/AAFA-RSL/CPSIA flags that
   * apply to this specific entry (vs. the family-level heuristics in
   * the compliance engine). Catalog flags are treated as 'violation'
   * severity — the heuristic layer issues 'warning' to keep the noise
   * floor low. Examples: 'azo-dye-untested', 'phthalate-pvc',
   * 'chromium-vi-untested', 'pfas-coating'.
   */
  rslFlags?: string[];
  /**
   * Phase 8 — Higg MSI 3.7 score (lower = better; unitless impact
   * per kg of material, integrated across water/energy/chemistry/GHG/
   * resource depletion). Populated by `applyHiggScores` annotation
   * layer; specific entries can override at the file level when we
   * have a tested datasheet from a verified mill.
   */
  higgMsi?: number;
  /** True if the material is vegan (no animal-derived inputs). */
  vegan: boolean;
  /**
   * CITES status for protected species (animal leather subset).
   * 'I' = endangered (strictly forbidden trade), 'II' = threatened (regulated trade).
   * Most materials should leave this undefined.
   */
  citesStatus?: 'I' | 'II';
  /** Supplier metadata — present only on L3 entries. */
  supplier?: SupplierMeta;
  /** Cost hint in EUR per appropriate unit. */
  cogsHint?: CogsHint;
  /**
   * Free-text human note attached to the entry. Surfaces in tooltips +
   * tech pack export. Useful for context like "WISICA-certified West Indian Sea Island only".
   */
  notes?: string;
}

// ─── Filter context ──────────────────────────────────────────────────────

/**
 * Inputs the filter engine reads when ranking materials for a given zone.
 * Most fields are optional — when undefined, the filter is permissive.
 */
export interface MaterialFilterContext {
  category: CategoryMaster;
  subtype?: ProductSubtype;
  zone?: Zone;
  /** From CIS — brand's price tier. Filters out incompatible tiers. */
  brandPriceTier?: PriceTier;
  /** From CIS — brand's aesthetic tags. Used for relevance scoring. */
  brandAesthetic?: AestheticTag[];
  /** From collection plan — current season. Filters out out-of-season. */
  season?: SeasonFit;
  /** From CIS — true if the brand is vegan-only. Filters non-vegan out. */
  veganBrand?: boolean;
  /**
   * Optional family filter (e.g. "show only fabrics, not hardware").
   * Combobox UI passes this when grouped tab is selected.
   */
  family?: MaterialFamily;
  /** Optional layer filter — typically L1+L2 for browsing, L3 for procurement. */
  layers?: Layer[];
  /** Free-text query (Cmd-K search). Matches name + composition + supplier name. */
  query?: string;
}

// ─── Scored result ───────────────────────────────────────────────────────

/** A material entry plus its relevance score for the current context. */
export interface ScoredMaterial extends Material {
  /** Higher = more relevant. Score is opaque to the caller. */
  score: number;
}

// ─── Rama metadata ───────────────────────────────────────────────────────

/** Each rama (catalog branch) registers itself with this metadata. */
export interface RamaMeta {
  id: number;
  name: string;
  family: MaterialFamily | MaterialFamily[];
  /** Link to the source markdown research file in .research/. */
  sourceFile: string;
}
