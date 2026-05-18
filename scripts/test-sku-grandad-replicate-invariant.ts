/**
 * Test de regresión · caso #3 · D10 REPLICAR CONCEPTO es invariante de escenario.
 *
 * SKU canario: ZW - GRANDAD COLLAR SHIRT WITH KNOT (4786 166 401), top del PDF V26.
 *
 * Regla cardinal (Felipe 2026-05-18):
 *   Replicar concepto es brief a diseño para futuras drops. NO compromete
 *   budget/caja de la temporada en curso. Por tanto, si dispara en
 *   Balanceada, debe disparar también en Conservar margen y en Maximizar
 *   venta, con la MISMA confianza (sin modulación).
 *
 * Source:
 *   - scenario-modulator.passesScenarioThreshold (early-return invariante)
 *   - scenario-modulator.modulateConfidence (sin case para amplify_next_season)
 *   - scenario-diales.confidence_modifier.replicate === 1.0 en 3 escenarios
 */
import {
  applyScenarioToVerdict,
} from '../src/lib/strategy/scenario-modulator';
import {
  getDialesForScenario,
} from '../src/lib/strategy/scenario-diales';

type AnyVerdict = {
  product_fact_id: string;
  actions: Array<{
    action: string;
    confidence: number;
    rationale: string;
    recommended_units: number | null;
    confidence_breakdown: Record<string, unknown>;
    evidence: Record<string, unknown>;
    counter_evidence: Record<string, unknown>;
    assumptions: unknown[];
    data_sufficiency_warning: null | string;
  }>;
  current_stock_days: number | null;
  target_rotation_days: number | null;
  modulator_notes: string[];
};

async function main() {
  let passed = 0;
  let failed = 0;
  const pass = (msg: string) => { console.log(`  ✓ ${msg}`); passed++; };
  const fail = (msg: string) => { console.log(`  ❌ ${msg}`); failed++; };

  console.log('\n=== Grandad Collar 4786 166 401 · D10 REPLICAR invariante (caso #3) ===\n');

  // Verdict base con amplify_next_season disparado (como ocurre en Balanceada
  // para un hero: aportación alta + días en tienda suficientes).
  const verdict: AnyVerdict = {
    product_fact_id: 'grandad-collar-test',
    actions: [
      {
        action: 'amplify_next_season',
        confidence: 0.78,
        rationale: 'ZW - GRANDAD COLLAR SHIRT WITH KNOT es un hero estructural. Brief a diseño: replicar silueta + material en próximas drops.',
        recommended_units: null,
        confidence_breakdown: {
          data_completeness: 0.9,
          identity: 0.85,
          demand: 0.8,
          margin: null,
          creative_fit: null,
        },
        evidence: {
          family_contribution_score: 0.18,
          days_in_store: 21,
        },
        counter_evidence: {},
        assumptions: [],
        data_sufficiency_warning: null,
      },
    ],
    current_stock_days: 51,
    target_rotation_days: 7,
    modulator_notes: [],
  };

  // v2 signals típicos de un hero con aportación moderada (0.18) — bajo el
  // umbral Conservar antiguo (0.30) que filtraba la acción.
  const v2: Record<string, unknown> = {
    family_contribution_score: 0.18,
    demand_score: 0.65,
    rotation_health_score: 0.55,
    is_logistic_rupture: false,
  };

  const scenarios = ['conservar_margen', 'balanceada', 'maximizar_venta'] as const;
  const results: Record<string, { present: boolean; confidence: number | null }> = {};

  for (const sid of scenarios) {
    const out = applyScenarioToVerdict(verdict as never, getDialesForScenario(sid), v2);
    const replicate = out.actions.find((a) => a.action === 'amplify_next_season');
    results[sid] = {
      present: !!replicate,
      confidence: replicate?.confidence ?? null,
    };
    console.log(`${sid}: present=${!!replicate} · confidence=${replicate?.confidence ?? '–'}`);
  }

  // Regla 1: debe aparecer en los 3 escenarios
  for (const sid of scenarios) {
    if (results[sid].present) pass(`amplify_next_season presente en ${sid}`);
    else fail(`amplify_next_season ausente en ${sid} (debería ser invariante)`);
  }

  // Regla 2: la confianza es la misma en los 3 escenarios (sin modulación)
  const c = 0.78;
  for (const sid of scenarios) {
    const got = results[sid].confidence;
    if (got != null && Math.abs(got - c) < 0.001) {
      pass(`confianza ${sid} = ${c} (sin modulación)`);
    } else {
      fail(`confianza ${sid} esperada ${c}, got ${got}`);
    }
  }

  // Regla 3 (negativa): aportación 0.18 estaría por DEBAJO del umbral
  // antiguo Conservar (0.30). Verificamos que YA NO se filtra por ello.
  // (Si la regla se rompiera, el SKU desaparecería en Conservar — esto ya
  // está cubierto por Regla 1, pero lo dejamos explícito como aserción.)
  if (results.conservar_margen.present && results.balanceada.present) {
    pass('Conservar y Balanceada presentan la misma acción para aportación=0.18 (umbral viejo ignorado)');
  } else {
    fail('Conservar filtró replicar concepto a pesar de que el umbral debería ser invariante');
  }

  console.log(`\n=== ${passed} passed · ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
