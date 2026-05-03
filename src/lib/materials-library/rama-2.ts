/**
 * Rama 2 — Regenerated and semi-synthetic fibers
 *
 * Source: .research/materials-rama-2-regenerated-fibers.md (built 2026-05-04
 * with Felipe's "si no está claro, fuera" rule applied — Microsilk, Mylo,
 * Circulose/Renewcell and Mycotex are EXCLUDED from this catalog because
 * production is paused, the producer is no longer operating, or commercial
 * ROPA-grade availability is unverified). Vegea GrapeSkin is excluded here
 * and will land in Rama 4 (leather alternative). Bananatex is excluded —
 * abacá is already covered as a natural cellulosic in Rama 1.
 *
 * Coverage: 16 fibers across 3 families.
 *   regenerated-cellulosic: viscose, LIVA, modal, lyocell, cupro, acetate,
 *                           triacetate, naia, refibra, ECOVERO, SeaCell,
 *                           Crabyon, Orange Fiber (13)
 *   regenerated-protein:    QMilk, soybean SPF (2)
 *   bio-based:              Spiber Brewed Protein (1)
 *
 * Layer counts:
 *   L1: 16 base entries
 *   L2: 39 construction × weight × finish variants
 *   L3: 38 verified B2B mill / fiber producer suppliers
 *   ───────
 *   Total: 93 entries
 *
 * Entry order: by fiber section (matches markdown). Within fiber: L1 → L2 → L3.
 */

import type { Material } from './types';

// ═══════════════════════════════════════════════════════════════════════
// 1. VISCOSE / RAYON (generic)
// ═══════════════════════════════════════════════════════════════════════

