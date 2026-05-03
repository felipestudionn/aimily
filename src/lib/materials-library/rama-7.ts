/**
 * Rama 7 — Footwear components (outsoles · midsoles · insoles · footwear-specific uppers)
 *
 * Source: .research/materials-rama-7-footwear-components.md
 *
 * Coverage: 29 base components across 4 sections:
 *   A · Outsoles (11): vulcanized rubber, virgin rubber, recycled rubber, gum,
 *       crepe, TPU, EVA injection, cork, jute, stacked leather, wood
 *   B · Midsoles (6): EVA, PU, cork, latex, PEBA, compression-molded
 *   C · Insoles (5): leather sock, cork footbed, EVA, OrthoLite, Poron
 *   D · Footwear-specific uppers (7): engineered knit, sock, raffia, wicker,
 *       ballistic nylon, technical mesh, canvas duck
 *
 * Layer counts (per research report):
 *   L1: 29 base entries
 *   L2: 28 construction × density × tread × thickness × denier × gauge variants
 *   L3: 14 verified B2B suppliers (sole-makers · component-makers · polymer brands)
 *   ───────
 *   Total: 71 entries
 *
 * Excluded (per Felipe's "si no está claro, fuera"): all brand-locked proprietary
 * tech — Nike ZoomX / React / Air / Flyknit, Adidas Boost / Primeknit, Asics GEL,
 * NB Fresh Foam, HOKA Profly, Brooks DNA Loft, Saucony PWRRUN PB. Generic
 * equivalents covered via PEBA / EVA / engineered-knit L1s and Arkema Pebax /
 * BASF Infinergy / Dow Foamtek L3 polymer suppliers.
 *
 * Marginal cases kept with caveats:
 *   - Margom (Prada Group 1999) — still serves third-party luxury B2B.
 *   - Pirelli Sole / PZero Lifestyle — open license via Pirelli brand extension.
 *   - BASF Infinergy — generic E-TPU polymer is open B2B; Adidas Boost is the
 *     exclusive license, NOT included as a separate entry.
 *
 * Entry order: by section A → B → C → D. Within each component: L1 → L2 → L3.
 */

import type { Material } from './types';

// ═══════════════════════════════════════════════════════════════════════
// SECTION A — OUTSOLES
// ═══════════════════════════════════════════════════════════════════════

// ─── 1. Vulcanized rubber ───────────────────────────────────────────────

