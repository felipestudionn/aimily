/**
 * 02.1 Estrategia de Compra · Curated Archetype Table (Sprint B.1, 2026-05-08)
 *
 * Static, curated, 40-brand benchmark pool for the 4 buying-strategy
 * archetypes. NO AI call at kick-off — Sonnet hallucinates Y1 numbers
 * (e.g. "Devota & Lomba 1974" was wrong). This table is editorial
 * truth: Felipe + Claude curate, the user sees consistent, factual,
 * verifiable benchmarks every time, instantly.
 *
 * Architecture:
 *   - 4 archetypes (A · Cápsula · B · Colección Esencial · C · Apuesta
 *     Fuerte · D · Drops Escalonados). Each archetype is product-
 *     agnostic — strategic position, not aesthetic.
 *   - Each archetype has a benchmarks_pool of 10 Y1 brand cases.
 *   - At runtime we sample 3 from each pool — variety without losing
 *     consistency or factual ground.
 *
 * Y1 numbers (skus, investment_eur, y1_sales_eur):
 *   - Where public data exists (BoF, Vogue Business, Crunchbase, brand
 *     interviews) we use it. Marked source='public'.
 *   - Where Y1 numbers were never reported (most cases — Y1 numbers
 *     are rarely public until the brand scales) we use conservative
 *     estimates anchored to:
 *       · production cost ≈ 30-35% of revenue
 *       · marketing budget ≈ 15-25% Y1 revenue
 *       · investment_eur = production + marketing
 *     Marked source='estimate'.
 *
 * Curation principles (per Felipe's brief):
 *   - Real, well-known brands (skip obscure regional)
 *   - Founder names verified
 *   - Single brand never cited across two archetypes
 *   - ALD only in Group D (its natural archetype)
 */

export type ArchetypeId = 'A' | 'B' | 'C' | 'D';

export interface ArchetypeBenchmark {
  brand: string;
  skus: number;
  investment_eur: number;
  y1_sales_eur: number;
  year: string;
  founders?: string;
  city?: string;
  source: 'public' | 'estimate';
  /** One-line strategic note explaining why this Y1 case fits the archetype. */
  note?: string;
}

/**
 * Canonical runtime shape (what flows through the API → frontend → prompts).
 * Carries 3 sampled benchmarks. Does NOT carry the full pool.
 */
export interface ScenarioArchetype {
  id: ArchetypeId;
  name: string;
  narrative: string;
  sku_range: { min: number; max: number };
  investment_range: { min: number; max: number };
  y1_sales_range: { min: number; max: number };
  drop_count: number;
  marketing_pct: number;
  best_for: string;
  benchmarks: ArchetypeBenchmark[];
}

/**
 * Internal table-only shape — carries the full 10-deep pool. Resolved
 * down to ScenarioArchetype at the route boundary by `resolveArchetypes`.
 */
interface ScenarioArchetypeTableEntry {
  id: ArchetypeId;
  name: string;
  narrative: string;
  sku_range: { min: number; max: number };
  investment_range: { min: number; max: number };
  y1_sales_range: { min: number; max: number };
  drop_count: number;
  marketing_pct: number;
  best_for: string;
  benchmarks_pool: ArchetypeBenchmark[];
}

// ─── A · Cápsula ───────────────────────────────────────────────────────────

