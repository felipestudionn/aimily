/**
 * Production timeline calculator.
 *
 * Felipe's rule: every cost + lead time decision has to converge with the
 * drop calendar. If a SKU's "materials lead → factory production → freight
 * → customs" total exceeds the time we have until launch, we surface it
 * before the user finds out by missing the season.
 *
 * Pure function — caller persists if it cares. Used by the Tech Pack
 * production-timeline pill and (later) by the AI Margin Protection
 * substitution loop, which can favor materials with shorter lead times
 * when the calendar is tight.
 */

import type { MaterialZone } from '@/types/design';

export interface TimelineInput {
  /** Materials in the BOM. */
  materialZones: MaterialZone[];
  /** Factory lead time (days) for a *standard* run — base value the
   *  calculator scales by buyUnits / factoryType / complexity. Comes
   *  from sourcing region selection. */
  factoryLeadDays?: number;
  /** Freight method — drives transit time. */
  freightMethod?: 'sea' | 'air' | 'rail' | 'road';
  /** Origin region (used to resolve freight transit by corridor). */
  freightOrigin?: string;
  /** Destination region. Defaults to EU. */
  freightDestination?: string;
  /** Drop launch date (ISO). */
  launchDate?: string;
  /** Buffer between dispatch and retail floor (defaults to 14 days). */
  retailFloorBufferDays?: number;
  /** Reference "today" for testing. */
  now?: Date;
  /** ─── Optional context that tunes the calculation ─────────────── */
  /** Units for THIS SKU. Drives the volume multiplier (small batch = faster,
   *  large run = factory queue effect). */
  buyUnits?: number;
  /** Factory tier — the prompt returns this on the picked region.
   *  artisan = handcrafted (slow), vertical = in-house mat supply (fast). */
  factoryType?: 'artisan' | 'semi-industrial' | 'vertical' | 'OEM' | string;
  /** SKU category (used for the complexity heuristic). */
  category?: 'CALZADO' | 'ROPA' | 'ACCESORIOS' | string;
  /** SKU family ("Calzado", "Vestidos", "Sastrería"…). */
  family?: string;
}

export interface TimelinePhase {
  label: string;
  days: number;
  detail?: string;
}

export interface TimelineResult {
  phases: TimelinePhase[];
  totalDays: number;
  /** Days available between today and the dispatch deadline. */
  daysAvailable: number;
  /** Slack = daysAvailable - totalDays. Negative = at risk. */
  slackDays: number;
  status: 'ok' | 'tight' | 'at-risk';
  warnings: string[];
}

/* Conservative material lead-time defaults per family — used when the
 * material doesn't have an explicit lead-time field yet. Premium leather
 * tanneries 60d · cellulosic mills 25d · synthetics 15d · trims 10d.
 *
 * Origin-aware tweak: Italian/Japanese premium tanneries take longer than
 * Spanish/Portuguese/Turkish ones for the same fiber. */
const MATERIAL_LEAD_DAYS_HEURISTIC = (z: MaterialZone): number => {
  const text = `${z.material || ''} ${z.composition || ''} ${z.finish || ''} ${z.supplier || ''}`.toLowerCase();
  let base = 25; // generic fabric
  if (/leather|cuero|nappa|nubuck|suede|crust|vegetal/.test(text)) base = 60;
  else if (/silk|seda|cashmere|wool|merino/.test(text)) base = 45;
  else if (/linen|lino|cotton|algodón|hemp|ramie|jute/.test(text)) base = 30;
  else if (/polyester|nylon|polyamide|elastane/.test(text)) base = 15;
  else if (/zipper|button|rivet|eyelet|hardware|grommet|trim|lace/.test(text)) base = 10;
  // Origin tilts: closer mills → −10d, premium far origins → +15d
  if (/spanish|portugu|spain|portugal|españ/.test(text)) base = Math.max(10, base - 10);
  else if (/turkish|turkey/.test(text)) base = Math.max(10, base - 5);
  else if (/italian|italy|conceria|walpier|japanese/.test(text)) base = base + 15;
  return base;
};

/* Volume multiplier — small batches skip the factory queue, large runs
 * get held back by the order book. */
function volumeMultiplier(buyUnits?: number): number {
  if (!buyUnits || buyUnits <= 0) return 1.0;
  if (buyUnits < 200) return 0.65;
  if (buyUnits < 2000) return 1.0;
  if (buyUnits < 5000) return 1.25;
  return 1.5;
}

/* Complexity multiplier — paneled/lined goods take longer than flat ones.
 * Rough by family/category. */
