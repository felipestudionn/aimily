/**
 * Reproduce EXACTAMENTE la lógica de route.ts para SKU Bomber.
 * Si el SKU desaparece, este script muestra dónde.
 */
import { supabaseAdmin } from '../src/lib/supabase-admin';
import {
  appendAmplifyWinnerAction,
  appendAmplifyNextSeasonAction,
  appendPullForwardIntakeAction,
  appendAmplifyDistributionAction,
  appendExtendColorsAction,
  appendDropColorAction,
  enrichVerdict,
  resolveSkuVerdict,
  resolveTargetRotationDays,
  DEFAULT_TARGET_ROTATION_DAYS,
  type SkuVerdict,
} from '../src/lib/strategy/sku-verdict-resolver';
import { modulateSkuVerdicts } from '../src/lib/strategy/sku-verdict-modulator';

const RUN_ID = '0c2ed3e9-cef4-4107-abea-c01535d885e3';
const SKU_PID = 'a1412890-dfd2-4291-bd5c-3d0a556e7e48';

async function main() {
  // 1. Verificar que el SKU está en pidsFromScores
  const { data: skuScore } = await supabaseAdmin
    .from('strategy_sku_scores')
    .select('*')
    .eq('run_id', RUN_ID).eq('product_fact_id', SKU_PID).single();
  if (!skuScore) {
    console.log('❌ FAIL: no score row para Bomber');
    return;
  }
  console.log('✓ score row existe');
  console.log(`   lifecycle: ${skuScore.lifecycle_stage}, demand: ${skuScore.demand_score}, returns: ${skuScore.returns_pct}`);

  // 2. v2_signals
  const traces = skuScore.classifier_traces as any;
  const v2 = traces?.v2_signals ?? null;
  console.log('v2_signals:', v2 ? 'OK' : '❌ MISSING');
  if (v2) {
    console.log(`   is_logistic_rupture: ${v2.is_logistic_rupture}`);
    console.log(`   logistic_rupture_days_overdue: ${v2.logistic_rupture_days_overdue}`);
    console.log(`   efficiency_shipped_pct: ${v2.efficiency_shipped_pct}`);
    console.log(`   fleet_coverage_score: ${v2.fleet_coverage_score}`);
    console.log(`   can_replenish_now: ${v2.can_replenish_now}`);
    console.log(`   family_contribution_score: ${v2.family_contribution_score}`);
  }

  // 3. Load product_fact
  const { data: pf } = await supabaseAdmin
    .from('strategy_product_facts')
    .select('*').eq('id', SKU_PID).single();
  console.log(`\n✓ product_fact: ${pf?.model_ref} pvp=${pf?.pvp}`);

  // 4. Load inventory + sales windows + efficiency
  const { data: inv } = await supabaseAdmin
    .from('strategy_inventory_facts').select('*').eq('product_fact_id', SKU_PID).single();
  const { data: eff } = await supabaseAdmin
    .from('strategy_efficiency_facts').select('*').eq('product_fact_id', SKU_PID).single();
  const { data: sw } = await supabaseAdmin
    .from('strategy_sales_windows').select('*').eq('product_fact_id', SKU_PID);
  
  const w7 = sw?.find((w: any) => w.window_type === '7d');
  const wD1 = sw?.find((w: any) => w.window_type === 'd1');
  console.log(`✓ inventory: stock_store=${inv?.stock_store}, warehouse=${inv?.stock_warehouse}, pending=${inv?.stock_pending}, pending_date=${inv?.stock_pending_date}`);
  console.log(`✓ efficiency: bought=${eff?.total_bought}, sold=${eff?.total_sold}, shipped_pct=${eff?.sell_through_shipped_pct}`);
  console.log(`✓ velocity_7d: ${w7?.units}, velocity_d1: ${wD1?.units}`);

  // 5. Simular el procesamiento
  let v: SkuVerdict = {
    product_fact_id: SKU_PID,
    actions: [],
    current_stock_days: null,
    target_rotation_days: 4,
    modulator_notes: [],
  } as any;

  const identity = {
    product_name: pf?.product_name ?? 'BOMBER JACKET',
    family_code: pf?.family_code ?? '',
    model_ref: pf?.model_ref ?? '',
    color_ref: pf?.color_ref ?? '',
    color_name: 'verde',
  };

  // amplifySignals según route.ts
  const amplifySignals = {
    demand_score: skuScore.demand_score,
    sell_through_bought_pct: skuScore.sell_through_bought_pct,
    returns_pct: skuScore.returns_pct,
    velocity_7d: w7?.units ?? 0,
    family_code: pf?.family_code,
    pdf_rank: 26,
    velocity_rank: null,
    family_velocity_ratio: null,
    brief_colors: [],
    current_color: 'verde',
    pvp: pf?.pvp,
    sibling_hero_model_refs: [],
    sell_through_shipped_pct: typeof v2?.efficiency_shipped_pct === 'number' ? v2.efficiency_shipped_pct : null,
  };

  console.log('\n--- Simulando appenders ---');
  console.log(`amplifySignals.sell_through_shipped_pct: ${amplifySignals.sell_through_shipped_pct}`);
  
  v = appendAmplifyWinnerAction(v, amplifySignals as any);
  console.log(`Después appendAmplifyWinner: ${v.actions.map(a => `${a.action}(${a.confidence.toFixed(2)})`).join(', ') || 'vacío'}`);

  v = appendAmplifyNextSeasonAction(v, {
    ...amplifySignals,
    days_in_store: 30,
    family_contribution_score: v2?.family_contribution_score,
    rotation_health_score: v2?.rotation_health_score,
  } as any);
  console.log(`Después appendAmplifyNextSeason: ${v.actions.map(a => `${a.action}(${a.confidence.toFixed(2)})`).join(', ') || 'vacío'}`);

  v = appendAmplifyDistributionAction(v, {
    fleet_coverage_score: v2?.fleet_coverage_score,
    demand_score: amplifySignals.demand_score,
    family_contribution_score: v2?.family_contribution_score,
    can_replenish_now: Boolean(v2?.can_replenish_now),
    distribution_lift_capacity_stores: v2?.distribution_lift_capacity_stores,
    returns_vs_baseline_score: v2?.returns_vs_baseline_score,
    cd2_pool_strength: v2?.cd2_pool_strength,
    stock_available: inv?.stock_available ?? null,
    cd2_available: inv?.cd2_available ?? null,
  }, identity);
  console.log(`Después appendAmplifyDistribution: ${v.actions.map(a => `${a.action}(${a.confidence.toFixed(2)})`).join(', ') || 'vacío'}`);

  v = appendPullForwardIntakeAction(v, {
    stockout_risk_score: 0,
    stock_pending: inv?.stock_pending ?? 0,
    demand_score: amplifySignals.demand_score,
    family_contribution_score: v2?.family_contribution_score,
    pipeline_arrival_runway_days: v2?.pipeline_arrival_runway_days,
    velocity_7d: w7?.units ?? 0,
    is_logistic_rupture: Boolean(v2?.is_logistic_rupture),
    logistic_rupture_days_overdue: typeof v2?.logistic_rupture_days_overdue === 'number' ? v2.logistic_rupture_days_overdue : null,
    sell_through_shipped_pct: typeof v2?.efficiency_shipped_pct === 'number' ? v2.efficiency_shipped_pct : null,
  }, identity);
  console.log(`Después appendPullForwardIntake: ${v.actions.map(a => `${a.action}(${a.confidence.toFixed(2)})`).join(', ') || 'vacío'}`);

  console.log(`\n=== STACK PRE-EXCLUSION RULES: ${v.actions.length} acciones ===`);
  for (const a of v.actions) {
    console.log(`  - ${a.action} conf ${a.confidence.toFixed(2)}`);
  }
}
main().catch(console.error);
