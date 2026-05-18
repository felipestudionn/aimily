/**
 * Test canario · sprint pre-pitch · cierre 11 P0 (2026-05-18).
 *
 * Verifica los blockers cardinales de exclusion-rules.ts contra inputs
 * sintéticos que reproducen los gaps detectados en la auditoría Codex:
 *   P0-D · stock sanity violated → buy verbs bloqueados + D9
 *   P0-E · return-trap (returns≥25%) → buy verbs bloqueados
 *   P0-H · cannibalization (>0.5) → D3/D4/D5 bloqueados
 *   P0-I · D5/D6 con ST_shipped<0.30 → amplify bloqueado
 *   P0-K · compra inflada → D8 bloqueado
 *   P0-G · late-season-stuck → markdown permitido aunque ST_shipped≥0.50
 *
 * Felipe sprint 2026-05-18.
 */
import { applyExclusionRules } from '../src/lib/strategy/exclusion-rules';
import { appendInvestigateAbsoluteTriggers, appendHeroFallback } from '../src/lib/strategy/d9-and-hero-appenders';

type V = {
  product_fact_id: string;
  actions: Array<{ action: string; evidence?: Record<string, unknown> }>;
  current_stock_days: number | null;
  target_rotation_days: number | null;
  modulator_notes: string[];
};

function makeVerdict(actions: string[]): V {
  return {
    product_fact_id: 'test',
    actions: actions.map((a) => ({ action: a, evidence: {} })),
    current_stock_days: null,
    target_rotation_days: null,
    modulator_notes: [],
  };
}

const identity = {
  product_name: 'TEST SKU',
  family_code: null,
  model_ref: 'TEST',
  color_ref: null,
  color_name: null,
};

