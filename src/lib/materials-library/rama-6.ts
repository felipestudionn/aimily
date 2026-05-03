/**
 * Rama 6 — Linings, Interfacings & Wadding
 *
 * Source: .research/materials-rama-6-linings-interfacings.md
 * (Felipe's "si no está claro, fuera" rule applied — closed/brand-locked
 * insulations and unverifiable mills omitted.)
 *
 * Coverage: 20 inner-construction archetypes across 3 families.
 *   Linings (8):       silk habotai · Bemberg cupro · cotton voile/lawn ·
 *                      polyester taffeta · poly-satin/acetate/triacetate ·
 *                      viscose · stretch · sustainable/recycled
 *   Interfacings (6):  woven fusible · non-woven fusible · hair canvas ·
 *                      weft-insertion · knit/tricot fusible · stay tape
 *   Wadding (6):       RDS down · synthetic insulation · wool batting ·
 *                      cotton batting · polyester fiberfill · reflective
 *
 * Layer counts:
 *   L1: 20 base entries
 *   L2: 62 weight × construction × sustainability variants
 *   L3: 53 verified B2B supplier-entries (~22 unique mills/component-makers,
 *       cross-listed across multiple L1 categories — e.g. Limonta supplies
 *       Bemberg + polyester + acetate + viscose + stretch linings, hence 5
 *       supplier-entries from the same mill)
 *   ───────
 *   Total: 135 entries
 *
 * Entry order: linings → interfacings → wadding (matches markdown).
 * Within section: L1 → L2 → L3.
 *
 * Notes on conventions used here:
 * - Source uses momme + FP units; types.ts WeightRange supports both via the
 *   enum `'gsm' | 'oz' | 'mm' | 'momme'`. FP (fill power) does not exist in
 *   the enum, so down entries omit weightRange and call out FP in `notes`.
 * - Source uses `Sleeve-lining`, `Chest`, `Waistband`, `Plackets`, `Padding`
 *   etc. as zones; types.ts only allows the canonical Zone union. Mapping:
 *     Sleeve-lining          → ['Lining', 'Sleeve']
 *     Body fusibles          → ['Body', 'Collar', 'Cuffs', 'Closures']
 *     Hair canvas chest piece→ ['Body', 'Trim']
 *     Padding/insulation     → ['Padding (insulation)']
 * - Source uses subtypes `puffer`, `parka`, `down-vest`, `quilt`, `chore-coat`
 *   etc. that do not exist in the ProductSubtype union. Mapping:
 *     puffer / down-vest / quilt / chore-coat → 'outerwear-jacket'
 *     parka                                   → 'outerwear-coat'
 *     blazer-summer                           → 'blazer'
 *     swim                                    → 'swimwear'
 *     jersey-dress                            → 'dress'
 *     knitwear                                → 'knitwear-top'
 * - Bemberg cupro is cross-referenced from Rama 2 (regenerated cellulosics).
 *   Listed here as the canonical luxury lining material.
 * - Bonotto SpA appears in source as a silk habotai supplier. Bonotto is
 *   primarily a shell-fabric weaver — lining is a secondary programme.
 *   That correction is captured in the supplier note.
 * - Certifications absent from the types.ts Certification union (bluesign,
 *   IDFL, ISO-9001/14001/17025, SensitivEcoSystem, ISCC-PLUS, Higg-Index)
 *   are intentionally omitted from entries to keep the file typecheck-clean.
 */

import type { Material } from './types';

// ═══════════════════════════════════════════════════════════════════════
// SECTION A — LININGS
// ═══════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────
// 1. Silk habotai (pongee) lining
// ───────────────────────────────────────────────────────────────────────

const liningSilkHabotai: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-silk-habotai',
    name: 'Silk habotai (pongee) lining',
    layer: 'L1',
    family: 'lining',
    composition: '100% mulberry silk, plain weave',
    weightRange: { min: 3.5, max: 8.0, unit: 'momme' },
    defaultFinish: 'calendered, soft hand',
    finishOptions: ['calendered', 'sand-washed', 'piece-dyed', 'jacquard-woven'],
    zones: ['Lining', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'outerwear-coat', 'dress', 'skirt', 'lingerie'],
    priceTier: ['luxury'],
    aestheticTags: ['tailored', 'romantic'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: false,
    notes: 'Momme (匁) is silk weight unit (1 momme ≈ 4.34 gsm). Habotai 5–8mm is canonical luxury suit/dress lining. Cool, breathable but slippery under needle.',
  },

  // ─── L2 ───
  {
    id: 'lining-silk-habotai-5mm',
    name: 'Silk habotai 5 momme (lightweight)',
    layer: 'L2', parentId: 'lining-silk-habotai', family: 'lining',
    composition: '100% mulberry silk',
    weightRange: { min: 5.0, max: 5.5, unit: 'momme' }, defaultFinish: 'calendered',
    zones: ['Lining', 'Sleeve'], subtypes: ['blazer', 'dress', 'skirt'],
    priceTier: ['luxury'], aestheticTags: ['romantic'], seasonFit: ['all-year'], vegan: false,
    notes: 'Sleeve-lining standard for lightweight blazer / unconstructed jacket.',
  },
  {
    id: 'lining-silk-habotai-8mm',
    name: 'Silk habotai 8 momme (full-body)',
    layer: 'L2', parentId: 'lining-silk-habotai', family: 'lining',
    composition: '100% mulberry silk',
    weightRange: { min: 7.5, max: 8.0, unit: 'momme' }, defaultFinish: 'calendered, piece-dyed',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: false,
    notes: 'Body-lining standard for bespoke tailoring.',
  },
  {
    id: 'lining-silk-habotai-jacquard',
    name: 'Silk habotai jacquard (figured)',
    layer: 'L2', parentId: 'lining-silk-habotai', family: 'lining',
    composition: '100% mulberry silk, jacquard weave',
    weightRange: { min: 6.0, max: 10.0, unit: 'momme' }, defaultFinish: 'jacquard, piece-dyed',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored', 'romantic'], seasonFit: ['all-year'], vegan: false,
    notes: 'Bespoke / sartorial signature — paisley, foulard, maison monogram.',
  },

  // ─── L3 ───
  {
    id: 'supplier-bonotto-silk-lining',
    name: 'Bonotto SpA',
    layer: 'L3', parentId: 'lining-silk-habotai', family: 'lining',
    composition: 'silk habotai-weight (sub-line of shell-fabric programme)',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored', 'romantic'], seasonFit: ['all-year'], vegan: false,
    certifications: ['OEKO-TEX'],
    supplier: {
      origin: 'Italy (Molvena, Vicenza)',
      tier: 'mill',
      verificationUrl: 'https://www.bonotto.biz/',
      secondaryUrl: 'https://www.bonotto.biz/en/about-us/',
    },
    notes: "Bonotto is primarily a shell-fabric mill — verifiable Italian shuttle-loom weaver best known for slow-loom shell jacquard / suiting. Lining role is secondary (silk-and-luxury-fibre sub-programme includes habotai-weight silk for high-end linings). Included here because the luxury B2B silk-lining market is small and Bonotto is one of the few Italian houses that runs both.",
  },
];

// ───────────────────────────────────────────────────────────────────────
// 2. Bemberg cupro lining
// ───────────────────────────────────────────────────────────────────────

const liningBemberg: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-bemberg',
    name: 'Bemberg cupro lining (Asahi Kasei)',
    layer: 'L1',
    family: 'lining',
    composition: '100% cuprammonium rayon, regenerated cellulose from cotton linter',
    weightRange: { min: 50, max: 110, unit: 'gsm' },
    defaultFinish: 'calendered, anti-static',
    finishOptions: ['calendered', 'jacquard', 'plain', 'twill', 'satin', 'piece-dyed', 'yarn-dyed'],
    zones: ['Lining', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'outerwear-coat', 'trouser', 'skirt', 'dress'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'OEKO-TEX-MADE-IN-GREEN', 'REACH'],
    vegan: true,
    notes: 'Cross-referenced from Rama 2 regenerated cellulosics — listed here as the canonical luxury lining material. Asahi Kasei Bemberg is the only producer of cuprammonium rayon at industrial scale (Nobeoka plant, Japan). Anti-static, breathable, biodegradable.',
  },

  // ─── L2 ───
  {
    id: 'lining-bemberg-60d-twill',
    name: 'Bemberg 60d twill (suit lining)',
    layer: 'L2', parentId: 'lining-bemberg', family: 'lining',
    composition: '100% Bemberg cupro, twill weave',
    weightRange: { min: 75, max: 85, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'suit'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: true,
    notes: '60-denier filament. Suit-lining default for Italian tailoring.',
  },
  {
    id: 'lining-bemberg-jacquard',
    name: 'Bemberg jacquard (figured lining)',
    layer: 'L2', parentId: 'lining-bemberg', family: 'lining',
    composition: '100% Bemberg, jacquard weave',
    weightRange: { min: 80, max: 110, unit: 'gsm' }, defaultFinish: 'jacquard, piece-dyed or yarn-dyed',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored', 'romantic'], seasonFit: ['all-year'], vegan: true,
    notes: 'Bespoke / sartorial signature lining.',
  },
  {
    id: 'lining-bemberg-satin',
    name: 'Bemberg satin (drape lining)',
    layer: 'L2', parentId: 'lining-bemberg', family: 'lining',
    composition: '100% Bemberg, satin weave',
    weightRange: { min: 70, max: 95, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blazer'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['romantic', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lining-bemberg-stretch',
    name: 'Bemberg stretch lining (with elastane)',
    layer: 'L2', parentId: 'lining-bemberg', family: 'lining',
    composition: 'Bemberg cupro 92% / elastane 8%',
    weightRange: { min: 80, max: 110, unit: 'gsm' }, defaultFinish: 'calendered, mechanical stretch',
    zones: ['Lining'], subtypes: ['trouser', 'skirt', 'blazer', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
    notes: 'Bemberg + elastane for tailored stretch trousers / fitted skirts.',
  },
  {
    id: 'lining-bemberg-recycled',
    name: 'Bemberg recycled / GRS variant',
    layer: 'L2', parentId: 'lining-bemberg', family: 'lining',
    composition: 'Bemberg with recycled-content claim',
    weightRange: { min: 75, max: 95, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat', 'trouser'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX-MADE-IN-GREEN', 'GRS'], vegan: true,
    notes: 'Process recycled-cotton-linter Bemberg; tracked under Made-in-Green.',
  },

  // ─── L3 ───
  {
    id: 'supplier-asahi-kasei-bemberg',
    name: 'Asahi Kasei Bemberg',
    layer: 'L3', parentId: 'lining-bemberg', family: 'lining',
    composition: 'cuprammonium rayon (cotton-linter feedstock)',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX-MADE-IN-GREEN', 'REACH'], vegan: true,
    supplier: {
      origin: 'Japan (Nobeoka, Miyazaki)',
      tier: 'mill',
      verificationUrl: 'https://www.asahi-kasei.co.jp/fibers/en/bemberg/',
      secondaryUrl: 'https://www.bembergsisterhood.com/',
    },
    notes: 'Cross-listed from Rama 2. Single global producer of cuprammonium rayon at industrial scale since 1931. Cotton-linter feedstock (cotton-seed waste). Ammonia closed-loop recovery. Bembergsisterhood B2B portal. Industry standard cited in luxury suit linings (Brioni, Zegna, Kiton class).',
  },
  {
    id: 'supplier-yagi-tsusho-bemberg',
    name: 'Yagi Tsusho Ltd (Bemberg distributor)',
    layer: 'L3', parentId: 'lining-bemberg', family: 'lining',
    composition: 'Bemberg distribution',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Japan / Europe / Asia',
      tier: 'component-maker',
      verificationUrl: 'https://www.yagi.co.jp/',
      secondaryUrl: 'https://www.yagi.co.jp/english/business/textile/',
    },
    notes: 'Long-standing Asahi Kasei trading partner. Distributes Bemberg cupro lining to European tailoring houses + Asian brand programmes. B2B contract role; not a fibre maker.',
  },
  {
    id: 'supplier-limonta-bemberg',
    name: 'Limonta SpA (Bemberg-based luxury linings)',
    layer: 'L3', parentId: 'lining-bemberg', family: 'lining',
    composition: 'Bemberg woven into finished lining fabrics (twill, satin, jacquard)',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Costa Masnaga, Lecco)',
      tier: 'mill',
      verificationUrl: 'https://www.limonta.com/',
      secondaryUrl: 'https://www.limonta.com/en/divisions/lining/',
    },
    notes: 'Founded 1893. Italian luxury-lining specialist. Considered the gold-standard finishing weaver for Bemberg-based linings. Supplies Brioni, Zegna, Loro Piana via direct B2B contracts.',
  },
  {
    id: 'supplier-olmetex-bemberg',
    name: 'Olmetex SpA (technical + lining)',
    layer: 'L3', parentId: 'lining-bemberg', family: 'lining',
    composition: 'Bemberg-based linings + synthetic technical linings',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'utility'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Olmeneta, Cremona)',
      tier: 'mill',
      verificationUrl: 'https://www.olmetex.com/',
      secondaryUrl: 'https://www.olmetex.com/en/',
    },
    notes: 'Technical-fabric weaver historically focused on shirting and outerwear. Lining programme covers Bemberg-based and synthetic linings for technical jackets, trench coats, outerwear. Bluesign system partner.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 3. Cotton voile / cotton lawn lining
