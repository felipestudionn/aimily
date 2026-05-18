/**
 * Test de regresión · caso #2 · gradualización de magnitud por escenario.
 *
 * Reglas que deben cumplirse para Bomber Jacket 5247/600:
 *   - Conservar margen: adelantar ~2 semanas = min(38000, 3957*2) ≈ 7914
 *   - Balanceada: adelantar ~4 semanas = min(38000, 3957*4) ≈ 15828
 *   - Maximizar venta: adelantar TODO = 38000
 *
 * Source: appendPullForwardIntake + scenario-modulator.modulateMagnitude
 */
import {
  applyScenarioToVerdict,
} from '../src/lib/strategy/scenario-modulator';
import {
  getDialesForScenario,
} from '../src/lib/strategy/scenario-diales';
import {
  appendPullForwardIntakeAction,
} from '../src/lib/strategy/sku-verdict-resolver';

async function main() {
  let passed = 0;
  let failed = 0;
  const pass = (msg: string) => { console.log(`  ✓ ${msg}`); passed++; };
  const fail = (msg: string) => { console.log(`  ❌ ${msg}`); failed++; };

  console.log('\n=== Bomber 5247/600 · 3 magnitudes por escenario (caso #2) ===\n');

  // Simular el verdict base que produce el appender con datos reales
  const base = {
    product_fact_id: 'bomber-test',
    actions: [],
    current_stock_days: null,
    target_rotation_days: 4,
    modulator_notes: [],
  } as any;

  const verdict = appendPullForwardIntakeAction(base, {
    stockout_risk_score: 0,
    stock_pending: 38000,
    demand_score: 1.0,
    family_contribution_score: 0.547,
    pipeline_arrival_runway_days: 50,
    velocity_7d: 3957,
    is_logistic_rupture: true,
    logistic_rupture_days_overdue: 2,
    sell_through_shipped_pct: 0.636,
  }, {
    product_name: 'BOMBER JACKET',
    family_code: 'W.A.SASTRE CORTO - 1013',
    model_ref: '5247 242 600',
    color_ref: '600',
    color_name: 'verde',
  });

  const pullForward = verdict.actions.find((a: any) => a.action === 'pull_forward_intake');
  if (!pullForward) {
    fail('pull_forward_intake no disparó');
    process.exit(1);
  }
  
  // Mock v2 signals
  const v2: any = {
    family_contribution_score: 0.547,
    efficiency_shipped_pct: 0.636,
    is_logistic_rupture: true,
  };

  // Test conservar margen: ~7914 uds
  const conservar = applyScenarioToVerdict(verdict, getDialesForScenario('conservar_margen'), v2);
  const conservarPF = conservar.actions.find((a: any) => a.action === 'pull_forward_intake');
  const conservarUnits = conservarPF?.recommended_units;
  console.log(`Conservar margen: ${conservarUnits} uds`);
  if (conservarUnits === 7914) pass('Conservar = 7914 uds (2 semanas exactas)');
  else fail(`Conservar esperado 7914, got ${conservarUnits}`);

  // Test balanceada: ~15828 uds
  const balanceada = applyScenarioToVerdict(verdict, getDialesForScenario('balanceada'), v2);
  const balPF = balanceada.actions.find((a: any) => a.action === 'pull_forward_intake');
  const balUnits = balPF?.recommended_units;
  console.log(`Balanceada: ${balUnits} uds`);
  if (balUnits === 15828) pass('Balanceada = 15828 uds (4 semanas exactas)');
  else fail(`Balanceada esperado 15828, got ${balUnits}`);

  // Test maximizar venta: 38000 uds (todo el pending)
  const maximizar = applyScenarioToVerdict(verdict, getDialesForScenario('maximizar_venta'), v2);
  const maxPF = maximizar.actions.find((a: any) => a.action === 'pull_forward_intake');
  const maxUnits = maxPF?.recommended_units;
  console.log(`Maximizar venta: ${maxUnits} uds`);
  if (maxUnits === 38000) pass('Maximizar = 38000 uds (TODO el pending)');
  else fail(`Maximizar esperado 38000, got ${maxUnits}`);

  // Verificar rationale custom por escenario
  console.log(`\nRationale Conservar: ${conservarPF?.rationale?.substring(0, 120)}...`);
  console.log(`Rationale Maximizar: ${maxPF?.rationale?.substring(0, 120)}...`);
  if (maxPF?.rationale?.includes('TODO')) pass('Maximizar rationale dice "TODO"');
  else fail('Maximizar rationale no menciona TODO');

  console.log(`\n=== ${passed} passed · ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