async function main() {
  let passed = 0;
  let failed = 0;
  const pass = (msg: string) => { console.log(`  ✓ ${msg}`); passed++; };
  const fail = (msg: string) => { console.log(`  ❌ ${msg}`); failed++; };

  console.log('\n=== Sprint cierre P0 · blockers cardinales ===\n');

  // P0-E · Return-trap
  console.log('\n-- P0-E return-trap (returns 40%) --');
  {
    const verdict = makeVerdict(['replenish', 'amplify_distribution', 'extend_colors', 'amplify_next_season']);
    const v2 = { returns_pct: 0.40, efficiency_shipped_pct: 0.50 };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (!surviving.includes('replenish')) pass('replenish bloqueado por return-trap');
    else fail('replenish NO bloqueado');
    if (!surviving.includes('amplify_distribution')) pass('amplify_distribution bloqueado');
    else fail('amplify_distribution NO bloqueado');
    if (!surviving.includes('amplify_next_season')) pass('amplify_next_season bloqueado');
    else fail('amplify_next_season NO bloqueado');
    if (!surviving.includes('extend_colors')) pass('extend_colors bloqueado');
    else fail('extend_colors NO bloqueado');
  }

  // P0-H · Cannibalization
  console.log('\n-- P0-H cannibalization (0.7) --');
  {
    const verdict = makeVerdict(['replenish', 'pull_forward_intake', 'amplify_distribution']);
    const v2 = { cannibalization_risk_score: 0.7, efficiency_shipped_pct: 0.45 };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (!surviving.includes('replenish')) pass('replenish bloqueado por canibalización');
    else fail('replenish NO bloqueado');
    if (!surviving.includes('pull_forward_intake')) pass('pull_forward bloqueado');
    else fail('pull_forward NO bloqueado');
  }

  // P0-I · D5/D6 gate ST_shipped<0.30
  console.log('\n-- P0-I ST_shipped 0.10 --');
  {
    const verdict = makeVerdict(['amplify_distribution', 'amplify_in_season', 'extend_colors']);
    const v2 = { efficiency_shipped_pct: 0.10, returns_pct: 0.05 };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (!surviving.includes('amplify_distribution')) pass('amplify_distribution bloqueado (ST 10%)');
    else fail('amplify_distribution NO bloqueado');
    if (!surviving.includes('amplify_in_season')) pass('amplify_in_season bloqueado');
    else fail('amplify_in_season NO bloqueado');
    if (!surviving.includes('extend_colors')) pass('extend_colors bloqueado');
    else fail('extend_colors NO bloqueado');
  }

  // P0-K · Compra inflada
  console.log('\n-- P0-K compra inflada (bought 0.12 / shipped 0.45) --');
  {
    const verdict = makeVerdict(['resize_down']);
    const v2 = { efficiency_bought_pct: 0.12, efficiency_shipped_pct: 0.45 };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (!surviving.includes('resize_down')) pass('resize_down bloqueado (compra inflada)');
    else fail('resize_down NO bloqueado');
  }

  // P0-D · Sanity violated
  console.log('\n-- P0-D sanity violated --');
  {
    const verdict = makeVerdict(['replenish', 'pull_forward_intake', 'amplify_in_season']);
    const v2 = { data_sanity_violated: true, efficiency_shipped_pct: 0.40 };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (!surviving.includes('replenish')) pass('replenish bloqueado (sanity violated)');
    else fail('replenish NO bloqueado');
    if (!surviving.includes('amplify_in_season')) pass('amplify_in_season bloqueado');
    else fail('amplify_in_season NO bloqueado');
  }

  // P0-G · Late season stuck — markdown permitido pese a ST_shipped≥0.50
  console.log('\n-- P0-G late season stuck (ST shipped 80% + decay + pipeline tardío) --');
  {
    const verdict = makeVerdict(['markdown_accelerate', 'replenish']);
    const v2 = { efficiency_shipped_pct: 0.80, is_late_season_stuck: true };
    const out = applyExclusionRules(verdict, v2);
    const surviving = out.actions.map((a) => a.action);
    if (surviving.includes('markdown_accelerate')) pass('markdown_accelerate sobrevive (decay terminal)');
    else fail('markdown_accelerate eliminado — regla anti-Bomber se aplicó incorrectamente');
  }

  // P0-J · D9 appender (returns absolutos)
  console.log('\n-- P0-J D9 appender returns 30% --');
  {
    const verdict = makeVerdict(['carryover']);
    const v2 = {
      returns_pct: 0.30,
      cannibalization_risk_score: 0.1,
      efficiency_bought_pct: 0.4,
      efficiency_shipped_pct: 0.5,
      data_sanity_violated: false,
    };
    const out = appendInvestigateAbsoluteTriggers(verdict as never, v2, identity);
    const hasInvestigate = out.actions.some((a) => a.action === 'investigate');
    if (hasInvestigate) pass('investigate añadido por returns 30%');
    else fail('investigate NO añadido');
  }

  // P0-C · Hero fallback
  console.log('\n-- P0-C hero fallback (pdf_rank 3, stack vacío) --');
  {
    const verdict = makeVerdict([]);
    const v2 = { returns_pct: 0.05, efficiency_shipped_pct: 0.55 };
    const out = appendHeroFallback(verdict as never, v2, 3, 5, true, identity);
    const hasInSeason = out.actions.some((a) => a.action === 'amplify_in_season');
    const hasNextSeason = out.actions.some((a) => a.action === 'amplify_next_season');
    if (hasInSeason) pass('amplify_in_season inyectado por hero fallback');
    else fail('amplify_in_season NO inyectado');
    if (hasNextSeason) pass('amplify_next_season inyectado por hero fallback');
    else fail('amplify_next_season NO inyectado');
  }

  // P0-C · Hero fallback NO dispara con returns altos
  console.log('\n-- P0-C hero fallback NO dispara con returns 30% --');
  {
    const verdict = makeVerdict([]);
    const v2 = { returns_pct: 0.30, efficiency_shipped_pct: 0.55 };
    const out = appendHeroFallback(verdict as never, v2, 3, 5, true, identity);
    if (out.actions.length === 0) pass('hero fallback bloqueado por returns 30% (gate correcto)');
    else fail('hero fallback emitió acciones pese a returns 30%');
  }

  console.log(`\n=== ${passed} passed · ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