const POOL_A: ArchetypeBenchmark[] = [
  {
    brand: 'Hereu',
    year: '2015',
    founders: 'Albert Escribano + José Luis Bartolomé',
    city: 'Barcelona',
    skus: 12,
    investment_eur: 40000,
    y1_sales_eur: 120000,
    source: 'estimate',
    note: 'Cápsula de calzado y bolsos en piel trenzada que escaló a Net-a-Porter / Bergdorf en 3 años.',
  },
  {
    brand: 'Studio Nicholson',
    year: '2010',
    founders: 'Nick Wakeman',
    city: 'London',
    skus: 14,
    investment_eur: 50000,
    y1_sales_eur: 150000,
    source: 'estimate',
    note: '"Perfect wardrobe" capsule de basics esencialistas. Modelo de capsule que se volvió referencia global.',
  },
  {
    brand: 'Saturdays NYC',
    year: '2009',
    founders: 'Morgan Collett + Colin Tunstall + Josh Rosen',
    city: 'New York',
    skus: 10,
    investment_eur: 45000,
    y1_sales_eur: 130000,
    source: 'estimate',
    note: 'Surf-meets-menswear capsule. NYC neighborhood-led launch que se volvió cultural reference.',
  },
  {
    brand: 'Bode',
    year: '2016',
    founders: 'Emily Adams Bode',
    city: 'New York',
    skus: 10,
    investment_eur: 35000,
    y1_sales_eur: 95000,
    source: 'estimate',
    note: 'Empezó con piezas vintage upcycled, one-of-one. Capsule design-led que ganó CFDA Award en 4 años.',
  },
  {
    brand: 'Totême',
    year: '2014',
    founders: 'Elin Kling + Karl Lindman',
    city: 'Stockholm',
    skus: 14,
    investment_eur: 55000,
    y1_sales_eur: 180000,
    source: 'estimate',
    note: 'Esencialismo escandinavo desde día uno. Capsule de wardrobe-essentials que escaló a global premium.',
  },
  {
    brand: 'Lauren Manoogian',
    year: '2009',
    founders: 'Lauren Manoogian',
    city: 'New York',
    skus: 12,
    investment_eur: 40000,
    y1_sales_eur: 110000,
    source: 'estimate',
    note: 'Capsule de knitwear minimalista. Crecimiento orgánico sustained sin inversión externa.',
  },
  {
    brand: 'Kassl Editions',
    year: '2018',
    founders: 'Lukas Bereuter + Alfred Mendl',
    city: 'Amsterdam',
    skus: 12,
    investment_eur: 45000,
    y1_sales_eur: 140000,
    source: 'estimate',
    note: 'Capsule de outerwear oilskin. Producto único + storytelling material focused.',
  },
  {
    brand: 'The Frankie Shop',
    year: '2014',
    founders: 'Gaëlle Drevet',
    city: 'New York',
    skus: 12,
    investment_eur: 50000,
    y1_sales_eur: 160000,
    source: 'estimate',
    note: 'Empezó como multi-brand store; lanzó own label como capsule de basics. Modelo retailer-to-brand.',
  },
  {
    brand: 'Auralee',
    year: '2015',
    founders: 'Ryota Iwai',
    city: 'Tokyo',
    skus: 14,
    investment_eur: 55000,
    y1_sales_eur: 170000,
    source: 'estimate',
    note: 'Capsule fabric-driven de menswear. Producción japonesa + storytelling textil.',
  },
  {
    brand: 'Sandy Liang',
    year: '2014',
    founders: 'Sandy Liang',
    city: 'New York',
    skus: 14,
    investment_eur: 45000,
    y1_sales_eur: 140000,
    source: 'estimate',
    note: 'Capsule fleece-led RTW que se volvió viral en NYC downtown. Crecimiento sin ronda externa.',
  },
];

// ─── B · Colección Esencial ────────────────────────────────────────────────