// ───────────────────────────────────────────────────────────────────────

const liningCottonFine: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-cotton-fine',
    name: 'Cotton voile / lawn lining',
    layer: 'L1',
    family: 'lining',
    composition: '100% combed cotton, very high count plain weave',
    weightRange: { min: 50, max: 90, unit: 'gsm' },
    defaultFinish: 'mercerized, calendered',
    finishOptions: ['mercerized', 'calendered', 'piece-dyed', 'yarn-dyed-stripe'],
    zones: ['Lining'],
    subtypes: ['dress', 'skirt', 'blouse', 'blazer'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'romantic', 'preppy'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Cotton voile = sheer (50–70 gsm); cotton lawn = slightly heavier, smoother (70–90 gsm). Lawn is the canonical Liberty fabric weight. Used as breathable summer / dress lining where viscose or Bemberg would feel too cool. Sourced from shirting mills cross-listed in Rama 1 (Albini, Liberty Fabrics, Thomas Mason) — no dedicated B2B lining mill at scale.',
  },

  // ─── L2 ───
  {
    id: 'lining-cotton-voile',
    name: 'Cotton voile (sheer)',
    layer: 'L2', parentId: 'lining-cotton-fine', family: 'lining',
    composition: '100% combed cotton, voile weave',
    weightRange: { min: 50, max: 70, unit: 'gsm' }, defaultFinish: 'mercerized',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blouse'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['romantic', 'minimal'], seasonFit: ['SS', 'transitional'], vegan: true,
  },
  {
    id: 'lining-cotton-lawn',
    name: 'Cotton lawn (smooth, dense)',
    layer: 'L2', parentId: 'lining-cotton-fine', family: 'lining',
    composition: '100% combed cotton, lawn weave',
    weightRange: { min: 70, max: 90, unit: 'gsm' }, defaultFinish: 'calendered, mercerized',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blouse', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['preppy', 'romantic'], seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
  },

  // ─── L3 ───
  // No dedicated B2B lining mill exists for cotton voile/lawn at scale.
  // Sourced from shirting mills cross-listed in Rama 1.
];

// ───────────────────────────────────────────────────────────────────────
// 4. Polyester taffeta lining
// ───────────────────────────────────────────────────────────────────────

const liningPolyTaffeta: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-poly-taffeta',
    name: 'Polyester taffeta lining',
    layer: 'L1',
    family: 'lining',
    composition: '100% polyester filament, plain weave',
    weightRange: { min: 50, max: 90, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['calendered', 'anti-static', 'peached', 'piece-dyed', 'jacquard'],
    zones: ['Lining', 'Sleeve'],
    subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer', 'skirt', 'trouser'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'preppy', 'tailored'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Most common contemporary lining worldwide. Dense, smooth, cheap, durable. Less breathable than Bemberg or silk but higher abrasion resistance. Default for fast-fashion and contemporary outerwear. Standard 190T and 210T constructions.',
  },

  // ─── L2 ───
  {
    id: 'lining-poly-taffeta-190t',
    name: 'Polyester taffeta 190T (light)',
    layer: 'L2', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: '100% polyester',
    weightRange: { min: 50, max: 65, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining', 'Sleeve'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['minimal', 'preppy'], seasonFit: ['all-year'], vegan: true,
    notes: 'Default puffer / parka inner lining.',
  },
  {
    id: 'lining-poly-taffeta-210t',
    name: 'Polyester taffeta 210T (mid-weight)',
    layer: 'L2', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: '100% polyester',
    weightRange: { min: 65, max: 90, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'blazer', 'trouser', 'skirt'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
    notes: 'Suiting / blazer-grade synthetic lining.',
  },
  {
    id: 'lining-poly-taffeta-jacquard',
    name: 'Polyester taffeta jacquard (figured)',
    layer: 'L2', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: '100% polyester, jacquard weave',
    weightRange: { min: 70, max: 100, unit: 'gsm' }, defaultFinish: 'jacquard, piece-dyed or yarn-dyed',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'blazer', 'suit'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['preppy', 'tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Affordable substitute for Bemberg jacquard.',
  },
  {
    id: 'lining-poly-taffeta-recycled',
    name: 'Polyester taffeta — recycled (rPET / Repreve)',
    layer: 'L2', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: '100% recycled polyester (rPET)',
    weightRange: { min: 50, max: 90, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    notes: 'Repreve (Unifi) and other rPET filament programmes — sustainability-positioned.',
  },

  // ─── L3 ───
  {
    id: 'supplier-toray-poly-lining',
    name: 'Toray Industries',
    layer: 'L3', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: 'polyester filament + recycled (Ecodear) variants',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer', 'activewear'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sport'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan (Tokyo HQ; mills in Japan, Indonesia, Vietnam, China)',
      tier: 'mill',
      verificationUrl: 'https://www.toray.com/global/products/fiber/',
      secondaryUrl: 'https://www.toray.com/global/sustainability/',
    },
    notes: "World's largest polyester filament producer. Lining programme includes Ecsaine taffeta, anti-static and recycled (Ecodear) variants. B2B for global outerwear, sportswear, technical-jacket programmes.",
  },
  {
    id: 'supplier-limonta-poly-lining',
    name: 'Limonta SpA — polyester linings',
    layer: 'L3', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: 'polyester taffeta + jacquard linings',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'blazer'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Costa Masnaga, Lecco)',
      tier: 'mill',
      verificationUrl: 'https://www.limonta.com/en/divisions/lining/',
    },
    notes: 'Limonta runs polyester taffeta and jacquard linings alongside its Bemberg programme. Italian B2B for premium outerwear and tailored garment makers. Wide colour service and per-PO Pantone matching.',
  },
  {
    id: 'supplier-olmetex-poly-lining',
    name: 'Olmetex SpA — polyester technical linings',
    layer: 'L3', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: 'polyester taffeta + ripstop liners',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['utility', 'sport'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Olmeneta, Cremona)',
      tier: 'mill',
      verificationUrl: 'https://www.olmetex.com/en/',
      secondaryUrl: 'https://www.olmetex.com/en/sustainability/',
    },
    notes: 'Polyester taffeta + ripstop liners for technical outerwear, parkas, field jackets. Bluesign-aligned. B2B for European contemporary outerwear.',
  },
  {
    id: 'supplier-repreve-rpet-lining',
    name: 'Repreve (Unifi Inc.)',
    layer: 'L3', parentId: 'lining-poly-taffeta', family: 'lining',
    composition: 'rPET filament yarn (post-consumer PET)',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA (Greensboro, NC) + Asia mills',
      tier: 'mill',
      verificationUrl: 'https://repreve.com/',
      secondaryUrl: 'https://repreve.com/u-trust',
    },
    notes: 'rPET filament brand sold to mills as a yarn input — ends up in lining, shell, knit programmes. Tracked via U TRUST (block-chain provenance). GRS-certified. Industry-standard recycled-polyester yarn for lining sustainability claims.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 5. Polyester satin / acetate / triacetate lining
// ───────────────────────────────────────────────────────────────────────

