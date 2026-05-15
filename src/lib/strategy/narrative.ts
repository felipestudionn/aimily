/**
 * LLM narrative generator — Codex contrapropuesta §8.
 *
 * Three roles for the LLM (NEVER calculator):
 *   A) Narrator — turn structured scores into merchandising language
 *   B) Critic — challenge recommendations the deterministic engine produced
 *   C) Investigation assistant — answer ad-hoc analyst questions over scores
 *
 * Output is always grounded in the scored entities (passed in as structured
 * input). We do NOT pass raw observations to the LLM; we pass classifier
 * verdicts + the evidence they cite.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';

const MODEL_ID = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are a fashion merchandising analyst writing for a category director.
You explain recommendations grounded in structured score data. You do not invent metrics.
You quote the numbers you were given. You sound like an experienced buyer, not a consultant.

Voice: tight, evidence-bound, no filler. Reference specific lifecycle stages,
sell-through percentages, return rates, distribution breadth. Cite the lineage
or family by name when relevant.

If the data shows insufficient evidence (low confidence dimensions), say so
explicitly — never paper over uncertainty. Calibrated honesty over false confidence.`;

export async function generateScenarioNarrative(
  runId: string,
  scenarioId: string,
  apiKey?: string
): Promise<string> {
  const { data: scenario, error: sErr } = await supabaseAdmin
    .from('strategy_scenarios')
    .select(
      'name, description, scenario_type, candidate_ids, creative_application_summary, total_predicted_revenue, total_predicted_margin, total_predicted_returns, total_predicted_buy_budget, predicted_sku_count, constraint_satisfaction_summary'
    )
    .eq('id', scenarioId)
    .single();
  if (sErr || !scenario) throw new Error(`Scenario not found: ${scenarioId}`);

  const ids = (scenario.candidate_ids as string[]) || [];
  const { data: candidates } = await supabaseAdmin
    .from('strategy_recommendation_candidates')
    .select('scope, scope_ref, action_type, evidence, counter_evidence, confidence_action, narrative')
    .in('id', ids.slice(0, 50));

  // Group by action_type for a tighter prompt.
  const byAction = new Map<string, any[]>();
  for (const c of candidates || []) {
    let arr = byAction.get(c.action_type);
    if (!arr) {
      arr = [];
      byAction.set(c.action_type, arr);
    }
    arr.push(c);
  }

  const summarized = Array.from(byAction.entries()).map(([action, items]) => ({
    action,
    count: items.length,
    top_evidence: items.slice(0, 3).map((i) => ({
      scope: i.scope,
      scope_ref: i.scope_ref,
      confidence: i.confidence_action,
      evidence: i.evidence,
    })),
  }));

  const prompt = `Generate a 3-paragraph executive narrative for this strategic scenario.

SCENARIO:
${JSON.stringify(
  {
    name: scenario.name,
    description: scenario.description,
    type: scenario.scenario_type,
    creative_application: scenario.creative_application_summary,
    predicted_revenue: scenario.total_predicted_revenue,
    predicted_margin: scenario.total_predicted_margin,
    predicted_returns: scenario.total_predicted_returns,
    predicted_buy_budget: scenario.total_predicted_buy_budget,
    sku_count: scenario.predicted_sku_count,
    constraint_satisfaction: scenario.constraint_satisfaction_summary,
  },
  null,
  2
)}

CANDIDATES (grouped by action, top 3 each):
${JSON.stringify(summarized, null, 2)}

Output: 3 paragraphs of plain markdown. No headings, no lists.
Para 1: What this scenario does. Reference exact action counts and the constraint satisfaction.
Para 2: Strongest evidence-backed recommendations from the candidate pool. Quote specific scope_refs.
Para 3: Risks + assumptions to validate. If creative_application is set, explain how creative direction modulated the picks.`;

  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text');
  }
  return textBlock.text.trim();
}

export async function generateRunSummary(
  runId: string,
  apiKey?: string
): Promise<{ learnings_narrative: string; creative_application: string | null }> {
  const { data: run } = await supabaseAdmin
    .from('strategy_analysis_runs')
    .select(
      'name, data_coverage_summary, creative_brief_id'
    )
    .eq('id', runId)
    .single();
  if (!run) throw new Error(`Run not found: ${runId}`);

  const [familyRes, candidateCountRes, scenarioRes] = await Promise.all([
    supabaseAdmin
      .from('strategy_family_scores')
      .select('family_code, family_roi, sku_count, hero_count, dog_count, share_of_wallet_pct, return_drag_score, saturation_score')
      .eq('run_id', runId)
      .order('share_of_wallet_pct', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('strategy_recommendation_candidates')
      .select('action_type', { count: 'exact', head: false })
      .eq('run_id', runId),
    supabaseAdmin
      .from('strategy_scenarios')
      .select('name, scenario_type, predicted_sku_count, total_predicted_revenue, total_predicted_margin, creative_application_summary')
      .eq('run_id', runId),
  ]);

  const actionCounts = new Map<string, number>();
  for (const c of candidateCountRes.data || []) {
    actionCounts.set(c.action_type, (actionCounts.get(c.action_type) || 0) + 1);
  }

  let creativeBrief: any = null;
  if (run.creative_brief_id) {
    const { data } = await supabaseAdmin
      .from('strategy_creative_briefs')
      .select('name, color_story, archetypes_focus, family_pivot, creative_narrative')
      .eq('id', run.creative_brief_id)
      .single();
    creativeBrief = data;
  }

  const learningsPrompt = `Summarize the findings from this strategic analysis run for a category director.
4 paragraphs of plain markdown. No headings, no bullet lists. Reference specific families and percentages.

RUN COVERAGE:
${JSON.stringify(run.data_coverage_summary, null, 2)}

TOP FAMILIES BY SHARE OF WALLET:
${JSON.stringify(familyRes.data, null, 2)}

RECOMMENDATION ACTIONS:
${JSON.stringify(Object.fromEntries(actionCounts), null, 2)}

SCENARIOS GENERATED:
${JSON.stringify(scenarioRes.data, null, 2)}

Para 1: Coverage + scale (sku count, families, lineages).
Para 2: Top family-level findings (heroes, saturation, returns risk). Quote 2-3 specific family codes.
Para 3: Distribution of actions (what the engine wants to do most). Note any concentration or imbalance.
Para 4: Recommended next step. If insufficient evidence anywhere, surface it.`;

  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const learningsResp = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: learningsPrompt }],
  });
  const learningsBlock = learningsResp.content.find((c) => c.type === 'text');
  const learningsNarrative =
    learningsBlock?.type === 'text' ? learningsBlock.text.trim() : '';

  let creativeApplication: string | null = null;
  if (creativeBrief) {
    const creativePrompt = `Explain how this creative brief modulated the strategic recommendations.
2 paragraphs of plain markdown. Be specific about which families/colors/archetypes the brief amplified
or deprioritized vs the pure-data baseline.

CREATIVE BRIEF:
${JSON.stringify(creativeBrief, null, 2)}

SCENARIOS WITH CREATIVE APPLICATION:
${JSON.stringify(
  (scenarioRes.data || []).filter((s) => s.creative_application_summary),
  null,
  2
)}

Para 1: What the brief asked for (color story, archetype focus, family pivot).
Para 2: What the engine did with it — concretely, which candidates were amplified and why.`;

    const creativeResp = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: creativePrompt }],
    });
    const creativeBlock = creativeResp.content.find((c) => c.type === 'text');
    creativeApplication = creativeBlock?.type === 'text' ? creativeBlock.text.trim() : null;
  }

  return { learnings_narrative: learningsNarrative, creative_application: creativeApplication };
}