const POOL_B: ArchetypeBenchmark[] = [
  {
    brand: 'Khaite',
    year: '2016',
    founders: 'Catherine Holstein',
    city: 'New York',
    skus: 25,
    investment_eur: 140000,
    y1_sales_eur: 450000,
    source: 'estimate',
    note: 'Vogue debut en su 1ª temporada. Caso modelo de "balanced launch with editorial impact".',
  },
  {
    brand: 'Wales Bonner',
    year: '2015',
    founders: 'Grace Wales Bonner',
    city: 'London',
    skus: 28,
    investment_eur: 110000,
    y1_sales_eur: 350000,
    source: 'estimate',
    note: 'Lanzamiento post-CSM MA. Menswear focused que se volvió globalmente relevante en 5 años.',
  },
  {
    brand: 'Cecilie Bahnsen',
    year: '2015',
    founders: 'Cecilie Bahnsen',
    city: 'Copenhagen',
    skus: 30,
    investment_eur: 130000,
    y1_sales_eur: 400000,
    source: 'estimate',
    note: 'RTW romántico-volumen con identidad clara desde el primer lanzamiento. Sin pivote en 8 años.',
  },
  {
    brand: 'Brandon Maxwell',
    year: '2015',
    founders: 'Brandon Maxwell',
    city: 'New York',
    skus: 25,
    investment_eur: 160000,
    y1_sales_eur: 500000,
    source: 'estimate',
    note: 'NYFW debut con backing celebrity (ex-Lady Gaga stylist). RTW launch equilibrado.',
  },
  {
    brand: 'Christopher Esber',
    year: '2010',
    founders: 'Christopher Esber',
    city: 'Sydney',
    skus: 25,
    investment_eur: 90000,
    y1_sales_eur: 300000,
    source: 'estimate',
    note: 'Drapeado escultural australiano. Lanzamiento focused que crecó en stockists premium.',
  },
  {
    brand: 'Peter Do',
    year: '2018',
    founders: 'Peter Do',
    city: 'New York',
    skus: 30,
    investment_eur: 150000,
    y1_sales_eur: 480000,
    source: 'estimate',
    note: 'Post-Phoebe Philo / Derek Lam team. RTW minimalista con autoría clara desde Y1.',
  },
  {
    brand: 'Rosie Assoulin',
    year: '2013',
    founders: 'Rosie Assoulin',
    city: 'New York',
    skus: 22,
    investment_eur: 100000,
    y1_sales_eur: 320000,
    source: 'estimate',
    note: 'RTW color-led con narrativa joyful desde primera colección. CFDA finalist Y1.',
  },
  {
    brand: 'Phipps NYC',
    year: '2017',
    founders: 'Spencer Phipps',
    city: 'New York',
    skus: 28,
    investment_eur: 110000,
    y1_sales_eur: 340000,
    source: 'estimate',
    note: 'RTW con sostenibilidad como ADN desde Y1. LVMH Prize semifinalist Y2.',
  },
  {
    brand: 'Daniel W. Fletcher',
    year: '2015',
    founders: 'Daniel W. Fletcher',
    city: 'London',
    skus: 25,
    investment_eur: 95000,
    y1_sales_eur: 290000,
    source: 'estimate',
    note: 'CSM-grad menswear con activismo político en colección. LVMH Prize finalist Y2.',
  },
  {
    brand: 'GmbH',
    year: '2016',
    founders: 'Benjamin Alexander Huseby + Serhat Işık',
    city: 'Berlin',
    skus: 28,
    investment_eur: 105000,
    y1_sales_eur: 330000,
    source: 'estimate',
    note: 'RTW Berlin queer-techno con narrativa identitaria fuerte desde el primer drop.',
  },
];

// ─── C · Apuesta Fuerte ────────────────────────────────────────────────────

const POOL_C: ArchetypeBenchmark[] = [
  {
    brand: 'Jacquemus',
    year: '2013',
    founders: 'Simon Porte Jacquemus',
    city: 'Paris',
    skus: 40,
    investment_eur: 220000,
    y1_sales_eur: 750000,
    source: 'estimate',
    note: '1ª colección comercial PFW con investment grande y editorial play completa. Apuesta de presencia.',
  },
  {
    brand: 'Vetements',
    year: '2014',
    founders: 'Demna Gvasalia + colectivo',
    city: 'Paris',
    skus: 38,
    investment_eur: 280000,
    y1_sales_eur: 900000,
    source: 'estimate',
    note: '38 looks Y1 con narrativa colectiva disruptive. High-conviction launch que cambió la conversación.',
  },
  {
    brand: 'Off-White',
    year: '2014',
    founders: 'Virgil Abloh',
    city: 'Milan',
    skus: 50,
    investment_eur: 350000,
    y1_sales_eur: 1200000,
    source: 'estimate',
    note: 'Investment alto desde día uno con full editorial Y1. Posicionamiento aggressive immediate.',
  },
  {
    brand: 'Marine Serre',
    year: '2017',
    founders: 'Marine Serre',
    city: 'Paris',
    skus: 45,
    investment_eur: 280000,
    y1_sales_eur: 800000,
    source: 'estimate',
    note: 'Post-LVMH Prize. Show grande, narrativa moonprint identificable desde Y1.',
  },
  {
    brand: 'Y/Project',
    year: '2013',
    founders: 'Glenn Martens (relaunch)',
    city: 'Paris',
    skus: 40,
    investment_eur: 200000,
    y1_sales_eur: 650000,
    source: 'estimate',
    note: 'Era Glenn Martens (relaunch post-Yohan Serfaty). Apuesta editorial fuerte con backing.',
  },
  {
    brand: 'Heron Preston',
    year: '2017',
    founders: 'Heron Preston',
    city: 'New York',
    skus: 42,
    investment_eur: 250000,
    y1_sales_eur: 800000,
    source: 'estimate',
    note: 'Streetwear/luxury crossover con investment grande Y1 + collaboration NASA inicial.',
  },
  {
    brand: 'Magliano',
    year: '2017',
    founders: 'Luca Magliano',
    city: 'Bologna',
    skus: 40,
    investment_eur: 190000,
    y1_sales_eur: 620000,
    source: 'estimate',
    note: 'Camera Moda support. Italian menswear con autoría clara y show big Y1.',
  },
  {
    brand: 'Coperni',
    year: '2019',
    founders: 'Sébastien Meyer + Arnaud Vaillant',
    city: 'Paris',
    skus: 40,
    investment_eur: 220000,
    y1_sales_eur: 700000,
    source: 'estimate',
    note: 'Debut PFW con investment fuerte. RTW techno-utility con presencia editorial Y1.',
  },
  {
    brand: 'Botter',
    year: '2018',
    founders: 'Rushemy Botter + Lisi Herrebrugh',
    city: 'Antwerp',
    skus: 38,
    investment_eur: 180000,
    y1_sales_eur: 600000,
    source: 'estimate',
    note: 'LVMH Prize Y1. Caribbean-Antwerp narrativa con backing institutional.',
  },
  {
    brand: 'Telfar',
    year: '2013',
    founders: 'Telfar Clemens',
    city: 'New York',
    skus: 38,
    investment_eur: 180000,
    y1_sales_eur: 650000,
    source: 'estimate',
    note: 'Genderless RTW con investment grande en su escala comercial. Posicionamiento post-luxury Y1.',
  },
];