const liningSatinAcetate: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-satin-acetate',
    name: 'Polyester satin / acetate satin lining',
    layer: 'L1',
    family: 'lining',
    composition: 'Polyester or acetate filament, satin weave (luxury alt to silk)',
    weightRange: { min: 65, max: 110, unit: 'gsm' },
    defaultFinish: 'calendered, satin face',
    finishOptions: ['calendered', 'piece-dyed', 'yarn-dyed', 'jacquard', 'stripe'],
    zones: ['Lining'],
    subtypes: ['blazer', 'suit', 'outerwear-coat', 'dress', 'skirt'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['romantic', 'tailored'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Acetate (cellulose acetate) and triacetate are cellulose-derived but chemically modified. In linings they offer silk-like drape at lower cost than Bemberg. Polyester satin is the cheapest mass-market silk-alternative. Acetate is the heritage luxury alternative (used historically in haute-couture linings).',
  },

  // ─── L2 ───
  {
    id: 'lining-poly-satin',
    name: 'Polyester satin (mass-market silk-look)',
    layer: 'L2', parentId: 'lining-satin-acetate', family: 'lining',
    composition: '100% polyester, satin weave',
    weightRange: { min: 65, max: 95, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blazer'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['romantic', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lining-acetate-satin',
    name: 'Acetate satin (luxury silk-alternative)',
    layer: 'L2', parentId: 'lining-satin-acetate', family: 'lining',
    composition: '100% cellulose acetate, satin weave',
    weightRange: { min: 80, max: 110, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['romantic', 'tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Heritage couture lining (Dior 1947, Balenciaga 1950s).',
  },
  {
    id: 'lining-triacetate',
    name: 'Triacetate lining',
    layer: 'L2', parentId: 'lining-satin-acetate', family: 'lining',
    composition: '100% triacetate, satin or twill',
    weightRange: { min: 75, max: 100, unit: 'gsm' }, defaultFinish: 'calendered, heat-set pleat-stable',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blazer'],
    priceTier: ['premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
    notes: 'Higher heat resistance than acetate — accepts permanent pleating.',
  },

  // ─── L3 ───
  {
    id: 'supplier-mitsubishi-acetate',
    name: 'Mitsubishi Chemical (Diaryl acetate)',
    layer: 'L3', parentId: 'lining-satin-acetate', family: 'lining',
    composition: 'cellulose acetate filament yarn',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'dress', 'skirt'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['romantic', 'tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://www.m-chemical.co.jp/en/products/departments/mcc/fiber/',
      secondaryUrl: 'https://www.diacel.co.jp/en/',
    },
    notes: 'One of the few remaining acetate-filament producers globally. Diaryl is the trade name. B2B yarn supply to lining mills (mostly Italian finishing weavers). Used for couture-grade acetate satin lining.',
  },
  {
    id: 'supplier-toray-poly-satin',
    name: 'Toray Industries — polyester satin lining',
    layer: 'L3', parentId: 'lining-satin-acetate', family: 'lining',
    composition: 'polyester satin lining yarn + fabric',
    zones: ['Lining'], subtypes: ['dress', 'skirt', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'romantic'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan + Asia mills',
      tier: 'mill',
      verificationUrl: 'https://www.toray.com/global/products/fiber/',
    },
    notes: 'Same Toray entity as poly taffeta — runs polyester satin lining as silk-alternative for global garment programmes.',
  },
  {
    id: 'supplier-limonta-acetate-satin',
    name: 'Limonta SpA — acetate / triacetate finishing',
    layer: 'L3', parentId: 'lining-satin-acetate', family: 'lining',
    composition: 'acetate + triacetate satin lining',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'romantic'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Costa Masnaga, Lecco)',
      tier: 'mill',
      verificationUrl: 'https://www.limonta.com/en/divisions/lining/',
    },
    notes: 'Italian luxury lining house — runs acetate + triacetate satin programme for couture and prêt-à-porter customers.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 6. Viscose lining
// ───────────────────────────────────────────────────────────────────────

const liningViscose: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-viscose',
    name: 'Viscose lining',
    layer: 'L1',
    family: 'lining',
    composition: '100% viscose filament or staple, plain or twill weave',
    weightRange: { min: 65, max: 110, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['calendered', 'piece-dyed', 'jacquard', 'peached'],
    zones: ['Lining', 'Sleeve'],
    subtypes: ['blazer', 'outerwear-coat', 'trouser', 'skirt', 'dress'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'tailored', 'romantic'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Mid-tier between cotton voile and Bemberg cupro. Better drape than polyester, more breathable, cheaper than Bemberg. Standard contemporary lining where Bemberg price is prohibitive. Look for FSC / EcoVero (Lenzing) for sustainability claims.',
  },

  // ─── L2 ───
  {
    id: 'lining-viscose-twill',
    name: 'Viscose twill lining',
    layer: 'L2', parentId: 'lining-viscose', family: 'lining',
    composition: '100% viscose, twill weave',
    weightRange: { min: 75, max: 100, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lining-viscose-jacquard',
    name: 'Viscose jacquard',
    layer: 'L2', parentId: 'lining-viscose', family: 'lining',
    composition: '100% viscose, jacquard weave',
    weightRange: { min: 85, max: 110, unit: 'gsm' }, defaultFinish: 'jacquard, piece-dyed',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['romantic', 'tailored'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lining-viscose-ecovero',
    name: 'Viscose lining — EcoVero (Lenzing)',
    layer: 'L2', parentId: 'lining-viscose', family: 'lining',
    composition: '100% Lenzing EcoVero viscose',
    weightRange: { min: 70, max: 100, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat', 'dress', 'skirt'],
    priceTier: ['premium'], aestheticTags: ['minimal', 'sustainable', 'tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'FSC', 'EU-Ecolabel'], vegan: true,
    notes: 'Lenzing certified-source viscose; FSC + EU-Ecolabel sustainability claims.',
  },

  // ─── L3 ───
  {
    id: 'supplier-lenzing-ecovero-lining',
    name: 'Lenzing AG (EcoVero viscose)',
    layer: 'L3', parentId: 'lining-viscose', family: 'lining',
    composition: 'viscose filament — EcoVero certified-source',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat', 'dress'],
    priceTier: ['premium'], aestheticTags: ['sustainable', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'FSC', 'EU-Ecolabel'], vegan: true,
    supplier: {
      origin: 'Austria',
      tier: 'mill',
      verificationUrl: 'https://www.lenzing.com/products/lenzing-ecovero',
      secondaryUrl: 'https://www.ecovero.com/',
    },
    notes: 'Cross-listed from Rama 2. Viscose-yarn producer. EcoVero is the certified-source / FSC viscose programme used in linings + shells. B2B yarn supply to weaving mills.',
  },
  {
    id: 'supplier-limonta-viscose',
    name: 'Limonta SpA — viscose linings',
    layer: 'L3', parentId: 'lining-viscose', family: 'lining',
    composition: 'viscose woven lining',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy',
      tier: 'mill',
      verificationUrl: 'https://www.limonta.com/en/divisions/lining/',
    },
    notes: 'Italian B2B finishing weaver — viscose lining programme.',
  },
  {
    id: 'supplier-olmetex-viscose',
    name: 'Olmetex SpA — viscose linings',
    layer: 'L3', parentId: 'lining-viscose', family: 'lining',
    composition: 'viscose woven technical lining',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'utility'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy',
      tier: 'mill',
      verificationUrl: 'https://www.olmetex.com/en/',
    },
    notes: 'Italian technical-and-lining mill — viscose programme alongside Bemberg + polyester.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 7. Stretch lining (elastane blend)
// ───────────────────────────────────────────────────────────────────────

const liningStretch: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-stretch',
    name: 'Stretch lining (with elastane)',
    layer: 'L1',
    family: 'lining',
    composition: 'Polyester / Bemberg / viscose 88–94% + elastane 6–12%',
    weightRange: { min: 70, max: 130, unit: 'gsm' },
    defaultFinish: 'calendered, mechanical stretch',
    finishOptions: ['calendered', 'peached', 'tricot-knit', 'jersey-knit'],
    zones: ['Lining'],
    subtypes: ['trouser', 'skirt', 'blazer', 'dress', 'activewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal', 'sport'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Required for tailored stretch trousers, fitted skirts, structured dresses. Two main constructions: woven taffeta + elastane core; warp-knit tricot + elastane (Eurojersey territory).',
  },

  // ─── L2 ───
  {
    id: 'lining-stretch-woven-poly',
    name: 'Stretch woven polyester lining',
    layer: 'L2', parentId: 'lining-stretch', family: 'lining',
    composition: 'Polyester 92% + elastane 8%',
    weightRange: { min: 80, max: 110, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['trouser', 'skirt', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lining-stretch-tricot',
    name: 'Warp-knit tricot stretch lining (Sensitive-class)',
    layer: 'L2', parentId: 'lining-stretch', family: 'lining',
    composition: 'Polyamide 70% + elastane 30%',
    weightRange: { min: 90, max: 130, unit: 'gsm' }, defaultFinish: 'warp-knit, calendered',
    zones: ['Lining'], subtypes: ['activewear', 'swimwear', 'skirt', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport', 'minimal'], seasonFit: ['all-year'], vegan: true,
    notes: 'Eurojersey Sensitive Fabrics canonical category — 4-way stretch warp-knit.',
  },

  // ─── L3 ───
  {
    id: 'supplier-eurojersey-sensitive',
    name: 'Eurojersey SpA (Sensitive Fabrics)',
    layer: 'L3', parentId: 'lining-stretch', family: 'lining',
    composition: 'warp-knit polyamide + elastane (Sensitive Fabrics)',
    zones: ['Lining'], subtypes: ['activewear', 'swimwear', 'skirt', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport', 'minimal', 'tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Caronno Pertusella, Varese)',
      tier: 'mill',
      verificationUrl: 'https://www.eurojersey.it/',
      secondaryUrl: 'https://www.eurojersey.it/en/sensitive-fabrics-by-eurojersey/',
    },
    notes: 'Italian warp-knit specialist since 1959. Sensitive Fabrics is the flagship 4-way stretch line, used in linings for tailored stretch + bodywear + swim. SensitivEcoSystem programme — vertically integrated Italian production. Direct B2B for premium and luxury.',
  },
  {
    id: 'supplier-toray-stretch-lining',
    name: 'Toray Industries — stretch lining',
    layer: 'L3', parentId: 'lining-stretch', family: 'lining',
    composition: 'polyester / Lycra blend stretch lining',
    zones: ['Lining'], subtypes: ['trouser', 'skirt', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan + Asia',
      tier: 'mill',
      verificationUrl: 'https://www.toray.com/global/products/fiber/',
    },
    notes: 'Polyester / Lycra blend lining for tailored programmes worldwide.',
  },
  {
    id: 'supplier-limonta-stretch',
    name: 'Limonta SpA — stretch lining',
    layer: 'L3', parentId: 'lining-stretch', family: 'lining',
    composition: 'Bemberg + elastane stretch lining',
    zones: ['Lining'], subtypes: ['trouser', 'skirt', 'blazer'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy',
      tier: 'mill',
      verificationUrl: 'https://www.limonta.com/en/divisions/lining/',
    },
    notes: 'Bemberg + elastane stretch lining variant for Italian tailoring.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 8. Sustainable / recycled lining
// ───────────────────────────────────────────────────────────────────────

const liningSustainable: Material[] = [
  // ─── L1 ───
  {
    id: 'lining-sustainable',
    name: 'Sustainable / recycled lining (rPET, recycled cupro, Naia)',
    layer: 'L1',
    family: 'lining',
    composition: 'Recycled polyester (rPET, Repreve), recycled Bemberg, or Naia (Eastman cellulose acetate)',
    weightRange: { min: 50, max: 110, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['calendered', 'jacquard', 'satin', 'twill'],
    zones: ['Lining'],
    subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable', 'tailored'],
    seasonFit: ['all-year'],
    certifications: ['GRS', 'RCS', 'OEKO-TEX', 'OEKO-TEX-MADE-IN-GREEN'],
    vegan: true,
    notes: 'Three canonical paths: (1) rPET filament (Repreve / Unifi) woven into taffeta + satin lining; (2) Bemberg / Naia cellulose-based feedstocks tracked under Made-in-Green; (3) Eastman Naia Renew (60% wood pulp + 40% recycled plastic).',
  },

  // ─── L2 ───
  {
    id: 'lining-rpet-repreve',
    name: 'rPET lining — Repreve',
    layer: 'L2', parentId: 'lining-sustainable', family: 'lining',
    composition: '100% recycled polyester (Repreve / U TRUST)',
    weightRange: { min: 50, max: 90, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
  },
  {
    id: 'lining-naia-renew',
    name: 'Naia Renew (Eastman cellulose lining)',
    layer: 'L2', parentId: 'lining-sustainable', family: 'lining',
    composition: 'Cellulose acetate — 60% sustainably-sourced wood + 40% certified-recycled material',
    weightRange: { min: 80, max: 110, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sustainable', 'minimal', 'romantic'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    notes: "Eastman's traceable cellulose acetate — ISCC PLUS mass-balance.",
  },
  {
    id: 'lining-bemberg-recycled-grs',
    name: 'Bemberg recycled / GRS-tracked',
    layer: 'L2', parentId: 'lining-sustainable', family: 'lining',
    composition: 'Bemberg cuprammonium rayon (cotton-linter feedstock)',
    weightRange: { min: 75, max: 95, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX-MADE-IN-GREEN', 'GRS'], vegan: true,
    notes: 'See lining-bemberg-recycled — same fabric, in sustainability roster here.',
  },

  // ─── L3 ───
  {
    id: 'supplier-repreve-sustainable',
    name: 'Repreve (Unifi Inc.)',
    layer: 'L3', parentId: 'lining-sustainable', family: 'lining',
    composition: 'rPET yarn — U TRUST traceability',
    zones: ['Lining'], subtypes: ['outerwear-coat', 'outerwear-jacket', 'blazer'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sustainable', 'minimal'], seasonFit: ['all-year'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA + Asia',
      tier: 'mill',
      verificationUrl: 'https://repreve.com/u-trust',
      secondaryUrl: 'https://repreve.com/products',
    },
    notes: 'rPET yarn — U TRUST traceability. Distributed to lining mills globally. GRS-certified.',
  },
  {
    id: 'supplier-eastman-naia',
    name: 'Eastman Naia (Naia Renew)',
    layer: 'L3', parentId: 'lining-sustainable', family: 'lining',
    composition: 'cellulose acetate filament — Naia Renew (ISCC PLUS mass-balance)',
    zones: ['Lining'], subtypes: ['blazer', 'outerwear-coat', 'dress'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sustainable', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA (Kingsport, TN)',
      tier: 'mill',
      verificationUrl: 'https://www.eastman.com/en/products/product-detail/71044311/naia-renew',
      secondaryUrl: 'https://www.naiabyeastman.com/',
    },
    notes: 'Cellulose acetate filament programme. Naia Renew uses ISCC PLUS mass-balance to claim 40% recycled content. B2B for luxury linings + drape fabrics. Major partners include H&M, Reformation, Stella McCartney for shell + lining variants.',
  },
  {
    id: 'supplier-asahi-bemberg-sustainable',
    name: 'Asahi Kasei Bemberg — sustainable claim',
    layer: 'L3', parentId: 'lining-sustainable', family: 'lining',
    composition: 'Bemberg cupro — closed-loop ammonia recovery, cotton-linter feedstock',
    zones: ['Lining'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'sustainable'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX-MADE-IN-GREEN', 'REACH'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://www.asahi-kasei.co.jp/fibers/en/bemberg/sustainability/',
    },
    notes: 'Cross-listed. Cotton-linter feedstock + closed-loop ammonia recovery + biodegradable + Made-in-Green. The canonical sustainable luxury lining.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SECTION B — INTERFACINGS
// ═══════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────
// 9. Woven fusible interfacing
// ───────────────────────────────────────────────────────────────────────

const interfacingWovenFusible: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-woven-fusible',
    name: 'Woven fusible interfacing',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Cotton or polyester/cotton woven base + thermoplastic adhesive dot coating',
    weightRange: { min: 30, max: 130, unit: 'gsm' },
    defaultFinish: 'dot-coated, paper-back released',
    finishOptions: ['scattered-dot', 'double-dot', 'paste-coated'],
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'],
    subtypes: ['shirt', 'blouse', 'blazer', 'suit', 'outerwear-coat', 'trouser', 'skirt'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal', 'preppy'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Canonical structured-garment interfacing. Three weight tiers: light (30–50 gsm) collars/cuffs/plackets; mid (50–90 gsm) blazer fronts/waistbands; heavy (90–130 gsm) coat fronts. Vlieseline / Freudenberg is the global B2B standard reference.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-woven-light',
    name: 'Woven fusible light (shirting)',
    layer: 'L2', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'Cotton or poly/cotton woven + adhesive dot',
    weightRange: { min: 30, max: 50, unit: 'gsm' }, defaultFinish: 'scattered-dot, paper-back',
    zones: ['Collar', 'Cuffs', 'Closures'], subtypes: ['shirt', 'blouse'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'preppy', 'tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Vlieseline G405 / G700 class.',
  },
  {
    id: 'interfacing-woven-mid',
    name: 'Woven fusible mid-weight (blazer)',
    layer: 'L2', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'Cotton or poly/cotton woven + adhesive dot',
    weightRange: { min: 50, max: 90, unit: 'gsm' }, defaultFinish: 'scattered-dot or double-dot',
    zones: ['Body', 'Closures'], subtypes: ['blazer', 'suit', 'trouser', 'skirt'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Vlieseline G740 / Permess Classic class.',
  },
  {
    id: 'interfacing-woven-heavy',
    name: 'Woven fusible heavy (coat fronts)',
    layer: 'L2', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'Heavy cotton or poly/cotton + adhesive dot',
    weightRange: { min: 90, max: 130, unit: 'gsm' }, defaultFinish: 'double-dot',
    zones: ['Body'], subtypes: ['outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 ───
  {
    id: 'supplier-vlieseline-freudenberg',
    name: 'Vlieseline / Freudenberg Performance Materials',
    layer: 'L3', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'woven + non-woven interfacings (G405, G700, G740, H180, H200, H609, H630)',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['shirt', 'blouse', 'blazer', 'suit', 'outerwear-coat', 'trouser', 'skirt'],
    priceTier: ['contemporary', 'premium', 'luxury'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany (Weinheim HQ); plants in EU + Asia + Americas',
      tier: 'component-maker',
      verificationUrl: 'https://www.vlieseline.com/',
      secondaryUrl: 'https://www.freudenberg-pm.com/Apparel',
    },
    notes: 'Global B2B reference for woven + non-woven interfacings. Vlieseline is the apparel-trade brand under Freudenberg Performance Materials. Catalogue codes (G405, G700, G740, H180, H200, H609, H630) are designer-spec standards across Europe and US.',
  },
  {
    id: 'supplier-permess',
    name: 'Permess GmbH',
    layer: 'L3', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'woven fusibles + non-wovens + weft-insertion + hair canvas',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany / Netherlands (founded 1947, Apeldoorn / Krefeld)',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.de/',
      secondaryUrl: 'https://www.permess.com/',
    },
    notes: 'Specialised interlining manufacturer — woven fusibles, non-wovens, weft-insertion, hair canvas. Premium B2B for European tailoring + outerwear. Code names like Permess Classic / Permess Stretch are spec\'d in luxury menswear.',
  },
  {
    id: 'supplier-wendler-interlining',
    name: 'Wendler Interlining (Wendler Einlagen GmbH)',
    layer: 'L3', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'woven fusibles + hair canvas + weft-insertion',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany (Reutlingen)',
      tier: 'component-maker',
      verificationUrl: 'https://www.wendler-einlagen.de/',
      secondaryUrl: 'https://www.wendler-einlagen.de/en/',
    },
    notes: 'Family-owned interlining specialist since 1908. Woven fusibles, hair canvas, weft-insertion. B2B for luxury menswear and tailoring across Europe + USA + Japan. Premium positioning.',
  },
  {
    id: 'supplier-asahi-fusible',
    name: 'Asahi Kasei (fusible interlining division)',
    layer: 'L3', parentId: 'interfacing-woven-fusible', family: 'interfacing',
    composition: 'woven + non-woven fusible interlinings',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['shirt', 'blazer', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'component-maker',
      verificationUrl: 'https://www.asahi-kasei.com/an/business/products/textile/interlinings/',
    },
    notes: 'Asahi Kasei runs an interlining + non-woven division separate from Bemberg. Catalogue covers woven + non-woven fusibles for Asian apparel programmes. B2B for technical / outerwear + tailoring.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 10. Non-woven fusible interfacing
// ───────────────────────────────────────────────────────────────────────

const interfacingNonwovenFusible: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-nonwoven-fusible',
    name: 'Non-woven fusible interfacing',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Polyester or polyamide non-woven web + thermoplastic adhesive dot',
    weightRange: { min: 20, max: 90, unit: 'gsm' },
    defaultFinish: 'scattered-dot, paper-back',
    finishOptions: ['scattered-dot', 'point-bonded', 'calendered', 'perforated'],
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'],
    subtypes: ['shirt', 'blouse', 'blazer', 'trouser', 'skirt', 'outerwear-jacket'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'preppy'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Cheaper, isotropic (no grain). Less natural recovery than woven; can feel papery if over-spec\'d. Standard for budget shirts, fast-fashion blazers, costume.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-nonwoven-light',
    name: 'Non-woven fusible light',
    layer: 'L2', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'Polyester non-woven + adhesive dot',
    weightRange: { min: 20, max: 35, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Collar', 'Cuffs'], subtypes: ['shirt', 'blouse'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['minimal'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'interfacing-nonwoven-mid',
    name: 'Non-woven fusible mid',
    layer: 'L2', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'Polyester non-woven + adhesive dot',
    weightRange: { min: 35, max: 65, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Body', 'Closures'], subtypes: ['blazer', 'blouse', 'outerwear-jacket'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['minimal', 'preppy'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'interfacing-nonwoven-heavy',
    name: 'Non-woven fusible heavy',
    layer: 'L2', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'Polyester non-woven + adhesive dot',
    weightRange: { min: 65, max: 90, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Body'], subtypes: ['trouser', 'skirt', 'outerwear-jacket'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['minimal'], seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 ───
  {
    id: 'supplier-vlieseline-nonwoven',
    name: 'Vlieseline / Freudenberg — non-woven line',
    layer: 'L3', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'non-woven fusible interlinings (H180, H200, H250, H609, H630)',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['shirt', 'blazer', 'outerwear-jacket'],
    priceTier: ['fast', 'contemporary', 'premium'], aestheticTags: ['minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.vlieseline.com/en-gb/products',
      secondaryUrl: 'https://www.freudenberg-pm.com/Apparel',
    },
    notes: 'H180, H200, H250, H609, H630 codes — global non-woven interfacing standard. Direct B2B + craft retail through Vlieseline-branded retail.',
  },
  {
    id: 'supplier-permess-nonwoven',
    name: 'Permess GmbH — non-woven',
    layer: 'L3', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'non-woven interlining',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['blazer', 'shirt'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany / Netherlands',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.com/products/',
    },
    notes: 'Non-woven interlining alongside woven + hair-canvas; same B2B.',
  },
  {
    id: 'supplier-asahi-nonwoven',
    name: 'Asahi Kasei — non-woven interlining',
    layer: 'L3', parentId: 'interfacing-nonwoven-fusible', family: 'interfacing',
    composition: 'non-woven fusible interlining',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['shirt', 'blazer', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'component-maker',
      verificationUrl: 'https://www.asahi-kasei.com/an/business/products/textile/interlinings/',
    },
    notes: 'Asahi Kasei interlining division — non-woven programme for Asian apparel.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 11. Hair canvas / sew-in chest piece
// ───────────────────────────────────────────────────────────────────────

const interfacingHairCanvas: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-hair-canvas',
    name: 'Hair canvas (Hymo) — sew-in chest piece',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Wool + horsehair / goat-hair + cotton (varying ratios)',
    weightRange: { min: 200, max: 360, unit: 'gsm' },
    defaultFinish: 'sew-in, sometimes pre-shrunk',
    finishOptions: ['sew-in', 'fusible-backed', 'shrunk', 'calendered'],
    zones: ['Body', 'Trim'],
    subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'],
    vegan: false,
    notes: 'Canonical bespoke / sartorial chest piece. Built from layers: front canvas (wool + horsehair) + chest piece (camel/goat hair) + domette (lightweight cotton/wool). Used in full-canvas tailoring. Hand-padded on lapels for the "roll" that defines a savile-row-class jacket.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-canvas-front',
    name: 'Front canvas (wool + horsehair)',
    layer: 'L2', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'Wool 50% + horsehair 30% + cotton 20%',
    weightRange: { min: 230, max: 320, unit: 'gsm' }, defaultFinish: 'sew-in, pre-shrunk',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: false,
    notes: "Permess / Wendler 'Camela' / 'Veratex' / 'Strewn' equivalents.",
  },
  {
    id: 'interfacing-chest-piece',
    name: 'Chest piece (camel / goat hair)',
    layer: 'L2', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'Camel hair 70% + wool 30%',
    weightRange: { min: 280, max: 360, unit: 'gsm' }, defaultFinish: 'sew-in, brushed',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: false,
    notes: "Forms the shoulder/chest 'roll' on bespoke tailoring.",
  },
  {
    id: 'interfacing-domette',
    name: 'Domette (cotton/wool overlay)',
    layer: 'L2', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'Cotton 50% + wool 50%, brushed',
    weightRange: { min: 200, max: 240, unit: 'gsm' }, defaultFinish: 'brushed, sew-in',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: false,
    notes: 'Final canvas overlay between chest piece and shell wool.',
  },

  // ─── L3 ───
  {
    id: 'supplier-permess-hair-canvas',
    name: 'Permess GmbH — hair canvas',
    layer: 'L3', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'hair canvas + chest pieces (Veratex)',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: false,
    supplier: {
      origin: 'Germany / Netherlands',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.com/products/woven-interlinings/',
      secondaryUrl: 'https://www.permess.de/',
    },
    notes: 'Hair canvas + chest pieces under Permess catalogue. Direct B2B for European luxury menswear (Brioni, Zegna, Kiton class). Veratex is Permess\'s flagship hair-canvas naming; not a separate company.',
  },
  {
    id: 'supplier-wendler-hair-canvas',
    name: 'Wendler Interlining — hair canvas',
    layer: 'L3', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'front canvas + chest piece + domette',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: false,
    supplier: {
      origin: 'Germany (Reutlingen)',
      tier: 'component-maker',
      verificationUrl: 'https://www.wendler-einlagen.de/en/products/',
    },
    notes: "Wendler's hair-canvas programme is the European reference for luxury menswear. Multiple weight tiers covering front canvas + chest piece + domette. B2B for high-end tailoring across Europe, USA, Japan.",
  },
  {
    id: 'supplier-camela-usa',
    name: 'Camela (US distribution name for hair canvas)',
    layer: 'L3', parentId: 'interfacing-hair-canvas', family: 'interfacing',
    composition: 'hair canvas (US trade name; sourced from European mills)',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'], vegan: false,
    supplier: {
      origin: 'USA (B2B distribution; sourcing typically from European mills)',
      tier: 'component-maker',
      verificationUrl: 'https://bblackandsons.com/',
    },
    notes: 'Camela is a US trade name for hair canvas typically distributed via B&J Fabrics, B.Black & Sons, Steinlauf & Stoller in NY garment district. Used by US bespoke tailors. Not a primary mill — included as the trade name designers will encounter spec\'ing US-side.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 12. Weft-insertion fusible interfacing
// ───────────────────────────────────────────────────────────────────────

const interfacingWeftInsertion: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-weft-insertion',
    name: 'Weft-insertion fusible interfacing',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Warp-knit base + weft yarn inserts + adhesive dot',
    weightRange: { min: 50, max: 110, unit: 'gsm' },
    defaultFinish: 'scattered-dot, paper-back',
    finishOptions: ['scattered-dot', 'double-dot', 'paste-coated'],
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'],
    subtypes: ['blazer', 'suit', 'outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Hybrid: warp-knit gives drape + lengthwise stretch; weft-yarn insertion gives dimensional stability across the chest. Used in half-canvas tailoring and modern blazer fronts where the "roll" is achieved without full hair-canvas. Vlieseline G740 / Permess Stretch class.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-weft-light',
    name: 'Weft-insertion light (shirting/blouse)',
    layer: 'L2', parentId: 'interfacing-weft-insertion', family: 'interfacing',
    composition: 'Warp-knit + weft polyester yarn + adhesive dot',
    weightRange: { min: 50, max: 70, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Body', 'Closures'], subtypes: ['blouse', 'shirt'],
    priceTier: ['premium'], aestheticTags: ['minimal', 'tailored'], seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'interfacing-weft-mid',
    name: 'Weft-insertion mid (blazer front)',
    layer: 'L2', parentId: 'interfacing-weft-insertion', family: 'interfacing',
    composition: 'Warp-knit + weft poly/cotton + adhesive dot',
    weightRange: { min: 70, max: 110, unit: 'gsm' }, defaultFinish: 'double-dot',
    zones: ['Body'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Half-canvas blazer / sport-coat front. Vlieseline G740 class.',
  },

  // ─── L3 ───
  {
    id: 'supplier-vlieseline-weft',
    name: 'Vlieseline / Freudenberg — weft-insertion',
    layer: 'L3', parentId: 'interfacing-weft-insertion', family: 'interfacing',
    composition: 'weft-insertion fusible interlining (G740)',
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.freudenberg-pm.com/Apparel',
    },
    notes: 'G740 + similar codes. Industry default.',
  },
  {
    id: 'supplier-permess-weft',
    name: 'Permess GmbH — weft-insertion',
    layer: 'L3', parentId: 'interfacing-weft-insertion', family: 'interfacing',
    composition: 'weft-insertion fusible (Permess Stretch)',
    zones: ['Body', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany / Netherlands',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.com/products/woven-interlinings/',
    },
    notes: 'Permess Stretch + similar weft-insertion codes.',
  },
  {
    id: 'supplier-wendler-weft',
    name: 'Wendler Interlining — weft-insertion',
    layer: 'L3', parentId: 'interfacing-weft-insertion', family: 'interfacing',
    composition: 'weft-insertion fusible interlining',
    zones: ['Body', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.wendler-einlagen.de/en/products/',
    },
    notes: 'Wendler weft-insertion programme for luxury menswear.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 13. Knit / tricot fusible interfacing
// ───────────────────────────────────────────────────────────────────────

const interfacingKnitFusible: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-knit-fusible',
    name: 'Knit / tricot fusible interfacing',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Warp-knit polyester or polyamide + adhesive dot',
    weightRange: { min: 25, max: 60, unit: 'gsm' },
    defaultFinish: 'scattered-dot, paper-back',
    finishOptions: ['scattered-dot', 'stretch-tricot', 'point-bonded'],
    zones: ['Body', 'Collar', 'Cuffs', 'Closures'],
    subtypes: ['knitwear-top', 'sweater', 'dress', 'activewear', 'blouse', 'shirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'minimal', 'tailored'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Stretchy fusible — required for stretch shells (jersey, knit, stretch woven). Tricot variant is the warp-knit standard. Lengthwise stable + crosswise stretch. Vlieseline G785 (Easy Knit) is the industry reference.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-tricot-fusible',
    name: 'Tricot fusible (warp-knit, lengthwise stable)',
    layer: 'L2', parentId: 'interfacing-knit-fusible', family: 'interfacing',
    composition: 'Warp-knit polyester + adhesive dot',
    weightRange: { min: 25, max: 45, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Body', 'Collar', 'Cuffs'], subtypes: ['dress', 'blouse', 'activewear', 'knitwear-top'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sport', 'tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Vlieseline G785 (Easy Knit) reference.',
  },
  {
    id: 'interfacing-stretch-knit-fusible',
    name: 'Stretch knit fusible (4-way)',
    layer: 'L2', parentId: 'interfacing-knit-fusible', family: 'interfacing',
    composition: 'Warp-knit polyamide / elastane + adhesive dot',
    weightRange: { min: 35, max: 60, unit: 'gsm' }, defaultFinish: 'scattered-dot',
    zones: ['Body'], subtypes: ['activewear', 'dress', 'outerwear-jacket'],
    priceTier: ['premium'], aestheticTags: ['sport', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 ───
  {
    id: 'supplier-vlieseline-knit',
    name: 'Vlieseline / Freudenberg — Easy Knit / G785',
    layer: 'L3', parentId: 'interfacing-knit-fusible', family: 'interfacing',
    composition: 'tricot fusible interlining (G785)',
    zones: ['Body', 'Collar', 'Cuffs'], subtypes: ['dress', 'blouse', 'activewear', 'knitwear-top'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['minimal', 'sport'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.vlieseline.com/en-gb/products',
    },
    notes: 'G785 + similar tricot fusibles. Industry standard.',
  },
  {
    id: 'supplier-permess-knit',
    name: 'Permess GmbH — knit fusible',
    layer: 'L3', parentId: 'interfacing-knit-fusible', family: 'interfacing',
    composition: 'knit fusible interlining',
    zones: ['Body', 'Collar', 'Cuffs'], subtypes: ['dress', 'blouse', 'knitwear-top'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'minimal'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany / Netherlands',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.com/products/',
    },
    notes: 'Permess knit-fusible programme.',
  },
  {
    id: 'supplier-wendler-knit',
    name: 'Wendler Interlining — knit fusible',
    layer: 'L3', parentId: 'interfacing-knit-fusible', family: 'interfacing',
    composition: 'knit + tricot fusible interlining',
    zones: ['Body', 'Collar', 'Cuffs'], subtypes: ['dress', 'blouse', 'activewear'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.wendler-einlagen.de/en/products/',
    },
    notes: 'Wendler knit + tricot fusibles.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 14. Stay tape / edge tape
// ───────────────────────────────────────────────────────────────────────

const interfacingStayTape: Material[] = [
  // ─── L1 ───
  {
    id: 'interfacing-stay-tape',
    name: 'Stay tape / edge tape',
    layer: 'L1',
    family: 'interfacing',
    composition: 'Cotton or polyester woven tape, often with adhesive backing',
    weightRange: { min: 6, max: 25, unit: 'gsm' },
    defaultFinish: 'fusible adhesive backing',
    finishOptions: ['fusible', 'sew-in', 'bias-cut', 'straight-cut'],
    zones: ['Body', 'Closures', 'Trim'],
    subtypes: ['blazer', 'suit', 'outerwear-coat', 'trouser', 'skirt', 'blouse'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Used on lapel rolls, shoulder seams, neckline / armhole edges, and any bias-prone seam. Two main constructions: woven cotton bias tape (sew-in) and warp-knit polyester (fusible). 3–10 mm widths typical.',
  },

  // ─── L2 ───
  {
    id: 'interfacing-stay-tape-bias',
    name: 'Bias-cut cotton stay tape (sew-in)',
    layer: 'L2', parentId: 'interfacing-stay-tape', family: 'interfacing',
    composition: '100% cotton, bias-cut woven',
    weightRange: { min: 10, max: 25, unit: 'gsm' }, defaultFinish: 'sew-in, calendered',
    zones: ['Body', 'Trim', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'], vegan: true,
    notes: 'Bespoke / sartorial standard for lapel roll.',
  },
  {
    id: 'interfacing-stay-tape-fusible-knit',
    name: 'Fusible knit stay tape (warp-knit)',
    layer: 'L2', parentId: 'interfacing-stay-tape', family: 'interfacing',
    composition: 'Warp-knit polyester + adhesive backing',
    weightRange: { min: 6, max: 15, unit: 'gsm' }, defaultFinish: 'fusible',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'trouser', 'skirt', 'outerwear-coat', 'blouse'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['tailored', 'minimal'], seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 ───
  {
    id: 'supplier-vlieseline-stay-tape',
    name: 'Vlieseline / Freudenberg — stay tape',
    layer: 'L3', parentId: 'interfacing-stay-tape', family: 'interfacing',
    composition: 'stay tape range (fusible + sew-in)',
    zones: ['Body', 'Trim', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.vlieseline.com/en-gb/products',
    },
    notes: 'Stay-tape programme alongside main interfacing range.',
  },
  {
    id: 'supplier-permess-stay-tape',
    name: 'Permess GmbH — stay tape',
    layer: 'L3', parentId: 'interfacing-stay-tape', family: 'interfacing',
    composition: 'stay tape + bias tape',
    zones: ['Body', 'Trim', 'Closures'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany / Netherlands',
      tier: 'component-maker',
      verificationUrl: 'https://www.permess.com/products/',
    },
    notes: 'Permess stay-tape and bias-tape programme.',
  },
  {
    id: 'supplier-wendler-stay-tape',
    name: 'Wendler Interlining — stay tape',
    layer: 'L3', parentId: 'interfacing-stay-tape', family: 'interfacing',
    composition: 'stay tape range',
    zones: ['Body', 'Trim'], subtypes: ['blazer', 'suit', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'REACH'], vegan: true,
    supplier: {
      origin: 'Germany',
      tier: 'component-maker',
      verificationUrl: 'https://www.wendler-einlagen.de/en/products/',
    },
    notes: 'Wendler stay-tape range.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SECTION C — WADDING / PADDING (INSULATION)
// ═══════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────
// 15. RDS-certified down (goose / duck)
// ───────────────────────────────────────────────────────────────────────

const waddingDownRds: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-down-rds',
    name: 'RDS-certified down (goose / duck)',
    layer: 'L1',
    family: 'wadding',
    composition: 'Goose or duck down + feather mix; common ratios 90/10, 80/20, 70/30 down/feather',
    defaultFinish: 'washed, sterilised, sorted',
    finishOptions: ['white', 'grey', 'DWR-treated', 'RDS-recycled', 'RDS-Track-and-Trace'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['preppy', 'sport'],
    seasonFit: ['FW'],
    certifications: ['RDS', 'OEKO-TEX', 'REACH'],
    vegan: false,
    notes: 'Fill power (FP, in³/oz) measures loft per unit weight. 550–650 FP = mass-market puffer; 700–800 FP = premium / technical; 800–900 FP = expedition / luxury. RDS (Responsible Down Standard, Textile Exchange) certifies birds were not live-plucked or force-fed. Allied Feather + Down is the largest RDS-certified B2B supplier.',
  },

  // ─── L2 ───
  {
    id: 'wadding-down-650fp',
    name: 'Down 650 FP / 80-20 duck',
    layer: 'L2', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'Duck down 80% + feather 20%',
    defaultFinish: 'washed, sterilised',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['preppy', 'sport'], seasonFit: ['FW'],
    certifications: ['RDS'], vegan: false,
    notes: 'Mass-market puffer fill standard. 650–700 FP.',
  },
  {
    id: 'wadding-down-800fp',
    name: 'Down 800 FP / 90-10 goose',
    layer: 'L2', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'Goose down 90% + feather 10%',
    defaultFinish: 'washed, sterilised',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['RDS'], vegan: false,
    notes: 'Premium technical + luxury puffer fill standard. 800–850 FP.',
  },
  {
    id: 'wadding-down-900fp',
    name: 'Down 900 FP / 95-5 goose (expedition)',
    layer: 'L2', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'Goose down 95% + feather 5%',
    defaultFinish: 'washed, sterilised',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['RDS'], vegan: false,
    notes: 'Expedition / Himalayan-grade. 880–1000 FP. Rare — not all sources reach 900 FP.',
  },
  {
    id: 'wadding-down-recycled-rds',
    name: 'Recycled down (RDS-recycled)',
    layer: 'L2', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'Recycled goose/duck down recovered from post-consumer pillows / duvets / parkas',
    defaultFinish: 'washed, sterilised',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium'], aestheticTags: ['sport', 'sustainable'], seasonFit: ['FW'],
    certifications: ['RDS', 'GRS'], vegan: false,
    notes: '550–750 FP. Re:Down + Allied Feather Reborn programmes.',
  },
  {
    id: 'wadding-down-dwr-treated',
    name: 'DWR-treated down (water-resistant)',
    layer: 'L2', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'Down + durable water-repellent treatment (PFC-free post-2025)',
    defaultFinish: 'DWR-treated, washed',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['RDS'], vegan: false,
    notes: '650–850 FP. Allied DownTek, Toray Dimov, Nikwax Hydrophobic Down.',
  },

  // ─── L3 ───
  {
    id: 'supplier-allied-feather',
    name: 'Allied Feather + Down',
    layer: 'L3', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'RDS-certified goose/duck down (Track-My-Down provenance)',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['RDS', 'GRS'], vegan: false,
    supplier: {
      origin: 'USA (Vernon, CA) + Hungary',
      tier: 'mill',
      verificationUrl: 'https://alliedfeather.com/',
      secondaryUrl: 'https://trackmydown.com/',
    },
    notes: 'Largest RDS-certified down supplier in North America. Track-My-Down blockchain provenance. DownTek (DWR-treated) and Reborn (recycled) programmes. B2B direct to outerwear brands worldwide. Standard reference for premium and luxury down.',
  },
  {
    id: 'supplier-nikwax-down',
    name: 'Nikwax Hydrophobic Down',
    layer: 'L3', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'PFC-free hydrophobic-down treatment',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium'], aestheticTags: ['sport', 'sustainable'], seasonFit: ['FW'],
    vegan: false,
    supplier: {
      origin: 'UK (Wadhurst, East Sussex)',
      tier: 'finisher',
      verificationUrl: 'https://www.nikwax.com/en-gb/products/productdetail.php?productid=110',
    },
    notes: 'PFC-free hydrophobic-down treatment. Licensed to multiple down suppliers and brands (Rab, Mountain Equipment, etc.). Not a down supplier per se — a B2B treatment programme.',
  },
  {
    id: 'supplier-redown',
    name: 'Re:Down',
    layer: 'L3', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'recycled down — recovered from post-consumer duvets/pillows/parkas',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium'], aestheticTags: ['sustainable', 'sport'], seasonFit: ['FW'],
    certifications: ['RDS', 'GRS', 'OEKO-TEX'], vegan: false,
    supplier: {
      origin: 'Hungary (Mezőtúr)',
      tier: 'mill',
      verificationUrl: 'https://re-down.com/',
    },
    notes: 'Recycled-down specialist — recovers down from post-consumer duvets/pillows/parkas, washes + sterilises to GRS + RDS-recycled standard. B2B for outerwear brands seeking circular content.',
  },
  {
    id: 'supplier-idfl',
    name: 'IDFL Laboratory and Institute',
    layer: 'L3', parentId: 'wadding-down-rds', family: 'wadding',
    composition: 'down certification + testing lab (RDS audits, fill-power testing)',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    vegan: false,
    supplier: {
      origin: 'USA (Salt Lake City) + Asia + EU',
      tier: 'finisher',
      verificationUrl: 'https://www.idfl.com/',
      secondaryUrl: 'https://www.idfl.com/services/down-feather/',
    },
    notes: 'NOT a down supplier — the certification + testing lab. Provides RDS certification audits, fill-power testing, species identification. Listed because every B2B down purchase involves an IDFL test report.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 16. Synthetic insulation (PrimaLoft / Thermore / 3M Thinsulate)
// ───────────────────────────────────────────────────────────────────────

const waddingSyntheticInsulation: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-synthetic-insulation',
    name: 'Synthetic insulation (PrimaLoft / Thermore / Thinsulate)',
    layer: 'L1',
    family: 'wadding',
    composition: 'Polyester staple + microfiber web (continuous filament or short-staple)',
    weightRange: { min: 40, max: 200, unit: 'gsm' },
    defaultFinish: 'needle-punched, calendered',
    finishOptions: ['short-staple', 'continuous-filament', 'blended-down', 'recycled-pet'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sport', 'minimal', 'preppy'],
    seasonFit: ['FW', 'transitional'],
    certifications: ['GRS', 'RCS', 'OEKO-TEX'],
    vegan: true,
    notes: 'Three dominant B2B programmes: PrimaLoft (USA — Gold/Silver/Black + Bio + ThermoPlume + Cross Core); Thermore (Italy — Ecodown Fibers, Thermal Booster, Freedom); 3M Thinsulate (USA — G/B/M/X-Static, FeatherlessAlpine). All vegan; all GRS-trackable in recycled variants.',
  },

  // ─── L2 ───
  {
    id: 'wadding-primaloft-gold',
    name: 'PrimaLoft Gold (premium continuous filament)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber, continuous filament; Eco / Bio variants available',
    weightRange: { min: 60, max: 170, unit: 'gsm' }, defaultFinish: 'calendered, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    notes: 'Gold = top tier, ~75% recycled in Eco variant. Replaces 800FP down by performance comparison.',
  },
  {
    id: 'wadding-primaloft-silver',
    name: 'PrimaLoft Silver (mid-tier)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber',
    weightRange: { min: 60, max: 170, unit: 'gsm' }, defaultFinish: 'calendered, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium'], aestheticTags: ['sport', 'preppy'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS'], vegan: true,
    notes: 'Mid-tier — broad apparel use.',
  },
  {
    id: 'wadding-primaloft-black',
    name: 'PrimaLoft Black (entry tier)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber',
    weightRange: { min: 60, max: 170, unit: 'gsm' }, defaultFinish: 'calendered, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS'], vegan: true,
  },
  {
    id: 'wadding-primaloft-thermoplume',
    name: 'PrimaLoft ThermoPlume (blown synthetic-down)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber, loose-fill / blown',
    weightRange: { min: 60, max: 200, unit: 'gsm' }, defaultFinish: 'blown into baffles',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['GRS'], vegan: true,
    notes: 'Blown like down — fills baffles. Down-feel for vegan / animal-free positioning.',
  },
  {
    id: 'wadding-thermore-ecodown-fibers',
    name: 'Thermore Ecodown Fibers (blown recycled synthetic)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: '100% recycled polyester (post-consumer PET bottles)',
    weightRange: { min: 50, max: 200, unit: 'gsm' }, defaultFinish: 'blown into baffles',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport', 'sustainable', 'minimal'], seasonFit: ['FW'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    notes: 'Italian B2B — flagship recycled blown-fibre insulation.',
  },
  {
    id: 'wadding-thermore-classic',
    name: 'Thermore Classic / Thermal Booster (sheet)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber, sheet form',
    weightRange: { min: 40, max: 160, unit: 'gsm' }, defaultFinish: 'calendered, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium'], aestheticTags: ['sport', 'minimal', 'tailored'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
  },
  {
    id: 'wadding-3m-thinsulate',
    name: '3M Thinsulate (G, B, M, X-Static apparel grades)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester + polyolefin microfibers',
    weightRange: { min: 40, max: 200, unit: 'gsm' }, defaultFinish: 'calendered, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat', 'boot'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'preppy', 'minimal'], seasonFit: ['FW', 'transitional'],
    certifications: ['OEKO-TEX'], vegan: true,
    notes: 'G = standard apparel. B = workwear. M = waterproof. X-Static = anti-microbial silver.',
  },
  {
    id: 'wadding-3m-featherlessalpine',
    name: '3M Thinsulate FeatherlessAlpine (synthetic-down)',
    layer: 'L2', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'Polyester microfiber, blown-fibre form',
    weightRange: { min: 60, max: 180, unit: 'gsm' }, defaultFinish: 'blown into baffles',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport'], seasonFit: ['FW'],
    vegan: true,
    notes: "3M's down-look synthetic. Used by Eddie Bauer, REI, Marmot programs.",
  },

  // ─── L3 ───
  {
    id: 'supplier-primaloft',
    name: 'PrimaLoft Inc.',
    layer: 'L3', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'synthetic insulation — Gold / Silver / Black / Bio / ThermoPlume / Cross Core',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium', 'luxury'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA (Latham, NY)',
      tier: 'component-maker',
      verificationUrl: 'https://www.primaloft.com/',
      secondaryUrl: 'https://www.primaloft.com/insulation/',
    },
    notes: 'Originally developed for US Army (1983), commercialised in apparel 1990s. Global B2B brand-ingredient programme — licensees include every major outerwear brand (Stone Island, Norrøna, Salomon, REI, L.L.Bean, etc.). Bio + Eco variants are the sustainability flagship. Direct B2B with brand licensing requirement.',
  },
  {
    id: 'supplier-thermore',
    name: 'Thermore Italy',
    layer: 'L3', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'synthetic insulation — Ecodown Fibers + Thermal Booster + Freedom',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport', 'sustainable'], seasonFit: ['FW', 'transitional'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Italy (Milan HQ; production Italy + Asia)',
      tier: 'component-maker',
      verificationUrl: 'https://www.thermore.com/',
      secondaryUrl: 'https://www.thermore.com/en/products/',
    },
    notes: 'Italian synthetic-insulation specialist since 1972. Ecodown Fibers (blown synthetic-down) is the flagship — 100% recycled-PET version is the sustainability lead. Direct B2B for European + global outerwear brands.',
  },
  {
    id: 'supplier-3m-thinsulate',
    name: '3M Thinsulate',
    layer: 'L3', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'synthetic insulation — apparel grades (G, B, M, X-Static), FeatherlessAlpine',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat', 'boot'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'preppy'], seasonFit: ['FW', 'transitional'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA (St Paul, MN); production global',
      tier: 'component-maker',
      verificationUrl: 'https://www.3m.com/3M/en_US/p/c/apparel-thinsulate/',
      secondaryUrl: 'https://www.3m.com/3M/en_US/p/d/v000376898/',
    },
    notes: "3M's apparel-insulation brand. Direct B2B + brand-licensing; catalogue includes apparel grades (G, B, M, X-Static), FeatherlessAlpine, and footwear / glove grades (cross-listed in Rama 7). Workwear + outdoor + footwear standard reference.",
  },
  {
    id: 'supplier-climashield',
    name: 'Climashield (Albany International)',
    layer: 'L3', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'continuous-filament polyester insulation — Apex, Combat, HL',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'utility'], seasonFit: ['FW'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA',
      tier: 'component-maker',
      verificationUrl: 'https://www.climashield.com/',
      secondaryUrl: 'https://www.climashield.com/products/',
    },
    notes: 'Continuous-filament polyester insulation — Apex, Combat, HL. Mil-spec heritage (US Army ECWCS Level 7). B2B for outdoor + workwear + military. Apex and PadWool variants (the latter is wool-blend hybrid). Direct B2B + licensing.',
  },
  {
    id: 'supplier-toray-pec-insulation',
    name: 'Toray Industries — PEC / Heat Capsule',
    layer: 'L3', parentId: 'wadding-synthetic-insulation', family: 'wadding',
    composition: 'polyester synthetic insulation (PEC / Heat Capsule)',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'transitional'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://www.toray.com/global/products/fiber/',
    },
    notes: 'Toray runs synthetic-insulation programmes alongside its main polyester-yarn business. Used in Asian outerwear and Japanese technical brands. Dimov down-DWR programme also originates here.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 17. Wool batting / PadWool
// ───────────────────────────────────────────────────────────────────────

const waddingWoolBatting: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-wool-batting',
    name: 'Wool batting / wool-blend insulation',
    layer: 'L1',
    family: 'wadding',
    composition: 'Wool 50–100% (often blended with polyester for loft retention)',
    weightRange: { min: 100, max: 300, unit: 'gsm' },
    defaultFinish: 'needle-punched, calendered, scrim-faced',
    finishOptions: ['needle-punched', 'scrim-faced', 'resin-bonded', 'biodegradable'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'preppy'],
    seasonFit: ['FW', 'transitional'],
    certifications: ['RWS', 'OEKO-TEX'],
    vegan: false,
    notes: 'Wool batting offers natural temperature regulation, moisture wicking and odour resistance — at the cost of more weight per unit warmth than down or PrimaLoft. PadWool (Climashield) is a wool / continuous-filament polyester hybrid — the most common B2B wool-blend insulation. RWS certification for the wool component.',
  },

  // ─── L2 ───
  {
    id: 'wadding-padwool',
    name: 'PadWool (Climashield wool-blend)',
    layer: 'L2', parentId: 'wadding-wool-batting', family: 'wadding',
    composition: 'Wool + continuous-filament polyester',
    weightRange: { min: 100, max: 250, unit: 'gsm' }, defaultFinish: 'needle-punched, scrim-faced',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored'], seasonFit: ['FW', 'transitional'],
    certifications: ['RWS', 'OEKO-TEX'], vegan: false,
    notes: "Climashield's wool / PET hybrid — heritage outerwear positioning.",
  },
  {
    id: 'wadding-wool-100',
    name: '100% wool batting',
    layer: 'L2', parentId: 'wadding-wool-batting', family: 'wadding',
    composition: '100% wool (often pre-felted or needle-punched)',
    weightRange: { min: 150, max: 300, unit: 'gsm' }, defaultFinish: 'needle-punched',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat'],
    priceTier: ['luxury'], aestheticTags: ['tailored'], seasonFit: ['FW'],
    certifications: ['RWS', 'GOTS'], vegan: false,
    notes: 'Heritage / artisanal — used in country / chore-coat construction.',
  },

  // ─── L3 ───
  {
    id: 'supplier-climashield-padwool',
    name: 'Climashield (Albany International) — PadWool',
    layer: 'L3', parentId: 'wadding-wool-batting', family: 'wadding',
    composition: 'wool / continuous-filament polyester hybrid (PadWool)',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'utility'], seasonFit: ['FW'],
    certifications: ['RWS', 'OEKO-TEX'], vegan: false,
    supplier: {
      origin: 'USA',
      tier: 'component-maker',
      verificationUrl: 'https://www.climashield.com/products/',
    },
    notes: "Climashield's wool-blend insulation. Direct B2B for heritage outerwear + craft brands (e.g. Filson and similar workwear / heritage positioning).",
  },
  {
    id: 'supplier-thermore-wool',
    name: 'Thermore — wool-blend variants',
    layer: 'L3', parentId: 'wadding-wool-batting', family: 'wadding',
    composition: 'wool-blend synthetic insulation',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['tailored', 'sustainable'], seasonFit: ['FW'],
    certifications: ['RWS', 'OEKO-TEX'], vegan: false,
    supplier: {
      origin: 'Italy',
      tier: 'component-maker',
      verificationUrl: 'https://www.thermore.com/en/products/',
    },
    notes: 'Thermore runs wool-blend variants alongside Ecodown Fibers.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// 18. Cotton batting / cotton wadding
// ───────────────────────────────────────────────────────────────────────

const waddingCottonBatting: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-cotton-batting',
    name: 'Cotton batting / cotton wadding',
    layer: 'L1',
    family: 'wadding',
    composition: '100% cotton (organic and conventional); sometimes cotton/poly blend',
    weightRange: { min: 80, max: 250, unit: 'gsm' },
    defaultFinish: 'needle-punched, scrim-faced',
    finishOptions: ['needle-punched', 'resin-bonded', 'scrim-faced', 'organic-GOTS'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['preppy', 'minimal'],
    seasonFit: ['FW', 'transitional'],
    certifications: ['GOTS', 'OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Heritage / craft category — used in chore coats, quilted jackets, Sashiko-style outerwear. Less warm per gram than down or PrimaLoft; biodegradable + breathable. GOTS-organic variant is the sustainability lead. No global dominant B2B player at fashion industrial scale — sourced via converters (Fairfield Processing US, Vlieseline 80/20 line, Naigai JP) or organic-cotton spinning mills.',
  },

  // ─── L2 ───
  {
    id: 'wadding-cotton-organic',
    name: 'Cotton batting — GOTS organic',
    layer: 'L2', parentId: 'wadding-cotton-batting', family: 'wadding',
    composition: '100% organic cotton',
    weightRange: { min: 80, max: 200, unit: 'gsm' }, defaultFinish: 'needle-punched',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium'], aestheticTags: ['minimal', 'sustainable'], seasonFit: ['FW', 'transitional'],
    certifications: ['GOTS', 'OEKO-TEX'], vegan: true,
  },
  {
    id: 'wadding-cotton-poly-blend',
    name: 'Cotton/polyester batting (heritage chore-coat)',
    layer: 'L2', parentId: 'wadding-cotton-batting', family: 'wadding',
    composition: 'Cotton 80% + polyester 20%',
    weightRange: { min: 100, max: 250, unit: 'gsm' }, defaultFinish: 'needle-punched, resin-bonded',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['preppy', 'workwear'], seasonFit: ['FW', 'transitional'], vegan: true,
  },

  // ─── L3 ───
  // No global dominant B2B player for cotton batting at fashion industrial
  // scale. Designers source via local converters (Fairfield Processing US,
  // Vlieseline 80/20 cotton-batting line, Naigai JP) or organic-cotton
  // spinning mills.
];

// ───────────────────────────────────────────────────────────────────────
// 19. Polyester fiberfill (generic + recycled)
// ───────────────────────────────────────────────────────────────────────

const waddingPolyFiberfill: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-poly-fiberfill',
    name: 'Polyester fiberfill (generic + recycled)',
    layer: 'L1',
    family: 'wadding',
    composition: 'Polyester staple fiber, blown / carded / hollow-conjugated',
    weightRange: { min: 80, max: 300, unit: 'gsm' },
    defaultFinish: 'blown / carded / needle-punched',
    finishOptions: ['blown-loose-fill', 'carded-batt', 'hollow-conjugated', 'siliconized', 'recycled-PET'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-jacket', 'outerwear-coat', 'tote'],
    priceTier: ['fast', 'contemporary'],
    aestheticTags: ['sport', 'minimal'],
    seasonFit: ['FW', 'all-year'],
    certifications: ['GRS', 'RCS', 'OEKO-TEX', 'REACH'],
    vegan: true,
    notes: 'Cheapest and most ubiquitous synthetic insulation — generic polyester fiberfill underlies most fast-fashion and budget outerwear. Distinct from PrimaLoft / Thermore / Thinsulate in that it is commodity, not branded. rPET variant (post-consumer PET-bottle feedstock) is the sustainability route. No single dominant B2B brand at this commodity tier.',
  },

  // ─── L2 ───
  {
    id: 'wadding-poly-fiberfill-virgin',
    name: 'Virgin polyester fiberfill (commodity)',
    layer: 'L2', parentId: 'wadding-poly-fiberfill', family: 'wadding',
    composition: '100% virgin polyester staple',
    weightRange: { min: 80, max: 250, unit: 'gsm' }, defaultFinish: 'blown / carded',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat', 'tote'],
    priceTier: ['fast', 'contemporary'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'all-year'], vegan: true,
  },
  {
    id: 'wadding-poly-fiberfill-recycled',
    name: 'Recycled polyester fiberfill (rPET)',
    layer: 'L2', parentId: 'wadding-poly-fiberfill', family: 'wadding',
    composition: '100% recycled polyester (post-consumer PET)',
    weightRange: { min: 80, max: 300, unit: 'gsm' }, defaultFinish: 'blown / carded',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'sustainable'], seasonFit: ['FW', 'all-year'],
    certifications: ['GRS', 'RCS', 'OEKO-TEX'], vegan: true,
    notes: 'Repreve and similar branded rPET fibers — see lining-rpet-repreve.',
  },
  {
    id: 'wadding-poly-fiberfill-hollow',
    name: 'Hollow-conjugated polyester fiberfill',
    layer: 'L2', parentId: 'wadding-poly-fiberfill', family: 'wadding',
    composition: 'Hollow-fiber polyester, siliconized',
    weightRange: { min: 100, max: 300, unit: 'gsm' }, defaultFinish: 'siliconized, blown',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport', 'minimal'], seasonFit: ['FW', 'all-year'], vegan: true,
    notes: 'Better loft + recovery than solid-fiber. Bedding crossover.',
  },

  // ─── L3 ───
  // Commodity tier — fragmented across regional spinners + non-woven
  // converters. Premium / branded = PrimaLoft / Thermore / 3M / Climashield.
  // Sustainability-tracked = Repreve (rPET yarn) converted regionally.
];

// ───────────────────────────────────────────────────────────────────────
// 20. Reflective / featherless alternative insulation
// ───────────────────────────────────────────────────────────────────────

const waddingReflectiveInsulation: Material[] = [
  // ─── L1 ───
  {
    id: 'wadding-reflective-insulation',
    name: 'Reflective / featherless alternative insulation',
    layer: 'L1',
    family: 'wadding',
    composition: 'Polyester microfiber + metallic-film reflective layer (or aluminum-coated mesh)',
    weightRange: { min: 50, max: 150, unit: 'gsm' },
    defaultFinish: 'calendered, scrim-faced, with reflective layer',
    finishOptions: ['aluminum-mesh', 'metallic-film-laminated', 'aerogel-blended'],
    zones: ['Padding (insulation)'],
    subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport'],
    seasonFit: ['FW'],
    certifications: ['OEKO-TEX'],
    vegan: true,
    notes: 'Reflective insulations bounce body heat back inward. PrimaLoft Cross Core (with aerogel) and 3M Thinsulate FeatherlessAlpine are the canonical B2B options. Used in technical / expedition programs. Lower bulk than equivalent fill of standard synthetic.',
  },

  // ─── L2 ───
  {
    id: 'wadding-primaloft-cross-core',
    name: 'PrimaLoft Cross Core (with aerogel)',
    layer: 'L2', parentId: 'wadding-reflective-insulation', family: 'wadding',
    composition: 'Polyester microfiber + aerogel particles',
    weightRange: { min: 60, max: 150, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['OEKO-TEX'], vegan: true,
    notes: 'Aerogel-enhanced — used by The North Face, Helly Hansen tech lines.',
  },
  {
    id: 'wadding-3m-featherless-reflective',
    name: '3M Thinsulate FeatherlessAlpine reflective layup',
    layer: 'L2', parentId: 'wadding-reflective-insulation', family: 'wadding',
    composition: 'Polyester microfiber + Thinsulate reflective film backing',
    weightRange: { min: 60, max: 130, unit: 'gsm' }, defaultFinish: 'calendered, reflective-backed',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport'], seasonFit: ['FW'], vegan: true,
  },

  // ─── L3 ───
  {
    id: 'supplier-primaloft-cross-core',
    name: 'PrimaLoft Inc. — Cross Core programme',
    layer: 'L3', parentId: 'wadding-reflective-insulation', family: 'wadding',
    composition: 'aerogel-enhanced synthetic insulation (Cross Core)',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-coat', 'outerwear-jacket'],
    priceTier: ['premium', 'luxury'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['GRS', 'OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA',
      tier: 'component-maker',
      verificationUrl: 'https://www.primaloft.com/insulation/primaloft-cross-core/',
    },
    notes: 'Cross-listed from synthetic-insulation. Cross Core is the aerogel programme.',
  },
  {
    id: 'supplier-3m-thinsulate-featherless',
    name: '3M Thinsulate — FeatherlessAlpine',
    layer: 'L3', parentId: 'wadding-reflective-insulation', family: 'wadding',
    composition: 'reflective-backed featherless synthetic insulation',
    zones: ['Padding (insulation)'], subtypes: ['outerwear-jacket', 'outerwear-coat'],
    priceTier: ['contemporary', 'premium'], aestheticTags: ['sport'], seasonFit: ['FW'],
    certifications: ['OEKO-TEX'], vegan: true,
    supplier: {
      origin: 'USA',
      tier: 'component-maker',
      verificationUrl: 'https://www.3m.com/3M/en_US/p/c/apparel-thinsulate/',
    },
    notes: 'Cross-listed. Reflective-backed featherless programme.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATE — Rama 6 complete (20 inner-construction archetypes)
// ═══════════════════════════════════════════════════════════════════════

export const rama6: Material[] = [
  // Linings
  ...liningSilkHabotai,
  ...liningBemberg,
  ...liningCottonFine,
  ...liningPolyTaffeta,
  ...liningSatinAcetate,
  ...liningViscose,
  ...liningStretch,
  ...liningSustainable,
  // Interfacings
  ...interfacingWovenFusible,
  ...interfacingNonwovenFusible,
  ...interfacingHairCanvas,
  ...interfacingWeftInsertion,
  ...interfacingKnitFusible,
  ...interfacingStayTape,
  // Wadding
  ...waddingDownRds,
  ...waddingSyntheticInsulation,
  ...waddingWoolBatting,
  ...waddingCottonBatting,
  ...waddingPolyFiberfill,
  ...waddingReflectiveInsulation,
];