function complexityMultiplier(category?: string, family?: string): number {
  const f = (family || '').toLowerCase();
  if (/bota|boot|outerwear|abrigo|coat|sastrer|tailor|lingerie|encaje/.test(f)) return 1.3;
  if (/sneaker|deportiv|shirt|camisa|dress|vestido|pantal|skirt|falda|bolso|tote|cross/.test(f)) return 1.0;
  if (/tee|t.?shirt|scarf|panuelo|pañuelo|knit\s*simple|hat|gorro/.test(f)) return 0.75;
  if (category === 'ACCESORIOS') return 0.85;
  return 1.0;
}

/* Factory-tier multiplier — vertical mfrs have materials in-house, artisan
 * shops handcraft. */
function factoryTypeMultiplier(factoryType?: string): number {
  const t = (factoryType || '').toLowerCase();
  if (/artisan|atelier|hand/.test(t)) return 1.45;
  if (/vertical/.test(t)) return 0.85;
  if (/oem/.test(t)) return 1.1;
  if (/semi/.test(t)) return 1.0;
  return 1.0;
}

/* Freight transit days by method × corridor. Conservative middle-of-range. */
function freightDays(method: string | undefined, origin?: string, destination?: string): number {
  const o = (origin || '').toLowerCase();
  const d = (destination || 'eu').toLowerCase();
  // Same-region road wins.
  if (method === 'road') {
    if (/it|pt|es|fr|de/.test(o) && /eu|fr|de|es|pt|it/.test(d)) return 4;
    return 7;
  }
  if (method === 'rail') {
    if (/cn|china/.test(o)) return 18;
    return 10;
  }
  if (method === 'air') return 5;
  // sea (default)
  if (/cn|china|vn|vietnam|in|india/.test(o)) return 35;
  if (/tr|turkey|ma|morocco/.test(o)) return 12;
  return 21;
}

export function computeProductionTimeline(input: TimelineInput): TimelineResult {
  const {
    materialZones = [],
    factoryLeadDays = 45,
    freightMethod = 'sea',
    freightOrigin,
    freightDestination,
    launchDate,
    retailFloorBufferDays = 14,
    now = new Date(),
  } = input;

  const matLead = materialZones.length === 0
    ? 25
    : Math.max(...materialZones.map(MATERIAL_LEAD_DAYS_HEURISTIC));
  const freightLead = freightDays(freightMethod, freightOrigin, freightDestination);
  const customsBuffer = 5;

  // Factory lead = base × volume × complexity × factory type
  const vMult = volumeMultiplier(input.buyUnits);
  const cMult = complexityMultiplier(input.category, input.family);
  const tMult = factoryTypeMultiplier(input.factoryType);
  const factoryLeadActual = Math.round(factoryLeadDays * vMult * cMult * tMult);

  const factoryDetailParts: string[] = [];
  if (input.buyUnits != null && input.buyUnits > 0) factoryDetailParts.push(`${input.buyUnits} units · ×${vMult.toFixed(2)} volume`);
  if (input.factoryType) factoryDetailParts.push(`${input.factoryType} · ×${tMult.toFixed(2)}`);
  if (input.family || input.category) factoryDetailParts.push(`complexity ×${cMult.toFixed(2)}`);
  const factoryDetail = factoryDetailParts.length > 0
    ? factoryDetailParts.join(' · ')
    : `base ${factoryLeadDays}d`;

  const phases: TimelinePhase[] = [
    { label: 'Materials lead time', days: matLead, detail: 'max across BOM' },
    { label: 'Factory production', days: factoryLeadActual, detail: factoryDetail },
    { label: 'Freight + customs', days: freightLead + customsBuffer, detail: `${freightMethod} · +${customsBuffer}d customs` },
  ];
  const totalDays = phases.reduce((acc, p) => acc + p.days, 0);

  const warnings: string[] = [];
  let daysAvailable = Number.POSITIVE_INFINITY;
  let slackDays = Number.POSITIVE_INFINITY;
  let status: TimelineResult['status'] = 'ok';

  if (launchDate) {
    const launch = new Date(launchDate);
    const dispatchDeadline = new Date(launch.getTime() - retailFloorBufferDays * 24 * 3600 * 1000);
    daysAvailable = Math.round((dispatchDeadline.getTime() - now.getTime()) / (24 * 3600 * 1000));
    slackDays = daysAvailable - totalDays;
    if (slackDays < 0) {
      status = 'at-risk';
      warnings.push(`Production needs ${totalDays}d but only ${daysAvailable}d remain to dispatch deadline. Consider air freight or shifting drop.`);
    } else if (slackDays < 14) {
      status = 'tight';
      warnings.push(`Tight timeline — only ${slackDays}d slack. Any material delay risks the launch.`);
    }
  }

  if (matLead >= 60) {
    warnings.push(`Material lead time ${matLead}d is long — consider sourcing from closer mills if calendar tightens.`);
  }

  return { phases, totalDays, daysAvailable, slackDays, status, warnings };
}