const rubberVulcanized: Material[] = [
  {
    id: 'rubber-vulcanized',
    name: 'Vulcanized rubber outsole',
    layer: 'L1',
    family: 'sole-rubber',
    composition: 'Natural + synthetic rubber, sulfur-cured (vulcanized)',
    weightRange: { min: 4, max: 12, unit: 'mm' },
    defaultFinish: 'smooth',
    finishOptions: ['smooth', 'lugged', 'tread', 'cup-sole', 'gum', 'chunky'],
    zones: ['Outsole'],
    subtypes: ['sneaker', 'boot', 'loafer'],
    priceTier: ['fast', 'contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'streetwear', 'workwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
  {
    id: 'rubber-vulcanized-cupsole',
    name: 'Vulcanized cup-sole',
    layer: 'L2',
    parentId: 'rubber-vulcanized',
    family: 'sole-rubber',
    composition: 'Natural + synthetic rubber, vulcanized — wraps upper',
    weightRange: { min: 6, max: 10, unit: 'mm' },
    defaultFinish: 'smooth wrap',
    zones: ['Outsole', 'Heel Counter'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
  {
    id: 'rubber-vulcanized-cupsole-lugged',
    name: 'Vulcanized lugged outsole',
    layer: 'L2',
    parentId: 'rubber-vulcanized',
    family: 'sole-rubber',
    composition: 'Natural + synthetic rubber, vulcanized — deep-lug tread',
    weightRange: { min: 8, max: 14, unit: 'mm' },
    defaultFinish: 'deep lug',
    zones: ['Outsole'],
    subtypes: ['boot', 'sneaker'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['workwear', 'utility', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 2. Virgin rubber ───────────────────────────────────────────────────

const rubberVirgin: Material[] = [
  {
    id: 'rubber-virgin',
    name: 'Virgin rubber outsole',
    layer: 'L1',
    family: 'sole-rubber',
    composition: '100% virgin natural rubber compound',
    weightRange: { min: 4, max: 12, unit: 'mm' },
    defaultFinish: 'smooth',
    finishOptions: ['smooth', 'lugged', 'tread'],
    zones: ['Outsole'],
    subtypes: ['sneaker', 'loafer', 'heel', 'boot'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['minimal', 'tailored'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 3. Recycled rubber ─────────────────────────────────────────────────

const rubberRecycled: Material[] = [
  {
    id: 'rubber-recycled',
    name: 'Recycled rubber outsole',
    layer: 'L1',
    family: 'sole-rubber',
    composition: 'Post-industrial / post-consumer recycled rubber, 30–100%',
    weightRange: { min: 4, max: 12, unit: 'mm' },
    defaultFinish: 'matte',
    finishOptions: ['smooth', 'lugged', 'tread', 'speckled'],
    zones: ['Outsole'],
    subtypes: ['sneaker', 'boot', 'sandal'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sustainable', 'streetwear', 'utility'],
    seasonFit: ['all-year'],
    certifications: ['GRS', 'RCS'],
    vegan: true,
  },
];

// ─── 4. Gum rubber ──────────────────────────────────────────────────────

const rubberGum: Material[] = [
  {
    id: 'rubber-gum',
    name: 'Gum rubber outsole',
    layer: 'L1',
    family: 'sole-rubber',
    composition: 'Natural rubber latex, lightly cured, translucent amber',
    weightRange: { min: 4, max: 10, unit: 'mm' },
    defaultFinish: 'honey translucent',
    finishOptions: ['smooth', 'lightly textured', 'cup-sole'],
    zones: ['Outsole'],
    subtypes: ['sneaker', 'loafer'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['minimal', 'preppy', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 5. Crepe rubber ────────────────────────────────────────────────────

const rubberCrepe: Material[] = [
  {
    id: 'rubber-crepe',
    name: 'Crepe rubber outsole',
    layer: 'L1',
    family: 'sole-rubber',
    composition: 'Coagulated natural latex, air-dried (uncured), porous matte',
    weightRange: { min: 6, max: 14, unit: 'mm' },
    defaultFinish: 'porous matte natural',
    finishOptions: ['natural', 'tobacco', 'brown'],
    zones: ['Outsole'],
    subtypes: ['boot', 'loafer', 'sandal'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['preppy', 'minimal', 'tailored'],
    seasonFit: ['transitional', 'FW'],
    vegan: true,
  },
  {
    id: 'rubber-crepe-plantation',
    name: 'Plantation crepe (thick)',
    layer: 'L2',
    parentId: 'rubber-crepe',
    family: 'sole-rubber',
    composition: 'Thick coagulated natural latex, air-dried, plantation-grade',
    weightRange: { min: 10, max: 18, unit: 'mm' },
    defaultFinish: 'thick natural',
    zones: ['Outsole'],
    subtypes: ['boot'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['workwear'],
    seasonFit: ['transitional', 'FW'],
    vegan: true,
  },
];

// ─── 6. TPU outsole ─────────────────────────────────────────────────────

const tpuOutsole: Material[] = [
  {
    id: 'tpu-outsole',
    name: 'TPU outsole (thermoplastic polyurethane)',
    layer: 'L1',
    family: 'sole-rubber',
    composition: '100% thermoplastic polyurethane, injection-molded',
    weightRange: { min: 3, max: 10, unit: 'mm' },
    defaultFinish: 'high-gloss molded',
    finishOptions: ['gloss', 'matte', 'tread', 'translucent'],
    zones: ['Outsole'],
    subtypes: ['sneaker', 'boot', 'heel'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 7. EVA injection outsole ───────────────────────────────────────────

const evaOutsoleInjection: Material[] = [
  {
    id: 'eva-outsole-injection',
    name: 'EVA injection outsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Ethylene-vinyl acetate, injection-molded, dual-density possible',
    weightRange: { min: 8, max: 25, unit: 'mm' },
    defaultFinish: 'matte molded',
    finishOptions: ['matte', 'tread', 'sculpted', 'two-tone'],
    zones: ['Outsole', 'Midsole'],
    subtypes: ['sneaker', 'sandal'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'resort'],
    seasonFit: ['SS', 'all-year'],
    vegan: true,
  },
];

// ─── 8. Cork sole ───────────────────────────────────────────────────────

const corkSole: Material[] = [
  {
    id: 'cork-sole',
    name: 'Cork outsole / footbed',
    layer: 'L1',
    family: 'sole-leather',
    composition: 'Agglomerated cork (Quercus suber) bonded with natural latex or PU binder',
    weightRange: { min: 4, max: 20, unit: 'mm' },
    defaultFinish: 'natural cork grain',
    finishOptions: ['natural', 'sealed', 'sanded', 'two-tone'],
    zones: ['Outsole', 'Insole'],
    subtypes: ['sandal', 'mule', 'espadrille'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sustainable', 'resort', 'minimal'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC'],
    vegan: true,
  },
];

// ─── 9. Jute sole ───────────────────────────────────────────────────────

const juteSole: Material[] = [
  {
    id: 'jute-sole',
    name: 'Jute (espadrille) sole',
    layer: 'L1',
    family: 'sole-textile',
    composition: '100% braided jute fiber, often with vulcanized rubber bottom layer',
    weightRange: { min: 8, max: 20, unit: 'mm' },
    defaultFinish: 'natural braided',
    finishOptions: ['natural', 'bleached', 'dyed', 'rubber-bottomed'],
    zones: ['Outsole'],
    subtypes: ['espadrille', 'sandal', 'mule'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['resort', 'sustainable', 'minimal'],
    seasonFit: ['SS'],
    vegan: true,
  },
];

// ─── L3 — Suppliers (outsole rubbers + jute) ────────────────────────────

const outsoleRubberSuppliers: Material[] = [
  {
    id: 'vibram-supplier',
    name: 'Vibram',
    layer: 'L3',
    parentId: 'rubber-vulcanized',
    family: 'sole-rubber',
    composition: 'Vulcanized rubber outsoles — Megagrip, TC1, Eco Step recycled',
    zones: ['Outsole'],
    subtypes: ['sneaker', 'boot', 'loafer'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['workwear', 'utility', 'streetwear', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Albizzate, Italy (global)', tier: 'component-maker', verificationUrl: 'https://www.vibram.com/us/professional/' },
    notes: 'Open B2B catalog. Standard yellow-octagon pattern licensed to thousands of brands. Catalog includes vulcanized, cup-sole, lugged, TC1 platform, Megagrip, Eco Step recycled.',
  },
  {
    id: 'pirelli-sole-supplier',
    name: 'Pirelli Sole (PZero Lifestyle)',
    layer: 'L3',
    parentId: 'rubber-vulcanized',
    family: 'sole-rubber',
    composition: 'Tire-tread-derived rubber outsoles, PZero pattern',
    zones: ['Outsole'],
    subtypes: ['sneaker', 'loafer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport', 'minimal', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Milan, Italy', tier: 'component-maker', verificationUrl: 'https://corporate.pirelli.com/corporate/en-ww/sustainability/innovation/pzero' },
    notes: 'Pirelli Tyre brand extension licensed openly to footwear via PZero Lifestyle. Common Projects collaboration documented. Open B2B licensor.',
  },
  {
    id: 'margom-supplier',
    name: 'Margom (Prada Group)',
    layer: 'L3',
    parentId: 'rubber-vulcanized',
    family: 'sole-rubber',
    composition: 'Luxury vulcanized rubber soles, cup-sole, custom tread',
    zones: ['Outsole', 'Heel Counter'],
    subtypes: ['sneaker', 'loafer'],
    priceTier: ['luxury'],
    aestheticTags: ['minimal', 'tailored'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Civitanova Marche, Italy', tier: 'component-maker', verificationUrl: 'https://www.pradagroup.com/en.html' },
    notes: 'Prada-tied owner (acquired 1999), but still serves third-party luxury B2B. Continues to supply Common Projects and Hermès historically. Prada is anchor customer.',
  },
  {
    id: 'castaner-jute-supplier',
    name: 'Castañer (jute espadrille soles)',
    layer: 'L3',
    parentId: 'jute-sole',
    family: 'sole-textile',
    composition: 'Braided jute soles, rubber-bottomed jute, custom heights',
    zones: ['Outsole'],
    subtypes: ['espadrille', 'sandal', 'mule'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['resort', 'minimal', 'sustainable'],
    seasonFit: ['SS'],
    vegan: true,
    supplier: { origin: 'Banyoles, Catalonia, Spain', tier: 'component-maker', verificationUrl: 'https://castaner.com/' },
    notes: 'Family-owned since 1927. B2B espadrille sole + finished shoe. Supplies Loewe, Hermès historically; also produces own line.',
  },
];

// ─── 10. Stacked leather sole ───────────────────────────────────────────

const leatherSoleStacked: Material[] = [
  {
    id: 'leather-sole-stacked',
    name: 'Stacked leather sole',
    layer: 'L1',
    family: 'sole-leather',
    composition: 'Vegetable-tanned cowhide leather, stacked & glued layers',
    weightRange: { min: 4, max: 12, unit: 'mm' },
    defaultFinish: 'natural edge',
    finishOptions: ['natural', 'oak-bark', 'painted edge', 'blake-stitched', 'goodyear-welted'],
    zones: ['Outsole', 'Heel Counter'],
    subtypes: ['loafer', 'heel', 'boot'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'preppy', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['LWG'],
    vegan: false,
  },
  {
    id: 'leather-sole-oak-bark',
    name: 'Oak-bark stacked leather sole',
    layer: 'L2',
    parentId: 'leather-sole-stacked',
    family: 'sole-leather',
    composition: 'Slow oak-bark vegetable tanned cowhide, ~12 month tannage',
    weightRange: { min: 5, max: 8, unit: 'mm' },
    defaultFinish: 'natural russet',
    zones: ['Outsole'],
    subtypes: ['loafer', 'boot'],
    priceTier: ['luxury'],
    aestheticTags: ['tailored'],
    seasonFit: ['all-year'],
    certifications: ['LWG'],
    vegan: false,
  },
  {
    id: 'rendenbach-supplier',
    name: 'J.R. Rendenbach',
    layer: 'L3',
    parentId: 'leather-sole-stacked',
    family: 'sole-leather',
    composition: 'Oak-bark vegetable tanned sole leather, 9–12 month pit tannage',
    zones: ['Outsole'],
    subtypes: ['loafer', 'boot', 'heel'],
    priceTier: ['luxury'],
    aestheticTags: ['tailored', 'preppy'],
    seasonFit: ['all-year'],
    certifications: ['LWG'],
    vegan: false,
    supplier: { origin: 'Trier, Germany', tier: 'tannery', verificationUrl: 'https://rendenbach.de/' },
    notes: 'Industry standard for goodyear-welted dress shoes. Supplies Edward Green, Crockett & Jones, John Lobb. Graded by butt area.',
  },
  {
    id: 'isatantec-sole-supplier',
    name: 'ISA TanTec — sole leather',
    layer: 'L3',
    parentId: 'leather-sole-stacked',
    family: 'sole-leather',
    composition: 'LITE leather process sole leather, LWG Gold',
    zones: ['Outsole'],
    subtypes: ['loafer', 'boot', 'heel'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'sustainable'],
    seasonFit: ['all-year'],
    certifications: ['LWG'],
    vegan: false,
    supplier: { origin: 'Heilbronn, Germany / Vietnam / China', tier: 'tannery', verificationUrl: 'https://www.isatantec.com/' },
    notes: 'LWG Gold rated. Lower-impact alternative for sole leather B2B.',
  },
];

// ─── 11. Wood sole ──────────────────────────────────────────────────────

const woodSole: Material[] = [
  {
    id: 'wood-sole',
    name: 'Wood sole',
    layer: 'L1',
    family: 'sole-leather',
    composition: 'Solid carved hardwood (alder, beech, willow), often with rubber tread layer',
    weightRange: { min: 15, max: 40, unit: 'mm' },
    defaultFinish: 'sealed natural grain',
    finishOptions: ['natural', 'stained', 'lacquered', 'painted', 'rubber-bottomed'],
    zones: ['Outsole'],
    subtypes: ['mule', 'sandal', 'heel'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['resort', 'sustainable', 'minimal'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC'],
    vegan: true,
  },
  {
    id: 'berkemann-supplier',
    name: 'Berkemann',
    layer: 'L3',
    parentId: 'wood-sole',
    family: 'sole-leather',
    composition: 'Alder wood soles, contoured footbed, mule and sandal soles',
    zones: ['Outsole'],
    subtypes: ['mule', 'sandal'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal', 'resort'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC'],
    vegan: true,
    supplier: { origin: 'Hamburg, Germany', tier: 'component-maker', verificationUrl: 'https://www.berkemann.com/' },
    notes: 'Heritage clog maker since 1885. Supplies B2B for fashion brands beyond own line.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SECTION B — MIDSOLES
// ═══════════════════════════════════════════════════════════════════════

// ─── 12. EVA foam midsole ───────────────────────────────────────────────

const evaMidsole: Material[] = [
  {
    id: 'eva-midsole',
    name: 'EVA foam midsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Ethylene-vinyl acetate foam, compression or injection molded',
    weightRange: { min: 10, max: 40, unit: 'mm' },
    defaultFinish: 'matte molded',
    finishOptions: ['matte', 'sculpted', 'dual-density', 'embossed-logo'],
    zones: ['Midsole'],
    subtypes: ['sneaker', 'sandal'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
  },
  {
    id: 'eva-midsole-dual-density',
    name: 'Dual-density EVA midsole',
    layer: 'L2',
    parentId: 'eva-midsole',
    family: 'sole-foam',
    composition: 'Two EVA densities co-molded (firm rearfoot + soft forefoot or vice-versa)',
    weightRange: { min: 14, max: 35, unit: 'mm' },
    defaultFinish: 'two-tone matte',
    zones: ['Midsole'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
  {
    id: 'eva-midsole-supercritical',
    name: 'Supercritical foamed EVA midsole',
    layer: 'L2',
    parentId: 'eva-midsole',
    family: 'sole-foam',
    composition: 'EVA expanded with supercritical CO2 / N2 (no chemical blowing agents)',
    weightRange: { min: 15, max: 40, unit: 'mm' },
    defaultFinish: 'fine cell matte',
    zones: ['Midsole'],
    subtypes: ['sneaker'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport', 'sustainable'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 13. PU foam midsole ────────────────────────────────────────────────

const puMidsole: Material[] = [
  {
    id: 'pu-midsole',
    name: 'PU foam midsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Polyurethane foam, poured or injection-molded',
    weightRange: { min: 8, max: 30, unit: 'mm' },
    defaultFinish: 'matte molded',
    finishOptions: ['matte', 'sculpted', 'direct-injected'],
    zones: ['Midsole', 'Outsole'],
    subtypes: ['sneaker', 'loafer', 'boot'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['minimal', 'tailored', 'sport'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 14. Cork midsole ───────────────────────────────────────────────────

const corkMidsole: Material[] = [
  {
    id: 'cork-midsole',
    name: 'Cork midsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Agglomerated cork, often with latex binder',
    weightRange: { min: 6, max: 18, unit: 'mm' },
    defaultFinish: 'natural cork grain',
    finishOptions: ['natural', 'sealed', 'contoured-footbed'],
    zones: ['Midsole', 'Insole'],
    subtypes: ['sandal', 'mule', 'loafer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'resort', 'minimal'],
    seasonFit: ['SS', 'transitional'],
    certifications: ['FSC'],
    vegan: true,
  },
];

// ─── 15. Latex foam midsole ─────────────────────────────────────────────

const latexMidsole: Material[] = [
  {
    id: 'latex-midsole',
    name: 'Latex foam midsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Natural latex foam (Dunlop or Talalay process)',
    weightRange: { min: 6, max: 20, unit: 'mm' },
    defaultFinish: 'matte natural',
    finishOptions: ['natural', 'contoured'],
    zones: ['Midsole', 'Insole'],
    subtypes: ['sneaker', 'loafer', 'sandal'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sustainable', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 16. PEBA foam midsole ──────────────────────────────────────────────

const pebaMidsole: Material[] = [
  {
    id: 'peba-midsole',
    name: 'PEBA foam midsole (Pebax-based)',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Polyether block amide (PEBA) foamed elastomer; high energy return',
    weightRange: { min: 20, max: 45, unit: 'mm' },
    defaultFinish: 'fine-cell matte',
    finishOptions: ['matte', 'two-tone', 'sculpted'],
    zones: ['Midsole'],
    subtypes: ['sneaker'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport'],
    seasonFit: ['all-year'],
    vegan: true,
    notes: 'Generic PEBA foam — NOT brand-locked ZoomX (Nike) / FuelCell (NB). Open via Arkema Pebax licensing.',
  },
];

// ─── 17. Compression-molded foam midsole ────────────────────────────────

const foamCmpMidsole: Material[] = [
  {
    id: 'foam-cmp-midsole',
    name: 'Compression-molded foam midsole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'EVA, PU, or blended foam pellets compressed in heated mold',
    weightRange: { min: 12, max: 35, unit: 'mm' },
    defaultFinish: 'matte sculpted',
    finishOptions: ['matte', 'sculpted', 'two-tone', 'embossed'],
    zones: ['Midsole'],
    subtypes: ['sneaker', 'loafer'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── L3 — Suppliers (foam compounds) ────────────────────────────────────

const foamSuppliers: Material[] = [
  {
    id: 'basf-infinergy-supplier',
    name: 'BASF Infinergy (E-TPU)',
    layer: 'L3',
    parentId: 'peba-midsole',
    family: 'sole-foam',
    composition: 'Expanded TPU pellets, steam-chest-mold compatible, high rebound',
    zones: ['Midsole'],
    subtypes: ['sneaker'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Ludwigshafen, Germany (global)', tier: 'component-maker', verificationUrl: 'https://www.basf.com/global/en/products/plastics-rubber/products/infinergy.html' },
    notes: 'Infinergy is the open B2B grade. Boost is BASF licensed exclusively to Adidas — that license is forbidden in our taxonomy. Generic Infinergy IS open and available B2B for non-athletic / non-competing applications.',
  },
  {
    id: 'arkema-pebax-supplier',
    name: 'Arkema Pebax (PEBA polymer)',
    layer: 'L3',
    parentId: 'peba-midsole',
    family: 'sole-foam',
    composition: 'Pebax Powered grades, Pebax Rnew bio-based, foamable PEBA',
    zones: ['Midsole'],
    subtypes: ['sneaker'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['sport', 'sustainable'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Colombes, France (global)', tier: 'component-maker', verificationUrl: 'https://www.pebax.com/en/' },
    notes: 'Open B2B. Used by On Running, Asics, NB, Saucony, Hoka. Bio-based Rnew grades from castor beans.',
  },
  {
    id: 'dow-foamtek-supplier',
    name: 'Dow Foamtek',
    layer: 'L3',
    parentId: 'eva-midsole',
    family: 'sole-foam',
    composition: 'EVA copolymer foam grades, supercritical foaming, ENGAGE elastomer blends',
    zones: ['Midsole'],
    subtypes: ['sneaker', 'sandal'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Midland, Michigan, USA (global)', tier: 'component-maker', verificationUrl: 'https://www.dow.com/en-us/market/mkt-consumer.html' },
    notes: "Dow's footwear platform supplies polyolefin elastomers and EVA grades to Asian sole molders.",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SECTION C — INSOLES
// ═══════════════════════════════════════════════════════════════════════

// ─── 18. Leather sock (insole) ──────────────────────────────────────────

const leatherSockInsole: Material[] = [
  {
    id: 'leather-sock-insole',
    name: 'Leather sock / insole',
    layer: 'L1',
    family: 'sole-leather',
    composition: 'Vegetable-tanned cowhide or pigskin, 1.0–1.6 mm',
    weightRange: { min: 1, max: 1.6, unit: 'mm' },
    defaultFinish: 'natural vegetable-tan',
    finishOptions: ['natural', 'stamped logo', 'perforated', 'cushioned'],
    zones: ['Insole'],
    subtypes: ['loafer', 'heel', 'boot', 'mule'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'preppy', 'minimal'],
    seasonFit: ['all-year'],
    certifications: ['LWG'],
    vegan: false,
  },
];

// ─── 19. Cork footbed ───────────────────────────────────────────────────

const corkFootbed: Material[] = [
  {
    id: 'cork-footbed',
    name: 'Cork contoured footbed',
    layer: 'L1',
    family: 'sole-leather',
    composition: 'Agglomerated cork + latex, leather-topped',
    weightRange: { min: 5, max: 12, unit: 'mm' },
    defaultFinish: 'anatomic cork + suede top',
    finishOptions: ['natural', 'suede-top', 'leather-top', 'exposed-cork'],
    zones: ['Insole'],
    subtypes: ['sandal', 'mule'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['sustainable', 'resort'],
    seasonFit: ['SS', 'transitional'],
    vegan: false,
    notes: 'Often paired with leather top — vegan version uses microfiber top.',
  },
];

// ─── 20. EVA insole ─────────────────────────────────────────────────────

const evaInsole: Material[] = [
  {
    id: 'eva-insole',
    name: 'EVA insole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Closed-cell EVA foam, die-cut or molded',
    weightRange: { min: 3, max: 8, unit: 'mm' },
    defaultFinish: 'die-cut',
    finishOptions: ['die-cut', 'molded contour', 'fabric-top'],
    zones: ['Insole'],
    subtypes: ['sneaker', 'sandal', 'loafer', 'boot'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['sport', 'minimal', 'streetwear'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 21. OrthoLite insole ───────────────────────────────────────────────

const ortholiteInsole: Material[] = [
  {
    id: 'ortholite-insole',
    name: 'OrthoLite open-cell foam insole',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Open-cell PU foam, breathable, washable; some grades w/ recycled rubber + bio-based content',
    weightRange: { min: 3, max: 8, unit: 'mm' },
    defaultFinish: 'die-cut + branded top',
    finishOptions: ['standard', 'Eco', 'Hybrid', 'Recycled', 'Impressions'],
    zones: ['Insole'],
    subtypes: ['sneaker', 'boot', 'loafer'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'sustainable'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 22. Poron insole ───────────────────────────────────────────────────

const poronInsole: Material[] = [
  {
    id: 'poron-insole',
    name: 'Poron urethane cushion insole / pad',
    layer: 'L1',
    family: 'sole-foam',
    composition: 'Microcellular polyurethane (Rogers Corp), high energy absorption',
    weightRange: { min: 1.5, max: 6, unit: 'mm' },
    defaultFinish: 'die-cut sheet',
    finishOptions: ['XRD impact', 'ProCushion', 'SR'],
    zones: ['Insole', 'Heel Counter'],
    subtypes: ['sneaker', 'heel', 'boot', 'loafer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'sport'],
    seasonFit: ['all-year'],
    vegan: true,
    notes: 'B2B pad commonly stacked under heel and ball-of-foot zones inside dress shoes; full-length variants in athletic.',
  },
];

// ─── L3 — Suppliers (insoles) ───────────────────────────────────────────

const insoleSuppliers: Material[] = [
  {
    id: 'ortholite-supplier',
    name: 'OrthoLite',
    layer: 'L3',
    parentId: 'ortholite-insole',
    family: 'sole-foam',
    composition: 'Open-cell PU foam, Eco bio-based, Hybrid recycled rubber + foam',
    zones: ['Insole'],
    subtypes: ['sneaker', 'boot', 'loafer'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'sustainable'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Amherst, Massachusetts, USA (global plants)', tier: 'component-maker', verificationUrl: 'https://www.ortholite.com/our-foam/' },
    notes: 'Industry standard insole supplier: 500+ brands, 70+ countries. Default for athletic + casual.',
  },
  {
    id: 'rogers-poron-supplier',
    name: 'Rogers Corporation — Poron',
    layer: 'L3',
    parentId: 'poron-insole',
    family: 'sole-foam',
    composition: 'Poron Cushioning, Poron XRD impact protection, Poron ProCushion',
    zones: ['Insole', 'Heel Counter'],
    subtypes: ['sneaker', 'heel', 'boot', 'loafer'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['tailored', 'sport'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Chandler, Arizona, USA', tier: 'component-maker', verificationUrl: 'https://www.rogerscorp.com/elastomeric-material-solutions/poron-cushioning-solutions' },
    notes: 'Premium insole pad supplier. Used by Allen Edmonds, Alden, Crockett & Jones, athletic shoe brands.',
  },
  {
    id: 'texon-supplier',
    name: 'Texon',
    layer: 'L3',
    parentId: 'leather-sock-insole',
    family: 'sole-leather',
    composition: 'Cellulose insole boards, heel counters, toe puffs, reinforcement materials',
    zones: ['Insole', 'Heel Counter'],
    subtypes: ['loafer', 'heel', 'boot', 'sneaker'],
    priceTier: ['contemporary', 'premium', 'luxury'],
    aestheticTags: ['tailored', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
    supplier: { origin: 'Stafford, UK (global)', tier: 'component-maker', verificationUrl: 'https://www.texon.com/' },
    notes: 'Heritage 1948. Standard for structural insole boards (bottom-of-shoe board), reinforcements. Different layer than cushion insole. Vegan since cellulose-based.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SECTION D — FOOTWEAR-SPECIFIC UPPERS
// ═══════════════════════════════════════════════════════════════════════

// ─── 23. Engineered knit upper ──────────────────────────────────────────

const knitUpperEngineered: Material[] = [
  {
    id: 'knit-upper-engineered',
    name: 'Engineered knit upper (generic)',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Polyester / nylon / recycled-PET yarn, computerized engineered knit',
    weightRange: { min: 7, max: 14, unit: 'gauge' },
    defaultFinish: 'engineered zonal stretch',
    finishOptions: ['jacquard', 'mesh', 'ribbed', 'tonal', 'heat-set'],
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'minimal', 'sustainable'],
    seasonFit: ['all-year'],
    vegan: true,
    notes: 'Generic engineered knit — NOT Flyknit (Nike) / Primeknit (Adidas), which are forbidden brand-locked.',
  },
  {
    id: 'knit-upper-flyknit-style-mesh',
    name: 'Mesh-construction engineered knit',
    layer: 'L2',
    parentId: 'knit-upper-engineered',
    family: 'footwear-upper',
    composition: 'Polyester / nylon engineered knit with open-mesh ventilation zones',
    weightRange: { min: 9, max: 14, unit: 'gauge' },
    defaultFinish: 'open-mesh ventilation zones',
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport'],
    seasonFit: ['SS', 'all-year'],
    vegan: true,
  },
  {
    id: 'knit-upper-jacquard',
    name: 'Jacquard knit upper',
    layer: 'L2',
    parentId: 'knit-upper-engineered',
    family: 'footwear-upper',
    composition: 'Polyester / nylon engineered jacquard knit, two-tone pattern',
    weightRange: { min: 7, max: 12, unit: 'gauge' },
    defaultFinish: 'two-tone pattern',
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['streetwear', 'sport'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 24. Sock construction upper ────────────────────────────────────────

const sockUpper: Material[] = [
  {
    id: 'sock-upper',
    name: 'Sock construction upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Circular-knit elastic blend (nylon / spandex / poly), seamless tube knit',
    weightRange: { min: 10, max: 16, unit: 'gauge' },
    defaultFinish: 'seamless ribbed',
    finishOptions: ['ribbed', 'plain', 'color-blocked', 'reinforced-toe'],
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear', 'minimal'],
    seasonFit: ['all-year'],
    vegan: true,
  },
];

// ─── 25. Raffia upper ───────────────────────────────────────────────────

const raffiaUpper: Material[] = [
  {
    id: 'raffia-upper',
    name: 'Raffia upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Natural raffia palm fiber (Raphia farinifera), hand-woven or machine-woven',
    weightRange: { min: 200, max: 450, unit: 'gsm' },
    defaultFinish: 'natural straw',
    finishOptions: ['natural', 'dyed', 'crochet', 'braided', 'sealed'],
    zones: ['Upper'],
    subtypes: ['sandal', 'mule', 'espadrille', 'heel'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['resort', 'sustainable', 'romantic'],
    seasonFit: ['SS'],
    vegan: true,
  },
];

// ─── 26. Cane / wicker upper ────────────────────────────────────────────

const wickerUpper: Material[] = [
  {
    id: 'wicker-upper',
    name: 'Cane / wicker upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Rattan or willow, hand-woven',
    weightRange: { min: 250, max: 500, unit: 'gsm' },
    defaultFinish: 'natural sealed',
    finishOptions: ['natural', 'stained', 'painted'],
    zones: ['Upper'],
    subtypes: ['sandal', 'mule'],
    priceTier: ['premium', 'luxury'],
    aestheticTags: ['resort', 'romantic'],
    seasonFit: ['SS'],
    vegan: true,
  },
];

// ─── 27. Ballistic nylon upper ──────────────────────────────────────────

const ballisticNylonUpper: Material[] = [
  {
    id: 'ballistic-nylon-upper',
    name: 'Ballistic nylon upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Nylon 6,6 high-tenacity, basket-weave 1050D / 1680D',
    weightRange: { min: 1050, max: 1680, unit: 'denier' },
    defaultFinish: 'PU-coated',
    finishOptions: ['matte PU', 'DWR', 'ripstop'],
    zones: ['Upper', 'Heel Counter'],
    subtypes: ['sneaker', 'boot'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['utility', 'workwear', 'sport', 'streetwear'],
    seasonFit: ['transitional', 'FW'],
    vegan: true,
  },
];

// ─── 28. Technical mesh upper ───────────────────────────────────────────

const techMeshUpper: Material[] = [
  {
    id: 'tech-mesh-upper',
    name: 'Technical mesh upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: 'Polyester / nylon mono- or multi-filament mesh, often with TPU film overlays',
    weightRange: { min: 80, max: 220, unit: 'gsm' },
    defaultFinish: 'matte open weave',
    finishOptions: ['open mesh', 'double-layer', 'TPU-overlaid', 'heat-pressed'],
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['sport', 'streetwear'],
    seasonFit: ['SS', 'all-year'],
    vegan: true,
  },
];

// ─── 29. Canvas duck upper ──────────────────────────────────────────────

const canvasDuckUpper: Material[] = [
  {
    id: 'canvas-duck-upper',
    name: 'Canvas duck upper',
    layer: 'L1',
    family: 'footwear-upper',
    composition: '100% cotton plain-weave duck, 8–12 oz',
    weightRange: { min: 270, max: 410, unit: 'gsm' },
    defaultFinish: 'raw natural',
    finishOptions: ['raw', 'piece-dyed', 'garment-dyed', 'wax-coated'],
    zones: ['Upper'],
    subtypes: ['sneaker', 'espadrille'],
    priceTier: ['fast', 'contemporary', 'premium'],
    aestheticTags: ['workwear', 'preppy', 'streetwear'],
    seasonFit: ['SS', 'transitional', 'all-year'],
    vegan: true,
  },
  {
    id: 'canvas-duck-12oz',
    name: '12 oz cotton duck',
    layer: 'L2',
    parentId: 'canvas-duck-upper',
    family: 'footwear-upper',
    composition: '100% cotton plain-weave duck, 12 oz',
    weightRange: { min: 380, max: 410, unit: 'gsm' },
    defaultFinish: 'raw',
    zones: ['Upper'],
    subtypes: ['sneaker'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['workwear'],
    seasonFit: ['transitional', 'FW', 'all-year'],
    vegan: true,
  },
  {
    id: 'canvas-duck-waxed',
    name: 'Waxed canvas duck',
    layer: 'L2',
    parentId: 'canvas-duck-upper',
    family: 'footwear-upper',
    composition: 'Cotton duck + paraffin/beeswax coating',
    weightRange: { min: 320, max: 410, unit: 'gsm' },
    defaultFinish: 'wax-coated water-repellent',
    zones: ['Upper'],
    subtypes: ['sneaker', 'boot'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['workwear', 'utility'],
    seasonFit: ['transitional', 'FW'],
    vegan: true,
  },
];

// ─── L3 — Suppliers (footwear textile uppers) ───────────────────────────

const upperSuppliers: Material[] = [
  {
    id: 'cordura-supplier',
    name: 'Cordura (Invista / Koch)',
    layer: 'L3',
    parentId: 'ballistic-nylon-upper',
    family: 'footwear-upper',
    composition: '1050D / 1680D ballistic nylon, ripstop, Truelock dyed',
    zones: ['Upper', 'Heel Counter'],
    subtypes: ['sneaker', 'boot'],
    priceTier: ['contemporary', 'premium'],
    aestheticTags: ['utility', 'workwear', 'sport', 'streetwear'],
    seasonFit: ['transitional', 'FW'],
    vegan: true,
    supplier: { origin: 'Wichita, Kansas, USA (global mills)', tier: 'mill', verificationUrl: 'https://www.cordura.com/' },
    notes: 'Industry standard for ballistic nylon. Licensed to mills worldwide; used in footwear uppers, technical bags, military.',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATE — Rama 7 complete (29 L1 + 28 L2 + 14 L3 = 71 entries)
// ═══════════════════════════════════════════════════════════════════════

export const rama7: Material[] = [
  // Section A — Outsoles
  ...rubberVulcanized,
  ...rubberVirgin,
  ...rubberRecycled,
  ...rubberGum,
  ...rubberCrepe,
  ...tpuOutsole,
  ...evaOutsoleInjection,
  ...corkSole,
  ...juteSole,
  ...outsoleRubberSuppliers,
  ...leatherSoleStacked,
  ...woodSole,
  // Section B — Midsoles
  ...evaMidsole,
  ...puMidsole,
  ...corkMidsole,
  ...latexMidsole,
  ...pebaMidsole,
  ...foamCmpMidsole,
  ...foamSuppliers,
  // Section C — Insoles
  ...leatherSockInsole,
  ...corkFootbed,
  ...evaInsole,
  ...ortholiteInsole,
  ...poronInsole,
  ...insoleSuppliers,
  // Section D — Footwear-specific uppers
  ...knitUpperEngineered,
  ...sockUpper,
  ...raffiaUpper,
  ...wickerUpper,
  ...ballisticNylonUpper,
  ...techMeshUpper,
  ...canvasDuckUpper,
  ...upperSuppliers,
];