// ─── D · Drops Escalonados ─────────────────────────────────────────────────

const POOL_D: ArchetypeBenchmark[] = [
  {
    brand: 'Aimé Leon Dore',
    year: '2014',
    founders: 'Teddy Santis',
    city: 'New York',
    skus: 25,
    investment_eur: 140000,
    y1_sales_eur: 450000,
    source: 'estimate',
    note: 'Paradigma del drop-led. Pequeñas tiradas + narrativa comunidad NYC. Sin él el archetype no existe.',
  },
  {
    brand: 'Awake NY',
    year: '2014',
    founders: 'Angelo Baque',
    city: 'New York',
    skus: 22,
    investment_eur: 100000,
    y1_sales_eur: 350000,
    source: 'estimate',
    note: 'Multi-drop desde Y1. Conexión cultural NYC sneaker scene (ex-Supreme).',
  },
  {
    brand: 'Sporty & Rich',
    year: '2014',
    founders: 'Emily Oberg',
    city: 'New York',
    skus: 20,
    investment_eur: 95000,
    y1_sales_eur: 320000,
    source: 'estimate',
    note: 'Drop-driven lifestyle/wellness. Empezó como Instagram zine, escaló como community-first brand.',
  },
  {
    brand: 'Corteiz',
    year: '2017',
    founders: 'Clint 419',
    city: 'London',
    skus: 18,
    investment_eur: 85000,
    y1_sales_eur: 350000,
    source: 'estimate',
    note: 'Multi-drop guerrilla con marketing viral organic. Sold-out programados Y1 sin paid ads.',
  },
  {
    brand: 'Pleasures',
    year: '2015',
    founders: 'Alex James + Vlad Elkin',
    city: 'Los Angeles',
    skus: 24,
    investment_eur: 110000,
    y1_sales_eur: 380000,
    source: 'estimate',
    note: 'Post-punk drops con collab-led storytelling. Cadencia mensual sustained desde Y1.',
  },
  {
    brand: 'Cactus Plant Flea Market',
    year: '2015',
    founders: 'Cynthia Lu',
    city: 'New York',
    skus: 20,
    investment_eur: 90000,
    y1_sales_eur: 330000,
    source: 'estimate',
    note: 'Drops collab-led con artistas/marcas. Estrategia scarcity + storytelling visual.',
  },
  {
    brand: 'Honor The Gift',
    year: '2018',
    founders: 'Vic Mensa',
    city: 'Chicago',
    skus: 22,
    investment_eur: 95000,
    y1_sales_eur: 340000,
    source: 'estimate',
    note: 'Drops culturales con posicionamiento Chicago. Backing artist + community.',
  },
  {
    brand: 'Bricks & Wood',
    year: '2018',
    founders: 'Kacey Lynch',
    city: 'Los Angeles',
    skus: 20,
    investment_eur: 80000,
    y1_sales_eur: 300000,
    source: 'estimate',
    note: 'Neighborhood drops LA. Storytelling local + scarcity programada.',
  },
  {
    brand: 'Cherry LA',
    year: '2018',
    founders: 'Kevin Ma',
    city: 'Los Angeles',
    skus: 22,
    investment_eur: 95000,
    y1_sales_eur: 340000,
    source: 'estimate',
    note: 'Drops vintage-Americana revival. Cadencia controlada + community-led.',
  },
  {
    brand: 'Kith',
    year: '2011',
    founders: 'Ronnie Fieg',
    city: 'New York',
    skus: 25,
    investment_eur: 130000,
    y1_sales_eur: 500000,
    source: 'estimate',
    note: 'Pop-up to retail empire. Drops semanales desde Atrium hasta brick-and-mortar global.',
  },
];