const viscose: Material[] = [
  // ─── L1 ───
  {
    id: 'viscose',
    name: 'Viscose / Rayon',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% viscose (regenerated cellulose from wood pulp)',
    weightRange: { min: 90, max: 280, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'mercerized', 'garment-washed', 'enzyme-washed', 'calendered', 'peached', 'sand-washed'],
    zones: ['Body', 'Lining', 'Sleeve', 'Collar', 'Pocket'],
    subtypes: ['dress', 'top', 'shirt', 'blouse', 'tshirt', 'skirt', 'trouser', 'jumpsuit', 'blazer', 'loungewear', 'lingerie'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'romantic', 'resort', 'bohemian', 'tailored'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['OEKO-TEX', 'FSC', 'Canopy'],
    vegan: true,
  },

  // ─── L2 — Construction × weight × finish ───
  {
    id: 'viscose-challis',
    name: 'Viscose challis',
    layer: 'L2', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: '100% viscose',
    weightRange: { min: 90, max: 130, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'], subtypes: ['dress', 'blouse', 'skirt', 'top'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['romantic', 'resort', 'bohemian', 'minimal'],
    seasonFit: ['SS', 'transitional'], vegan: true,
  },
  {
    id: 'viscose-twill',
    name: 'Viscose twill',
    layer: 'L2', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: '100% viscose',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve', 'Pocket'],
    subtypes: ['trouser', 'blazer', 'skirt', 'jumpsuit', 'dress'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal', 'resort'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
  },
  {
    id: 'viscose-crepe',
    name: 'Viscose crepe',
    layer: 'L2', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: '100% viscose',
    weightRange: { min: 110, max: 180, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'jumpsuit'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'romantic', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'viscose-satin',
    name: 'Viscose satin',
    layer: 'L2', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: '100% viscose',
    weightRange: { min: 100, max: 160, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body'],
    subtypes: ['dress', 'blouse', 'skirt', 'lingerie', 'loungewear'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['romantic', 'minimal'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
  },
  {
    id: 'viscose-jersey',
    name: 'Viscose jersey',
    layer: 'L2', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: '100% viscose (often blended with elastane)',
    weightRange: { min: 130, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers / mills ───
  {
    id: 'supplier-birla-cellulose',
    name: 'Birla Cellulose (Aditya Birla Group)',
    layer: 'L3', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: 'Viscose staple fiber (mill range incl. Birla Viscose, Birla Modal, Birla Excel lyocell)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'shirt', 'blouse', 'tshirt', 'skirt', 'trouser', 'blazer', 'loungewear'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable', 'resort'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    supplier: {
      origin: 'India / Indonesia / Thailand',
      tier: 'mill',
      verificationUrl: 'https://www.livabybirlacellulose.com/business',
      secondaryUrl: 'https://canopyplanet.org/tools-and-resources/hot-button-report/aditya-birla',
    },
    notes: "World's largest VSF producer (~17% global share). 7 plants across India, Indonesia, Thailand, China. Pulp 95%+ FSC-certified. Brands: LIVA, Livaeco, Liva Reviva, Birla Viscose, Birla Modal, Birla Excel (lyocell). True B2B fiber producer selling to spinners and mills worldwide.",
  },
  {
    id: 'supplier-sateri',
    name: 'Sateri (RGE Group)',
    layer: 'L3', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: 'Viscose staple + lyocell fiber (B2B fiber producer)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'shirt', 'blouse', 'tshirt', 'skirt', 'trouser', 'blazer', 'loungewear'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
    certifications: ['OEKO-TEX', 'OEKO-TEX-STEP'],
    supplier: {
      origin: 'China / Indonesia / Brazil (RGE network)',
      tier: 'mill',
      verificationUrl: 'https://www.sateri.com/',
      secondaryUrl: 'https://hotbutton.canopyplanet.org/company/sateri-rge-group/',
    },
    notes: "World's largest viscose fibre maker. 2.4M tonnes annual capacity. PEFC-certified chain of custody. STeP by OEKO-TEX, OEKO-TEX Standard 100, ISO 9001/14001. Lyocell capacity expanding to 400,000 tonnes by 2025.",
  },
  {
    id: 'supplier-kelheim-fibres',
    name: 'Kelheim Fibres GmbH',
    layer: 'L3', parentId: 'viscose', family: 'regenerated-cellulosic',
    composition: 'Specialty viscose fiber (custom cross-sections, deniers, colored fibers)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'tshirt', 'skirt', 'trouser', 'lingerie'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Germany (Kelheim, Bavaria)',
      tier: 'mill',
      verificationUrl: 'https://kelheim-fibres.com/en/',
      secondaryUrl: 'https://canopyplanet.org/tools-and-resources/hot-button-report/kelheim-fibres',
    },
    notes: 'Specialty viscose mill since 1936. ~80–90,000 tonnes/year. Custom cross-sections, cutting lengths, deniers, colored fibers. Listed in Canopy Hot Button as low-risk pulp sourcing. Sells globally to spinners and converters.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 2. LIVA (Birla Cellulose branded viscose)
// ═══════════════════════════════════════════════════════════════════════

const liva: Material[] = [
  // ─── L1 ───
  {
    id: 'liva',
    name: 'LIVA (Birla Cellulose viscose)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% LIVA viscose (Birla Cellulose proprietary)',
    weightRange: { min: 100, max: 240, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'calendered', 'enzyme-washed', 'peached'],
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'skirt', 'trouser', 'jumpsuit', 'loungewear'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['romantic', 'minimal', 'resort'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['FSC', 'OEKO-TEX', 'Canopy'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'liva-eco',
    name: 'Livaeco (low-carbon, traceable)',
    layer: 'L2', parentId: 'liva', family: 'regenerated-cellulosic',
    composition: 'Livaeco viscose, traceable via blockchain (GreenTrack)',
    weightRange: { min: 100, max: 220, unit: 'gsm' },
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'top'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal', 'resort'],
    seasonFit: ['SS', 'all-year'],
    certifications: ['FSC', 'Canopy', 'OEKO-TEX'],
    vegan: true,
  },
  {
    id: 'liva-reviva',
    name: 'Liva Reviva (recycled-content viscose)',
    layer: 'L2', parentId: 'liva', family: 'regenerated-cellulosic',
    composition: 'Liva Reviva — viscose with up to 20% pre-consumer textile waste content',
    weightRange: { min: 110, max: 220, unit: 'gsm' },
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'top', 'skirt', 'trouser'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['FSC', 'RCS', 'OEKO-TEX', 'Canopy'],
    vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-birla-cellulose-liva',
    name: 'Birla Cellulose / LIVA',
    layer: 'L3', parentId: 'liva', family: 'regenerated-cellulosic',
    composition: 'LIVA-branded viscose fiber program (Birla Cellulose)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'skirt', 'trouser', 'loungewear'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable', 'resort'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    certifications: ['FSC', 'OEKO-TEX', 'Canopy'],
    supplier: {
      origin: 'India (multiple plants) + Indonesia + Thailand',
      tier: 'mill',
      verificationUrl: 'https://www.livabybirlacellulose.com/',
      secondaryUrl: 'https://www.livabybirlacellulose.com/business/fibre-production',
    },
    notes: "LIVA is Birla Cellulose's branded viscose fiber program. Producer is Birla Cellulose itself (Aditya Birla Group). LIVA is the consumer-facing tag program; fabric mills source LIVA-branded fiber directly from Birla and convert it. Operating across 7 plants worldwide. FSC-certified pulp.",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 3. MODAL (Lenzing Modal + generic)
// ═══════════════════════════════════════════════════════════════════════

const modal: Material[] = [
  // ─── L1 ───
  {
    id: 'modal',
    name: 'Modal',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% modal (regenerated cellulose, beech-wood pulp typical for Lenzing Modal)',
    weightRange: { min: 100, max: 260, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'mercerized', 'brushed', 'calendered', 'peached'],
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'tshirt', 'blouse', 'loungewear', 'lingerie', 'skirt', 'trouser', 'jumpsuit'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic', 'loungewear', 'sustainable'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['OEKO-TEX', 'FSC', 'EU-Ecolabel'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'modal-jersey',
    name: 'Modal jersey',
    layer: 'L2', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: '100% modal (often blended with elastane 5%)',
    weightRange: { min: 130, max: 200, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'loungewear', 'romantic'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'modal-twill',
    name: 'Modal twill',
    layer: 'L2', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: '100% modal',
    weightRange: { min: 140, max: 240, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['trouser', 'skirt', 'blazer', 'dress', 'jumpsuit'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'modal-satin',
    name: 'Modal satin',
    layer: 'L2', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: '100% modal',
    weightRange: { min: 110, max: 170, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body'],
    subtypes: ['dress', 'blouse', 'lingerie', 'loungewear', 'skirt'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['romantic', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'tencel-modal',
    name: 'TENCEL™ Modal (Lenzing branded)',
    layer: 'L2', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: '100% TENCEL™ Modal (Lenzing branded modal, FSC + EU Ecolabel)',
    weightRange: { min: 100, max: 240, unit: 'gsm' }, defaultFinish: 'raw',
    finishOptions: ['raw', 'Eco-Color', 'Indigo-Color', 'Micro', 'Air'],
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie', 'skirt', 'trouser'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'loungewear', 'sustainable'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers / mills ───
  {
    id: 'supplier-lenzing-modal',
    name: 'Lenzing AG (TENCEL™ Modal producer)',
    layer: 'L3', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Modal fiber (Lenzing-licensed B2B program)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie', 'skirt', 'trouser'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'sustainable', 'loungewear'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    supplier: {
      origin: 'Austria (Lenzing) + global mill partner network',
      tier: 'mill',
      verificationUrl: 'https://www.lenzing.com/products/brands/tenceltm/',
      secondaryUrl: 'https://lenzingpro.com/',
    },
    notes: 'Sole producer of TENCEL™ Modal fiber. Supplies fiber to certified mills globally via the Lenzing Pro / b2b.tencel.com portal. Eco Color and Indigo Color technologies launched 2023–2024. Mills must be Lenzing-certified to use the TENCEL™ Modal mark.',
  },
  {
    id: 'supplier-ekoten',
    name: 'Ekoten Fabrics',
    layer: 'L3', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Modal jersey + woven fabrics (Lenzing-certified mill partner)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Turkey (Izmir)',
      tier: 'mill',
      verificationUrl: 'https://www.ekoten.com.tr/',
      secondaryUrl: 'https://www.tencel.com/b2b/news-and-events/reducing-the-environmental-impact-perspectives-from-lenzings-mill-partners-on-tencel-modal-fibers-with-eco-color-technology',
    },
    notes: 'Lenzing-certified mill partner; develops modal jersey and woven fabrics with TENCEL™ Modal Eco Color technology. Confirmed by Lenzing as official mill partner in 2024 Eco Color partner article.',
  },
  {
    id: 'supplier-primotex',
    name: 'Primotex Textiles Holdings',
    layer: 'L3', parentId: 'modal', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Modal + ECOVERO™ blends (EcoLab fabric collection)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['tshirt', 'top', 'dress', 'blouse', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Hong Kong / China',
      tier: 'mill',
      verificationUrl: 'https://b2b.tencel.com/news-and-events/tencel-and-lenzing-ecovero-branded-fibers-featured-in-the-ecolab-fabric-collection-by-primotex',
    },
    notes: 'Long-time Lenzing partner. EcoLab fabric collection features TENCEL™ Modal and ECOVERO™ blends. Operates across multiple Asian textile hubs.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 4. LYOCELL / TENCEL (Lenzing-branded; B2B-licensed)
// ═══════════════════════════════════════════════════════════════════════

const lyocell: Material[] = [
  // ─── L1 ───
  {
    id: 'lyocell',
    name: 'Lyocell (TENCEL™ Lyocell)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% lyocell (regenerated cellulose, closed-loop NMMO solvent process)',
    weightRange: { min: 100, max: 320, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'sand-washed', 'calendered', 'brushed', 'enzyme-washed'],
    zones: ['Body', 'Lining', 'Sleeve', 'Pocket'],
    subtypes: ['dress', 'top', 'blouse', 'shirt', 'tshirt', 'trouser', 'jean', 'skirt', 'jumpsuit', 'loungewear', 'lingerie', 'blazer', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'sustainable', 'tailored', 'resort', 'loungewear'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'lyocell-jersey',
    name: 'Lyocell jersey',
    layer: 'L2', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: '100% lyocell (often blended with elastane 5%)',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'loungewear', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'lyocell-twill',
    name: 'Lyocell twill',
    layer: 'L2', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: '100% lyocell',
    weightRange: { min: 160, max: 260, unit: 'gsm' }, defaultFinish: 'peached',
    zones: ['Body', 'Sleeve'],
    subtypes: ['trouser', 'blazer', 'skirt', 'jumpsuit', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal', 'sustainable'],
    seasonFit: ['transitional', 'all-year'], vegan: true,
  },
  {
    id: 'lyocell-denim',
    name: 'Lyocell denim',
    layer: 'L2', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'Lyocell (often 30–60%) blended with cotton in denim warp/weft',
    weightRange: { min: 240, max: 360, unit: 'gsm' }, defaultFinish: 'garment-washed',
    zones: ['Body'],
    subtypes: ['jean', 'skirt', 'outerwear-jacket', 'short'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal', 'streetwear'],
    seasonFit: ['transitional', 'FW'], vegan: true,
  },
  {
    id: 'lyocell-poplin',
    name: 'Lyocell poplin',
    layer: 'L2', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: '100% lyocell',
    weightRange: { min: 100, max: 140, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body', 'Sleeve', 'Collar'],
    subtypes: ['shirt', 'blouse', 'dress'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['minimal', 'tailored', 'sustainable'],
    seasonFit: ['SS', 'transitional'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers / mills ───
  {
    id: 'supplier-lenzing-tencel',
    name: 'Lenzing AG (TENCEL™ Lyocell producer)',
    layer: 'L3', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Lyocell fiber (Lenzing-licensed B2B program)',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'shirt', 'tshirt', 'trouser', 'jean', 'skirt', 'loungewear', 'blazer'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'sustainable', 'tailored'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    supplier: {
      origin: 'Austria + USA (Mobile, Alabama TENCEL™ plant) + Lenzing global network',
      tier: 'mill',
      verificationUrl: 'https://www.lenzing.com/products/brands/tenceltm/',
      secondaryUrl: 'https://lenzingpro.com/',
    },
    notes: 'Sole branded TENCEL™ Lyocell producer. Licensed to certified mill partners. All fiber traceable via Lenzing Pro digital platform. EU Ecolabel + FSC. Supplies thousands of mills worldwide.',
  },
  {
    id: 'supplier-hermin-textile',
    name: 'HerMin Textile',
    layer: 'L3', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Lyocell wovens + knits (Lenzing-certified mill)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'top', 'shirt', 'blouse', 'tshirt', 'trouser', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['SS', 'all-year'], vegan: true,
    supplier: {
      origin: 'Taiwan',
      tier: 'mill',
      verificationUrl: 'https://www.hermin.com/product-tencel-fabric.html',
    },
    notes: 'Lenzing-certified TENCEL™ Lyocell fabric manufacturer. Produces wovens and knits in lyocell + blends. Listed publicly as Lenzing certified factory.',
  },
  {
    id: 'supplier-boyue-textile',
    name: 'Boyue Textile',
    layer: 'L3', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Lyocell wovens (fashion + uniforms)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['shirt', 'blouse', 'dress', 'trouser', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'workwear', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'China',
      tier: 'mill',
      verificationUrl: 'https://www.boyuefabric.com/Tencel-fabric/',
    },
    notes: 'Lenzing-certified TENCEL™ Lyocell fabric mill. Produces wovens for fashion and uniforms. Public Lenzing certification.',
  },
  {
    id: 'supplier-candiani-tencel',
    name: 'Candiani Denim (TENCEL™ partner)',
    layer: 'L3', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Lyocell + Modal Indigo Color denim blends',
    zones: ['Body'],
    subtypes: ['jean', 'outerwear-jacket', 'skirt', 'short'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['streetwear', 'sustainable', 'workwear'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Italy (Robecchetto con Induno, Milano)',
      tier: 'mill',
      verificationUrl: 'https://www.candianidenim.com/en',
      secondaryUrl: 'https://www.lenzing.com/newsroom/news-events/lenzing-unveils-pioneering-tenceltm-modal-fiber-with-indigo-color-technology/',
    },
    notes: 'Lenzing-confirmed denim mill partner for TENCEL™ Modal Indigo Color and TENCEL™ Lyocell denim blends. Already a major B2B denim mill (also covered in Rama 1 cotton denim).',
  },
  {
    id: 'supplier-cone-denim-tencel',
    name: 'Cone Denim (TENCEL™ partner)',
    layer: 'L3', parentId: 'lyocell', family: 'regenerated-cellulosic',
    composition: 'TENCEL™ Modal Indigo Color denim',
    zones: ['Body'],
    subtypes: ['jean', 'outerwear-jacket', 'short'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['streetwear', 'workwear', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'USA / Mexico (Parras Cone)',
      tier: 'mill',
      verificationUrl: 'https://www.conedenim.com/',
      secondaryUrl: 'https://www.lenzing.com/newsroom/news-events/lenzing-unveils-pioneering-tenceltm-modal-fiber-with-indigo-color-technology/',
    },
    notes: 'Lenzing-confirmed denim mill partner for TENCEL™ Modal Indigo Color initiatives. Public partnership announcement 2024.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 5. CUPRO / BEMBERG (Asahi Kasei B2B)
// ═══════════════════════════════════════════════════════════════════════

const cupro: Material[] = [
  // ─── L1 ───
  {
    id: 'cupro',
    name: 'Cupro (Bemberg)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% cupro (regenerated cellulose from cotton linter via cuprammonium process)',
    weightRange: { min: 60, max: 130, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['raw', 'calendered', 'peached', 'sand-washed'],
    zones: ['Lining', 'Body', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'dress', 'blouse', 'skirt', 'trouser', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'FSC'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'bemberg-lining',
    name: 'Bemberg Cupro lining',
    layer: 'L2', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: '100% Bemberg cupro',
    weightRange: { min: 60, max: 100, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'skirt', 'trouser', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'bemberg-shell',
    name: 'Bemberg Cupro shell (heavier weight)',
    layer: 'L2', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: '100% Bemberg cupro',
    weightRange: { min: 95, max: 130, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body', 'Sleeve'],
    subtypes: ['blouse', 'dress', 'shirt', 'skirt'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic'],
    seasonFit: ['SS', 'all-year'], vegan: true,
  },
  {
    id: 'bemberg-blend',
    name: 'Bemberg Cupro blends (with cotton / wool)',
    layer: 'L2', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: 'Cupro blended with cotton or wool (typical 30–70% cupro)',
    weightRange: { min: 140, max: 280, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['blazer', 'trouser', 'suit', 'outerwear-jacket', 'jean', 'skirt', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['transitional', 'all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers / mills ───
  {
    id: 'supplier-asahi-kasei',
    name: 'Asahi Kasei (Bemberg producer)',
    layer: 'L3', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: 'Bemberg cupro fiber + tow + textured/compound yarns',
    zones: ['Lining', 'Body', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'dress', 'blouse', 'skirt', 'trouser', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    certifications: ['OEKO-TEX', 'FSC'],
    supplier: {
      origin: 'Japan (Nobeoka, Miyazaki)',
      tier: 'mill',
      verificationUrl: 'https://www.asahi-kasei.co.jp/fibers/en/bemberg/',
      secondaryUrl: 'https://asahi-kasei.in/products/cupro-fiber/',
    },
    notes: 'Sole worldwide producer of cupro fiber under the Bemberg brand. Sells fiber + tow + textured/compound yarns to global textile converters. Has converter partner network in Japan (Fukui, Nishiwaki, Kiryu), Italy, India.',
  },
  {
    id: 'supplier-pure-denim-bemberg',
    name: 'Pure Denim (Bemberg denim partner)',
    layer: 'L3', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: '100% Bemberg + Bemberg/cotton/wool denim blends',
    zones: ['Body'],
    subtypes: ['jean', 'outerwear-jacket', 'skirt', 'short'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['streetwear', 'tailored'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Italy',
      tier: 'mill',
      verificationUrl: 'https://www.puredenim.com/',
      secondaryUrl: 'https://sourcingjournal.com/denim/denim-mills/pure-denim-bemberg-asahi-kasei-cupro-pitti-uomo-cotton-linter-397570/',
    },
    notes: 'Italian denim mill partner of Asahi Kasei. Produces collections in 100% Bemberg and Bemberg/cotton/wool blends. Public partnership at Pitti Uomo.',
  },
  {
    id: 'supplier-gianni-crespi',
    name: 'Gianni Crespi Foderami s.r.l.',
    layer: 'L3', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: 'Bemberg cupro lining (tailoring industry)',
    zones: ['Lining'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Italy',
      tier: 'finisher',
      verificationUrl: 'https://www.gcrespi.com/',
      secondaryUrl: 'https://www.asahi-kasei.co.jp/fibers/en/bemberg/production-area/',
    },
    notes: 'Italian lining fabric manufacturer and distributor. Bemberg cupro lining converter; supplies tailoring industry across Europe.',
  },
  {
    id: 'supplier-stylem',
    name: 'Stylem (cupro converter)',
    layer: 'L3', parentId: 'cupro', family: 'regenerated-cellulosic',
    composition: 'Cupro fabrics for apparel + lining + home textiles',
    zones: ['Lining', 'Body', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'dress', 'blouse', 'skirt', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://us.stylemfabrics.com/collections/cupro',
    },
    notes: 'Leading Japanese textile trading company supplying cupro fabrics for B2B customers across apparel, lining and home textiles.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 6. ACETATE (cellulose acetate)
// ═══════════════════════════════════════════════════════════════════════

const acetate: Material[] = [
  // ─── L1 ───
  {
    id: 'acetate',
    name: 'Acetate (cellulose acetate)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% cellulose acetate (regenerated cellulose esterified with acetic anhydride)',
    weightRange: { min: 80, max: 150, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['raw', 'calendered', 'peached'],
    zones: ['Lining', 'Body'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'dress', 'blouse', 'skirt', 'tailoring', 'loungewear'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'romantic'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX', 'FSC'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'acetate-satin-lining',
    name: 'Acetate satin lining',
    layer: 'L2', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: '100% acetate',
    weightRange: { min: 90, max: 130, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Lining'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'outerwear-coat', 'skirt', 'tailoring'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'acetate-taffeta',
    name: 'Acetate taffeta',
    layer: 'L2', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: '100% acetate',
    weightRange: { min: 80, max: 140, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body'],
    subtypes: ['dress', 'skirt', 'blouse'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['romantic'],
    seasonFit: ['transitional', 'FW'], vegan: true,
  },
  {
    id: 'acetate-blend-knitwear',
    name: 'Acetate blend knit (with viscose / nylon)',
    layer: 'L2', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: 'Acetate blended with viscose or nylon (typical 50/50)',
    weightRange: { min: 130, max: 200, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['dress', 'top', 'skirt', 'loungewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'romantic', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers ───
  {
    id: 'supplier-eastman-acetate',
    name: 'Eastman Chemical (Estron acetate yarns)',
    layer: 'L3', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: 'Estron natural + Chromspun solution-dyed acetate yarns',
    zones: ['Lining', 'Body'],
    subtypes: ['blazer', 'suit', 'outerwear-jacket', 'dress', 'blouse', 'skirt', 'tailoring'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'USA (Kingsport, Tennessee)',
      tier: 'mill',
      verificationUrl: 'https://www.eastman.com/en/products/brands/naia',
      secondaryUrl: 'https://en.wikipedia.org/wiki/Eastman_Chemical_Company',
    },
    notes: 'Major acetate fiber producer. Markets Estron natural and Chromspun solution-dyed acetate yarns for apparel, home furnishings, industrial fabrics. Also produces the Naia™ brand (covered separately under Naia).',
  },
  {
    id: 'supplier-mitsubishi-rayon-acetate',
    name: 'Mitsubishi Chemical Group / GSI Creos (acetate / triacetate)',
    layer: 'L3', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: 'Acetate + triacetate fiber (Soalon brand transferred to GSI Creos March 2025)',
    zones: ['Body', 'Lining'],
    subtypes: ['blazer', 'dress', 'blouse', 'skirt', 'trouser', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://polymer-additives.specialchem.com/news/industry-news/mitsubishi-chemical-to-transfer-of-triacetate-fiber-business-000234997',
      secondaryUrl: 'https://en.wikipedia.org/wiki/Cellulose_triacetate',
    },
    notes: "Largest acetate producer in Japan since the 1950s. Mitsubishi's triacetate fiber business transferred to GSI Creos Corporation effective March 2025; operations continuing under the Soalon brand. Acetate fiber business retained.",
  },
  {
    id: 'supplier-celanese-acetate',
    name: 'Celanese (acetate fibers / Celanese Acetate)',
    layer: 'L3', parentId: 'acetate', family: 'regenerated-cellulosic',
    composition: 'Cellulose acetate fiber (apparel + home textile)',
    zones: ['Lining', 'Body'],
    subtypes: ['blazer', 'suit', 'dress', 'blouse', 'skirt', 'tailoring'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'USA / global',
      tier: 'mill',
      verificationUrl: 'https://www.celanese.com/',
      secondaryUrl: 'https://www.businesswire.com/news/home/20210812005328/en/Global-Cellulose-Acetate-Market-Outlook-to-2026-with-Celanese-Daicel-Chemical-Eastman-Chemical-Mitsubishi-Rayon-and-Rhodia-Acetow-Dominating---ResearchAndMarkets.com',
    },
    notes: 'Long-standing major cellulose acetate producer. Listed in market reports among the top global cellulose acetate manufacturers. Apparel & home textile converter network globally.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 7. TRIACETATE
// ═══════════════════════════════════════════════════════════════════════

const triacetate: Material[] = [
  // ─── L1 ───
  {
    id: 'triacetate',
    name: 'Triacetate (cellulose triacetate)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% cellulose triacetate (>92% acetylated cellulose)',
    weightRange: { min: 100, max: 200, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['raw', 'calendered', 'heat-set'],
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'blazer', 'tailoring', 'loungewear'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'triacetate-twill',
    name: 'Triacetate twill (Soalon-style)',
    layer: 'L2', parentId: 'triacetate', family: 'regenerated-cellulosic',
    composition: '100% triacetate (or triacetate/polyester blend)',
    weightRange: { min: 140, max: 200, unit: 'gsm' }, defaultFinish: 'heat-set',
    zones: ['Body'],
    subtypes: ['dress', 'skirt', 'trouser', 'blouse', 'blazer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'triacetate-jersey',
    name: 'Triacetate jersey blend',
    layer: 'L2', parentId: 'triacetate', family: 'regenerated-cellulosic',
    composition: 'Triacetate blended with elastane / polyester',
    weightRange: { min: 130, max: 180, unit: 'gsm' }, defaultFinish: 'heat-set',
    zones: ['Body'],
    subtypes: ['dress', 'top', 'skirt', 'loungewear'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['minimal', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-gsi-creos-soalon',
    name: 'GSI Creos Corporation (Soalon triacetate)',
    layer: 'L3', parentId: 'triacetate', family: 'regenerated-cellulosic',
    composition: 'Soalon triacetate fiber',
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'blazer', 'tailoring'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    certifications: ['OEKO-TEX'],
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://www.gsi.co.jp/english/',
      secondaryUrl: 'https://polymer-additives.specialchem.com/news/industry-news/mitsubishi-chemical-to-transfer-of-triacetate-fiber-business-000234997',
    },
    notes: "Acquired Mitsubishi Chemical's triacetate fiber business effective March 2025; continues production under the Soalon brand. Production has not been discontinued; ownership transferred. Real B2B fiber producer.",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 8. NAIA (Eastman branded acetate, FSC-managed forests)
// ═══════════════════════════════════════════════════════════════════════

const naia: Material[] = [
  // ─── L1 ───
  {
    id: 'naia',
    name: 'Naia™ (Eastman cellulose acetate)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% Naia™ cellulose acetate from sustainably-managed forests (Eastman)',
    weightRange: { min: 90, max: 220, unit: 'gsm' },
    defaultFinish: 'calendered',
    finishOptions: ['raw', 'calendered', 'peached', 'sand-washed'],
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'top', 'blazer', 'tailoring', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic', 'sustainable'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['FSC', 'OEKO-TEX'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'naia-filament',
    name: 'Naia™ filament yarn',
    layer: 'L2', parentId: 'naia', family: 'regenerated-cellulosic',
    composition: 'Naia filament cellulose acetate',
    weightRange: { min: 90, max: 180, unit: 'gsm' }, defaultFinish: 'calendered',
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'blazer', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic'],
    seasonFit: ['SS', 'all-year'], vegan: true,
  },
  {
    id: 'naia-renew-staple',
    name: 'Naia™ Renew staple fiber (with recycled content)',
    layer: 'L2', parentId: 'naia', family: 'regenerated-cellulosic',
    composition: 'Naia Renew staple — 60% sustainably-sourced wood pulp + 40% certified recycled material (mass balance)',
    weightRange: { min: 110, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'top', 'blouse', 'skirt', 'trouser', 'loungewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['FSC', 'OEKO-TEX'],
    vegan: true,
    notes: 'Mass-balance system: 60% sustainably-sourced wood pulp + 40% certified recycled material. ISCC PLUS certified (cert not modeled in catalog enum).',
  },

  // ─── L3 — Verified B2B fiber producer + converter ───
  {
    id: 'supplier-eastman-naia',
    name: 'Eastman Chemical (Naia™ producer)',
    layer: 'L3', parentId: 'naia', family: 'regenerated-cellulosic',
    composition: 'Naia™ filament + staple cellulose acetate',
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser', 'top', 'blazer', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic', 'sustainable'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    certifications: ['FSC', 'OEKO-TEX'],
    supplier: {
      origin: 'USA (Kingsport, Tennessee) + China expansion (Huafon partnership 2025)',
      tier: 'mill',
      verificationUrl: 'https://www.eastman.com/en/products/brands/naia',
      secondaryUrl: 'https://textilefocus.com/eastman-naia-presented-a-new-cellulose-acetate-filament-yarn-at-intertextile-shanghai-2025/',
    },
    notes: 'Sole producer of the Naia™ brand. August 2025 announced Huafon Chemical partnership for localized China production. Naia portfolio = filament + staple. Sells fiber to mill converters globally; B2B-only program.',
  },
  {
    id: 'supplier-grandtek-asia-naia',
    name: 'Grandtek Asia Corp (Naia™ converter)',
    layer: 'L3', parentId: 'naia', family: 'regenerated-cellulosic',
    composition: 'Naia + Naia Renew yarns and fabrics',
    zones: ['Body', 'Lining'],
    subtypes: ['dress', 'blouse', 'skirt', 'top', 'loungewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['SS', 'all-year'], vegan: true,
    supplier: {
      origin: 'Taiwan / Hong Kong',
      tier: 'mill',
      verificationUrl: 'https://www.gac2003.com/en/technology/naia-renew/',
    },
    notes: 'Eastman-listed Naia partner, develops Naia and Naia Renew yarns and fabrics for fashion brands. Listed publicly with technology pages on the Naia program.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 9. REFIBRA (Lenzing — lyocell with recycled cotton)
// ═══════════════════════════════════════════════════════════════════════

const refibra: Material[] = [
  // ─── L1 ───
  {
    id: 'refibra',
    name: 'REFIBRA™ (Lenzing recycled lyocell)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: 'Lyocell with up to 30% pre- and post-consumer cotton textile waste + virgin pulp',
    weightRange: { min: 110, max: 360, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'garment-washed', 'enzyme-washed'],
    zones: ['Body', 'Lining', 'Sleeve', 'Pocket'],
    subtypes: ['dress', 'top', 'tshirt', 'shirt', 'blouse', 'trouser', 'jean', 'skirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['FSC', 'RCS', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'refibra-twill',
    name: 'REFIBRA™ twill',
    layer: 'L2', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'Lyocell + recycled cotton (REFIBRA technology)',
    weightRange: { min: 160, max: 260, unit: 'gsm' }, defaultFinish: 'peached',
    zones: ['Body', 'Sleeve'],
    subtypes: ['trouser', 'blazer', 'skirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'tailored'],
    seasonFit: ['transitional', 'all-year'], vegan: true,
  },
  {
    id: 'refibra-denim',
    name: 'REFIBRA™ denim',
    layer: 'L2', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'REFIBRA lyocell + cotton denim warp/weft',
    weightRange: { min: 240, max: 360, unit: 'gsm' }, defaultFinish: 'garment-washed',
    zones: ['Body'],
    subtypes: ['jean', 'skirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'streetwear'],
    seasonFit: ['transitional', 'FW'], vegan: true,
  },
  {
    id: 'refibra-jersey',
    name: 'REFIBRA™ jersey',
    layer: 'L2', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'REFIBRA lyocell jersey',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer + mill partners ───
  {
    id: 'supplier-lenzing-refibra',
    name: 'Lenzing AG (REFIBRA™ producer)',
    layer: 'L3', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'REFIBRA™ branded lyocell with up to 30% recycled textile waste',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'tshirt', 'shirt', 'blouse', 'trouser', 'jean', 'skirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    certifications: ['FSC', 'RCS', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    supplier: {
      origin: 'Austria (Lenzing)',
      tier: 'mill',
      verificationUrl: 'https://www.lenzing.com/newsroom/news-events/refibratm-technology-lenzings-initiative-to-drive-circular-economy-in-the-textile-world/',
      secondaryUrl: 'https://www.lenzing.com/products/brands/tenceltm/',
    },
    notes: 'Sole producer of REFIBRA™ branded lyocell. Commercial since 2017 — first cellulosic fiber with recycled content at scale. Up to 30% recycled textile waste. Mills must be Lenzing-certified.',
  },
  {
    id: 'supplier-artistic-milliners',
    name: 'Artistic Milliners (REFIBRA™ denim partner)',
    layer: 'L3', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'REFIBRA™ recycled lyocell denim (Fiber Recycling Initiative)',
    zones: ['Body'],
    subtypes: ['jean', 'outerwear-jacket', 'short', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'streetwear'],
    seasonFit: ['transitional', 'FW', 'all-year'], vegan: true,
    supplier: {
      origin: 'Pakistan (Karachi)',
      tier: 'mill',
      verificationUrl: 'https://artisticmilliners.com/',
      secondaryUrl: 'https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/',
    },
    notes: 'Lenzing-confirmed REFIBRA™ denim mill partner. Part of the Fiber Recycling Initiative by TENCEL™ for mechanically recycled lyocell denim at commercial scale.',
  },
  {
    id: 'supplier-textil-santanderina-refibra',
    name: 'Textil Santanderina (REFIBRA™ partner)',
    layer: 'L3', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'Cotton + REFIBRA lyocell mill (full vertical integration)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'shirt', 'blouse', 'trouser', 'skirt', 'outerwear-jacket'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Spain (Cantabria)',
      tier: 'mill',
      verificationUrl: 'https://www.textilsantanderina.com/',
      secondaryUrl: 'https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/',
    },
    notes: 'Lenzing-confirmed REFIBRA mill partner via Fiber Recycling Initiative. Spanish cotton + lyocell mill with full vertical integration.',
  },
  {
    id: 'supplier-canatiba-refibra',
    name: 'Canatiba (REFIBRA™ partner)',
    layer: 'L3', parentId: 'refibra', family: 'regenerated-cellulosic',
    composition: 'REFIBRA™ denim (Brazilian denim mill, Fiber Recycling Initiative)',
    zones: ['Body'],
    subtypes: ['jean', 'outerwear-jacket', 'short', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'streetwear'],
    seasonFit: ['transitional', 'all-year'], vegan: true,
    supplier: {
      origin: 'Brazil',
      tier: 'mill',
      verificationUrl: 'https://canatiba.com.br/',
      secondaryUrl: 'https://sourcingjournal.com/sustainability/sustainability-materials/lenzing-circularity-fiber-innovation-collaboration-tencel-lyocell-refibra-ecovero-sodra-460703/',
    },
    notes: 'Lenzing-confirmed Brazilian denim mill partner in the Fiber Recycling Initiative for REFIBRA. Major South American denim mill.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 10. ECOVERO (Lenzing branded sustainable viscose)
// ═══════════════════════════════════════════════════════════════════════

const ecovero: Material[] = [
  // ─── L1 ───
  {
    id: 'ecovero',
    name: 'LENZING™ ECOVERO™ viscose',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '100% LENZING™ ECOVERO™ viscose (FSC + EU Ecolabel)',
    weightRange: { min: 90, max: 260, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'calendered', 'peached', 'enzyme-washed'],
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'shirt', 'skirt', 'trouser', 'jumpsuit', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'romantic', 'resort', 'sustainable'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'ecovero-challis',
    name: 'ECOVERO™ challis',
    layer: 'L2', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: '100% ECOVERO viscose',
    weightRange: { min: 90, max: 130, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'skirt', 'top'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['romantic', 'resort', 'sustainable'],
    seasonFit: ['SS', 'transitional'], vegan: true,
  },
  {
    id: 'ecovero-twill',
    name: 'ECOVERO™ twill',
    layer: 'L2', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: '100% ECOVERO viscose',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['trouser', 'blazer', 'skirt', 'jumpsuit', 'dress'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['tailored', 'minimal', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'ecovero-refibra',
    name: 'ECOVERO™ + REFIBRA™ technology (≥20% recycled)',
    layer: 'L2', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: 'ECOVERO viscose with REFIBRA technology — minimum 20% recycled pre/post-consumer textile waste',
    weightRange: { min: 110, max: 240, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'skirt', 'trouser'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['FSC', 'EU-Ecolabel', 'RCS', 'OEKO-TEX'],
    vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer + mill partners ───
  {
    id: 'supplier-lenzing-ecovero',
    name: 'Lenzing AG (ECOVERO™ producer)',
    layer: 'L3', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: 'LENZING™ ECOVERO™ branded viscose fiber',
    zones: ['Body', 'Lining', 'Sleeve'],
    subtypes: ['dress', 'top', 'blouse', 'shirt', 'skirt', 'trouser', 'jumpsuit', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal', 'romantic'],
    seasonFit: ['SS', 'transitional', 'all-year'], vegan: true,
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX', 'OEKO-TEX-STEP'],
    supplier: {
      origin: 'Austria + Lenzing global network',
      tier: 'mill',
      verificationUrl: 'https://www.ecovero.com/',
      secondaryUrl: 'https://www.lenzing.com/products/brands/lenzingtm-ecoverotm/',
    },
    notes: 'Sole producer of LENZING™ ECOVERO™ branded viscose. First responsible viscose with EU Ecolabel from day one. ~500+ brand partners; hundreds of yarn spinners certified globally via Lenzing Pro.',
  },
  {
    id: 'supplier-new-focus-textiles',
    name: 'New Focus Textiles',
    layer: 'L3', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: 'ECOVERO™ + REFIBRA™ woven fabric (Lenzing-certified mill)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'skirt', 'trouser'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['SS', 'all-year'], vegan: true,
    supplier: {
      origin: 'Taiwan',
      tier: 'mill',
      verificationUrl: 'https://newfocustex.com/lenzing-ecovero-fabric-manufacturer/',
      secondaryUrl: 'https://newfocustex.com/explaining-lenzing-fibers-tencel-ecovero-and-refibra/',
    },
    notes: 'Lenzing-certified ECOVERO™ + REFIBRA™ woven fabric mill. Develops fashion fabric collections in ECOVERO and lyocell blends.',
  },
  {
    id: 'supplier-primotex-ecovero',
    name: 'Primotex Textiles Holdings (ECOVERO™ partner)',
    layer: 'L3', parentId: 'ecovero', family: 'regenerated-cellulosic',
    composition: 'ECOVERO viscose + TENCEL Modal blends (EcoLab fabric collection)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'top', 'skirt'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'Hong Kong / China',
      tier: 'mill',
      verificationUrl: 'https://b2b.tencel.com/news-and-events/tencel-and-lenzing-ecovero-branded-fibers-featured-in-the-ecolab-fabric-collection-by-primotex',
    },
    notes: 'EcoLab fabric collection features ECOVERO viscose and TENCEL Modal blends. Long-time Lenzing mill partner.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 11. SEACELL (Smartfiber AG — kelp + lyocell hybrid)
// ═══════════════════════════════════════════════════════════════════════

const seacell: Material[] = [
  // ─── L1 ───
  {
    id: 'seacell',
    name: 'SeaCell™ (Smartfiber AG seaweed-cellulose hybrid)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: '~85% lyocell or modal cellulose + ~4% brown seaweed (Ascophyllum nodosum from Icelandic fjords) + cellulose binder',
    weightRange: { min: 130, max: 240, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'enzyme-washed'],
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal', 'loungewear'],
    seasonFit: ['all-year'],
    certifications: ['EU-Ecolabel', 'OEKO-TEX'],
    vegan: true,
  },

  // ─── L2 — Variants ───
  {
    id: 'seacell-jersey',
    name: 'SeaCell™ jersey (lyocell base)',
    layer: 'L2', parentId: 'seacell', family: 'regenerated-cellulosic',
    composition: 'Lyocell + brown algae (SeaCell)',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },
  {
    id: 'seacell-modal-base',
    name: 'SeaCell™ (modal base)',
    layer: 'L2', parentId: 'seacell', family: 'regenerated-cellulosic',
    composition: 'Modal + brown algae (SeaCell)',
    weightRange: { min: 130, max: 200, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'loungewear', 'lingerie', 'top'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['loungewear', 'minimal', 'sustainable'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-smartfiber-ag',
    name: 'Smartfiber AG (SeaCell™ producer)',
    layer: 'L3', parentId: 'seacell', family: 'regenerated-cellulosic',
    composition: 'SeaCell™ fiber (lyocell base + brown seaweed)',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'dress', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
    certifications: ['EU-Ecolabel', 'OEKO-TEX'],
    supplier: {
      origin: "Germany (Rudolstadt) — fiber spun at Lenzing's Austrian facilities under license",
      tier: 'mill',
      verificationUrl: 'https://smartfiber.de/en/seacell',
      secondaryUrl: 'https://marketplace.chemsec.org/Alternative/SeaCell-natural-cellulose-fiber-880',
    },
    notes: 'Sole producer of SeaCell™. Lyocell license from Lenzing. EU Ecolabel since 2014, OEKO-TEX 100, TÜV Austria compostable. B2B fiber producer for spinners and mills; brand partners include CALIDA, FTC, WYLD1, SPEIDEL.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 12. CRABYON (Omikenshi — chitin/chitosan + viscose hybrid)
// ═══════════════════════════════════════════════════════════════════════

const crabyon: Material[] = [
  // ─── L1 ───
  {
    id: 'crabyon',
    name: 'Crabyon™ (Omikenshi chitin-cellulose hybrid)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: 'Chitosan (from crab/shellfish shells) co-extruded with viscose cellulose',
    weightRange: { min: 130, max: 240, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'enzyme-washed'],
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'],
    vegan: false,
    notes: 'Chitosan derived from crab/shellfish shells → animal-derived → vegan: false. Anti-bacterial properties suitable for wellness loungewear and lingerie.',
  },

  // ─── L2 — Variants ───
  {
    id: 'crabyon-jersey',
    name: 'Crabyon™ jersey (knit)',
    layer: 'L2', parentId: 'crabyon', family: 'regenerated-cellulosic',
    composition: 'Crabyon + cotton or modal blend (typical 30–50% Crabyon)',
    weightRange: { min: 130, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['loungewear'],
    seasonFit: ['all-year'], vegan: false,
  },

  // ─── L3 — Verified B2B fiber producer + spinner + distributor ───
  {
    id: 'supplier-omikenshi-crabyon',
    name: 'Omikenshi Co., Ltd. (Crabyon producer)',
    layer: 'L3', parentId: 'crabyon', family: 'regenerated-cellulosic',
    composition: 'Crabyon fiber tops + tows + spun yarns',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: false,
    supplier: {
      origin: 'Japan',
      tier: 'mill',
      verificationUrl: 'https://omikenshi.co.jp/profile_english/',
      secondaryUrl: 'https://www.swicofil.com/commerce/products/crabyon/517/introduction',
    },
    notes: 'Sole worldwide producer of Crabyon. Established commercial process for chitosan + viscose co-extrusion without organic solvent. Sells fiber tops, tows and spun yarns globally via Swicofil.',
  },
  {
    id: 'supplier-pozzi-electa-crabyon',
    name: 'Pozzi Electa (Crabyon spinner)',
    layer: 'L3', parentId: 'crabyon', family: 'regenerated-cellulosic',
    composition: 'Crabyon yarn (Italian spinner, 15+ years experience)',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: false,
    supplier: {
      origin: 'Italy',
      tier: 'mill',
      verificationUrl: 'https://www.pozzielecta.it/en/about-us/',
      secondaryUrl: 'https://lampoonmagazine.com/article/2023/12/30/crabyon-fibra-cellulosa-chitosano-granchio-pozzi-electa-sostenibile/',
    },
    notes: 'Italian textile producer; has spun Crabyon for ~15 years. Public Lampoon Magazine feature confirms commercial Crabyon yarn production at Pozzi Electa.',
  },
  {
    id: 'supplier-swicofil-crabyon',
    name: 'Swicofil AG (Crabyon distributor)',
    layer: 'L3', parentId: 'crabyon', family: 'regenerated-cellulosic',
    composition: 'Crabyon tops, tows, spun yarns (global B2B distribution)',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: false,
    supplier: {
      origin: 'Switzerland (Emmenbrücke)',
      tier: 'trim-maker',
      verificationUrl: 'https://www.swicofil.com/commerce/products/crabyon/517/introduction',
      secondaryUrl: 'https://old.swicofil.com/crabyon.html',
    },
    notes: 'Global B2B distributor of Crabyon tops, tows, spun yarns. Long-standing Omikenshi partner. Public product page lists technical specs.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 13. ORANGE FIBER (citrus-pulp cellulose)
// ═══════════════════════════════════════════════════════════════════════

const orangeFiber: Material[] = [
  // ─── L1 ───
  {
    id: 'orange-fiber',
    name: 'Orange Fiber (citrus pulp cellulose)',
    layer: 'L1',
    family: 'regenerated-cellulosic',
    composition: 'Cellulose extracted from citrus juice processing waste (pastazzo) — typically blended with TENCEL™ lyocell or silk',
    weightRange: { min: 90, max: 180, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'calendered', 'printed'],
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'top', 'skirt', 'blazer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'romantic', 'resort'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC', 'OEKO-TEX'],
    vegan: true,
    notes: 'Limited annual supply — most volume goes via Lenzing TENCEL™ Limited Edition program. Treat as low-volume luxury fiber for capsule/exclusive use.',
  },

  // ─── L2 — Variants ───
  {
    id: 'orange-fiber-tencel-blend',
    name: 'Orange Fiber + TENCEL™ Lyocell blend',
    layer: 'L2', parentId: 'orange-fiber', family: 'regenerated-cellulosic',
    composition: 'Orange Fiber blended with TENCEL™ Lyocell (Lenzing TENCEL™ Limited Edition collaboration)',
    weightRange: { min: 100, max: 180, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'top', 'skirt'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'resort'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC', 'EU-Ecolabel', 'OEKO-TEX'],
    vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-orange-fiber',
    name: 'Orange Fiber Srl',
    layer: 'L3', parentId: 'orange-fiber', family: 'regenerated-cellulosic',
    composition: 'Patented citrus-waste cellulose fiber (blended with lyocell or silk)',
    zones: ['Body', 'Sleeve'],
    subtypes: ['dress', 'blouse', 'top', 'skirt', 'blazer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'romantic', 'resort'],
    seasonFit: ['SS', 'transitional'], vegan: true,
    certifications: ['FSC', 'OEKO-TEX'],
    supplier: {
      origin: 'Italy (Sicily)',
      tier: 'mill',
      verificationUrl: 'https://orangefiber.it/heritage/',
      secondaryUrl: 'https://b2b.tencel.com/news-and-events/lenzing-collaborates-with-orange-fiber-as-part-of-new-tencel-limited-edition-initiative',
    },
    notes: 'Patented citrus-waste cellulose process. B2B fabric supplier; supply constrained vs viscose. Commercial collaborations confirmed: Salvatore Ferragamo (2017), H&M (Conscious Exclusive 2019), Lenzing TENCEL™ Limited Edition (2021–2025). Capacity expansion announced 2025.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 14. QMILK (casein / milk-protein fiber)
// ═══════════════════════════════════════════════════════════════════════

const qmilk: Material[] = [
  // ─── L1 ───
  {
    id: 'qmilk',
    name: 'QMilk (casein milk-protein fiber)',
    layer: 'L1',
    family: 'regenerated-protein',
    composition: 'Regenerated casein protein from non-food milk (Qmilch GmbH patented process)',
    weightRange: { min: 130, max: 220, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached'],
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'],
    vegan: false,
    notes: 'Casein is animal-derived (milk protein) → vegan: false. Capacity remains modest; recommended for capsule and high-end wellness apparel rather than bulk programs.',
  },

  // ─── L2 — Variants ───
  {
    id: 'qmilk-blend-jersey',
    name: 'QMilk blend jersey (with cotton or silk)',
    layer: 'L2', parentId: 'qmilk', family: 'regenerated-protein',
    composition: 'QMilk fiber blended with cotton or silk (typical 20–50% QMilk)',
    weightRange: { min: 130, max: 200, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'loungewear', 'lingerie', 'top'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['loungewear'],
    seasonFit: ['all-year'], vegan: false,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-qmilch-gmbh',
    name: 'Qmilch GmbH (QMilk producer)',
    layer: 'L3', parentId: 'qmilk', family: 'regenerated-protein',
    composition: 'QMilk casein milk-protein fiber',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: false,
    certifications: ['OEKO-TEX'],
    supplier: {
      origin: 'Germany (Hannover)',
      tier: 'mill',
      verificationUrl: 'https://www.qmilkfiber.eu/?lang=en',
      secondaryUrl: 'https://www.fibre2fashion.com/news/textile-news/newsdetails.aspx?news_id=113192',
    },
    notes: 'Sole producer of QMilk fiber. Patented closed-loop casein-from-non-food-milk process. Small-scale industrial production but verified commercial operations. Fiber supplied to spinners and converters; positioned for wellness apparel, lingerie, baby clothing, blends.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 15. SOYBEAN PROTEIN FIBER (SPF / Azlon)
// ═══════════════════════════════════════════════════════════════════════

const soybeanSpf: Material[] = [
  // ─── L1 ───
  {
    id: 'soybean-spf',
    name: 'Soybean Protein Fiber (SPF)',
    layer: 'L1',
    family: 'regenerated-protein',
    composition: 'Regenerated soy protein extracted from soybean processing residue (often blended with viscose / cotton in commercial textiles)',
    weightRange: { min: 130, max: 240, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'enzyme-washed'],
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie', 'dress', 'blouse'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'],
    certifications: ['OEKO-TEX'],
    vegan: true,
    notes: 'Niche regenerated-protein fiber. Commercial production is primarily Chinese; quality and supplier reliability vary widely. Use for capsule/wellness programs, not bulk denim/tailoring.',
  },

  // ─── L2 — Variants ───
  {
    id: 'soybean-spf-jersey',
    name: 'Soybean SPF jersey (knit blend)',
    layer: 'L2', parentId: 'soybean-spf', family: 'regenerated-protein',
    composition: 'Soybean SPF blended with cotton or viscose (typical 30–50% SPF)',
    weightRange: { min: 140, max: 220, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['loungewear'],
    seasonFit: ['all-year'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producers ───
  {
    id: 'supplier-makeit-soybean',
    name: 'SuZhou Makeit Technology Co., Ltd. (Changshu Meijie mill)',
    layer: 'L3', parentId: 'soybean-spf', family: 'regenerated-protein',
    composition: 'Soybean protein fiber (B2B fiber supply)',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'China (Suzhou / Changshu)',
      tier: 'mill',
      verificationUrl: 'https://www.makeitfiber.com/Soybean-Protein-Fiber',
    },
    notes: 'Manufacturer + trader of soybean protein fiber. Owns Changshu Meijie Chemical Fiber Co., Ltd. (~20,000 m² mill). B2B fiber supply to global converters.',
  },
  {
    id: 'supplier-abrand-technology-soybean',
    name: 'ABrand Technology Company (Soybean Protein Fiber)',
    layer: 'L3', parentId: 'soybean-spf', family: 'regenerated-protein',
    composition: 'Soybean protein fiber distribution',
    zones: ['Body', 'Lining'],
    subtypes: ['tshirt', 'top', 'loungewear', 'lingerie'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'loungewear'],
    seasonFit: ['all-year'], vegan: true,
    supplier: {
      origin: 'China',
      tier: 'trim-maker',
      verificationUrl: 'https://old.swicofil.com/abrand_technology_soybean_protein_fiber.html',
    },
    notes: 'Application, marketing and services of Soybean Protein Fiber. Distributed via Swicofil global B2B channel.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 16. BREWED PROTEIN (Spiber Brewed Protein™)
// ═══════════════════════════════════════════════════════════════════════

const brewedProtein: Material[] = [
  // ─── L1 ───
  {
    id: 'brewed-protein',
    name: 'Brewed Protein™ (Spiber bio-fermented protein)',
    layer: 'L1',
    family: 'bio-based',
    composition: 'Microbially-fermented structural protein from plant-derived sugars (no animal, no spider DNA in final fiber)',
    weightRange: { min: 130, max: 320, unit: 'gsm' },
    defaultFinish: 'raw',
    finishOptions: ['raw', 'peached', 'calendered'],
    zones: ['Body', 'Sleeve', 'Lining'],
    subtypes: ['dress', 'top', 'blouse', 'sweater', 'knitwear-top', 'blazer', 'outerwear-jacket', 'outerwear-coat', 'tailoring', 'loungewear'],
    priceTier: ['luxury'],
    aestheticTags: ['sustainable', 'tailored', 'minimal', 'avant-garde'],
    seasonFit: ['transitional', 'FW', 'all-year'],
    certifications: ['OEKO-TEX'],
    vegan: true,
    notes: 'Replaces older "Microsilk" / spider-silk-synthetic category. Spiber is the only commercial-scale producer in 2026.',
  },

  // ─── L2 — Variants ───
  {
    id: 'brewed-protein-suiting',
    name: 'Brewed Protein™ suiting blend',
    layer: 'L2', parentId: 'brewed-protein', family: 'bio-based',
    composition: 'Brewed Protein™ blended with wool / cashmere / silk (typical 20–60% Brewed Protein)',
    weightRange: { min: 200, max: 320, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body', 'Sleeve'],
    subtypes: ['blazer', 'suit', 'trouser', 'outerwear-coat', 'tailoring'],
    priceTier: ['luxury'],
    aestheticTags: ['tailored', 'sustainable'],
    seasonFit: ['FW', 'all-year'], vegan: true,
  },
  {
    id: 'brewed-protein-knit',
    name: 'Brewed Protein™ knit (sweater / top blend)',
    layer: 'L2', parentId: 'brewed-protein', family: 'bio-based',
    composition: 'Brewed Protein™ blended with wool / cashmere',
    weightRange: { min: 220, max: 360, unit: 'gsm' }, defaultFinish: 'raw',
    zones: ['Body'],
    subtypes: ['sweater', 'knitwear-top', 'top'],
    priceTier: ['luxury'],
    aestheticTags: ['minimal', 'sustainable'],
    seasonFit: ['transitional', 'FW'], vegan: true,
  },

  // ─── L3 — Verified B2B fiber producer ───
  {
    id: 'supplier-spiber-inc',
    name: 'Spiber Inc. (Brewed Protein™ producer)',
    layer: 'L3', parentId: 'brewed-protein', family: 'bio-based',
    composition: 'Brewed Protein™ fiber (microbially-fermented structural protein)',
    zones: ['Body', 'Sleeve', 'Lining'],
    subtypes: ['dress', 'top', 'sweater', 'knitwear-top', 'blazer', 'outerwear-jacket', 'outerwear-coat', 'tailoring'],
    priceTier: ['luxury'],
    aestheticTags: ['sustainable', 'tailored', 'avant-garde'],
    seasonFit: ['transitional', 'FW', 'all-year'], vegan: true,
    certifications: ['OEKO-TEX'],
    supplier: {
      origin: 'Japan (Tsuruoka, Yamagata) + Thailand (Rayong, commercial plant since 2022) + USA (with ADM, in development)',
      tier: 'mill',
      verificationUrl: 'https://spiber.inc/en/',
      secondaryUrl: 'https://www.prnewswire.com/news-releases/spiber-to-showcase-over-100-new-fabrics-including-wide-range-of-suiting-fabrics-and-high-brewed-protein-fiber-blends-at-milano-unica-debut-302366021.html',
    },
    notes: 'Sole producer of Brewed Protein™ fiber. First commercial plant Thailand 2022, ~500 tonnes/year. 45+ brand partners including The North Face, Goldwin, Issey Miyake, Margaret Howell, sacai, Woolrich, Burberry. Showcased 100+ fabrics at Milano Unica 2025. ADM partnership for second commercial plant in USA in development.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATE — Rama 2 complete (15 fibers)
// ═══════════════════════════════════════════════════════════════════════

export const rama2: Material[] = [
  ...viscose,
  ...liva,
  ...modal,
  ...lyocell,
  ...cupro,
  ...acetate,
  ...triacetate,
  ...naia,
  ...refibra,
  ...ecovero,
  ...seacell,
  ...crabyon,
  ...orangeFiber,
  ...qmilk,
  ...soybeanSpf,
  ...brewedProtein,
];
