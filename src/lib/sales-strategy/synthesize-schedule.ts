/**
 * Synthesize drop schedule · Path B (structural)
 *
 * When user lands on Collection Builder for the first time and the drops
 * table is empty for this collection, derive a default schedule from:
 *   · merchandising.strategy.drops.{count, suggested_names}  (Block 2.1)
 *   · marketing.sales_strategy.cadence.drops_frequency_weeks (Block 4.0, optional)
 *   · marketing.sales_strategy.drop_mechanic_default          (Block 4.0, optional)
 *   · collection_plans.season + setup_data.launch_date        (Block 0/1)
 *
 * The output is a list of DropToCreate that the API endpoint inserts
 * atomically as initial drop schedule. User can edit afterwards in
 * Collection Builder OR in Marketing Sales Dashboard.
 *
 * Fallbacks (so the function NEVER returns empty when count > 0):
 *   · No launch_date in CIS → derive from season
 *     SS{YY} → mid-Feb of 20{YY}
 *     FW{YY} → mid-Aug of 20{YY}
 *     fallback → today + 12 weeks
 *   · No cadence_weeks → default 8 (typical fashion drop cadence)
 *   · No drop_mechanic → 'continuous'
 *   · No suggested_names → "Drop {number}"
 */

import type { DropMechanic } from '@/types/sales-strategy';

export interface SynthesizeScheduleInput {
  /** From merchandising.strategy.drops.count */
  drop_count: number;
  /** From merchandising.strategy.drops.suggested_names (optional) */
  suggested_names?: string[];
  /** From collection_plans.setup_data.launch_date · ISO date (optional) */
  explicit_launch_date?: string | null;
  /** From collection_plans.season ('SS27', 'FW26', etc.) */
  season?: string | null;
  /** From marketing.sales_strategy.cadence.drops_frequency_weeks (optional) */
  cadence_weeks?: number | null;
  /** From marketing.sales_strategy.drop_mechanic_default (optional) */
  drop_mechanic?: DropMechanic | null;
  /** Default channels per drop · usually ['DTC'] */
  default_channels?: string[];
}

export interface DropToCreate {
  drop_number: number;
  name: string;
  launch_date: string;        // ISO date YYYY-MM-DD
  weeks_active: number;
  channels: string[];
  mechanic: DropMechanic;
  position: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Derive a sensible anchor date.
 * Priority: explicit > season > today + 12w.
 */
function deriveAnchor(input: SynthesizeScheduleInput): Date {
  if (input.explicit_launch_date) {
    const d = new Date(input.explicit_launch_date);
    if (!isNaN(d.getTime())) return d;
  }
  if (input.season) {
    const m = input.season.toUpperCase().match(/^(SS|FW|AW|PS|PF)(\d{2})$/);
    if (m) {
      const code = m[1];
      const yy = parseInt(m[2], 10);
      // Years 00-49 → 20xx, 50-99 → 19xx (won't happen in practice but safe)
      const fullYear = yy < 50 ? 2000 + yy : 1900 + yy;
      // SS = Feb (Spring/Summer collection drops Jan-Feb)
      // FW/AW = Aug (Fall/Winter collection drops Jul-Aug)
      // PS/PF = pre-season (Nov of previous year)
      let month = 1; // Feb (0-indexed)
      if (code === 'FW' || code === 'AW') month = 7; // Aug
      if (code === 'PS' || code === 'PF') month = 10; // Nov
      return new Date(fullYear, month, 15); // mid-month
    }
  }
  // Fallback: today + 12 weeks
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 12 * 7);
  return fallback;
}

export function synthesizeSchedule(input: SynthesizeScheduleInput): DropToCreate[] {
  const count = Math.max(1, input.drop_count);
  const anchor = deriveAnchor(input);
  const cadenceWeeks = input.cadence_weeks && input.cadence_weeks > 0 ? input.cadence_weeks : 8;
  const mechanic: DropMechanic = input.drop_mechanic || 'continuous';
  const channels = input.default_channels && input.default_channels.length > 0
    ? input.default_channels
    : ['DTC'];

  const drops: DropToCreate[] = [];

  for (let i = 0; i < count; i++) {
    const launchDate = new Date(anchor.getTime() + i * cadenceWeeks * 7 * DAY_MS);
    const isoDate = launchDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const suggested = input.suggested_names?.[i];
    const name = suggested && suggested.trim().length > 0
      ? suggested
      : `Drop ${String(i + 1).padStart(2, '0')}`;

    drops.push({
      drop_number: i + 1,
      name,
      launch_date: isoDate,
      // Active until next drop or 8 weeks default for last
      weeks_active: cadenceWeeks > 0 ? cadenceWeeks : 8,
      channels: [...channels],
      mechanic,
      position: i,
    });
  }

  return drops;
}