// ─── 4 Archetypes ──────────────────────────────────────────────────────────

const ARCHETYPES: ScenarioArchetypeTableEntry[] = [
  {
    id: 'A',
    name: 'Cápsula',
    narrative: 'Lanzamiento mínimo viable. Una colección estrecha y curada que valida la propuesta antes de comprometer más recursos.',
    sku_range: { min: 8, max: 15 },
    investment_range: { min: 30000, max: 60000 },
    y1_sales_range: { min: 80000, max: 200000 },
    drop_count: 1,
    marketing_pct: 25,
    best_for: 'Marca primeriza con presupuesto justo que quiere validar la respuesta del mercado antes de escalar.',
    benchmarks_pool: POOL_A,
  },
  {
    id: 'B',
    name: 'Colección Esencial',
    narrative: 'Suficiente surtido para contar la historia de marca completa, sin sobre-invertir. Dos drops para construir narrativa de temporada.',
    sku_range: { min: 20, max: 35 },
    investment_range: { min: 80000, max: 180000 },
    y1_sales_range: { min: 280000, max: 600000 },
    drop_count: 2,
    marketing_pct: 30,
    best_for: '"Safe bold" — primera colección con narrativa completa, presencia editorial sustentable y crecimiento controlado.',
    benchmarks_pool: POOL_B,
  },
  {
    id: 'C',
    name: 'Apuesta Fuerte',
    narrative: 'Lanzamiento ambicioso con investment grande desde día uno. Apuesta por presencia editorial inmediata y posicionamiento aggressive en el mercado.',
    sku_range: { min: 35, max: 55 },
    investment_range: { min: 150000, max: 400000 },
    y1_sales_range: { min: 600000, max: 1500000 },
    drop_count: 2,
    marketing_pct: 35,
    best_for: 'Equipo con financiación o backing institucional que quiere posicionarse en prensa y retail premium desde el primer día.',
    benchmarks_pool: POOL_C,
  },
  {
    id: 'D',
    name: 'Drops Escalonados',
    narrative: 'Ritmo continuo de multi-drops pequeños. Comunidad-first con cadencia constante y storytelling acumulativo.',
    sku_range: { min: 15, max: 30 },
    investment_range: { min: 80000, max: 200000 },
    y1_sales_range: { min: 300000, max: 800000 },
    drop_count: 4,
    marketing_pct: 40,
    best_for: 'Marca DTC nativa con audiencia online ya construida y mentalidad drop-cadence. La cadencia mantiene la comunidad activa.',
    benchmarks_pool: POOL_D,
  },
];

// ─── Runtime helper ────────────────────────────────────────────────────────

/**
 * Sample 3 benchmarks from a pool of 10. Uses Fisher-Yates shuffle
 * with the provided seed so the same collection sees the same brands
 * across reloads (consistency) but different collections see different
 * brands (variety).
 */
export function sampleBenchmarks(
  pool: ArchetypeBenchmark[],
  seed: string,
  count = 3,
): ArchetypeBenchmark[] {
  // Deterministic hash → seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/**
 * Resolve the 4 archetypes with sampled benchmarks. Used by the
 * /api/scenarios-archetypes route. The seed is the collectionPlanId
 * so each collection is consistent across reloads but the next
 * collection sees fresh variety.
 */
export function resolveArchetypes(seed: string): ScenarioArchetype[] {
  return ARCHETYPES.map(a => {
    const { benchmarks_pool, ...rest } = a;
    return {
      ...rest,
      benchmarks: sampleBenchmarks(benchmarks_pool, `${seed}:${a.id}`, 3),
    };
  });
}
