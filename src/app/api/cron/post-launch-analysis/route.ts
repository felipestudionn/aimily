import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { MARKETING_PROMPTS } from '@/lib/prompts/marketing-prompts';
import { renderPrompt, buildPromptContext } from '@/lib/prompts/prompt-context';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * C6 — Post-launch analysis cron.
 *
 * Runs daily. Finds collections whose launch_date is >= 7 days ago and whose
 * setup_data.post_launch_analysis has not been generated yet, and generates
 * the retrospective for each one. The user can still regenerate manually via
 * the LaunchCard button, which hits /api/ai/post-launch/generate.
 *
 * Schedule (vercel.json): "0 8 * * *" (daily at 08:00 UTC).
 *
 * Auth: Bearer CRON_SECRET. Never run without it.
 */
export const maxDuration = 300;

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!process.env.CRON_SECRET && !!authHeader && authHeader === expected;
}

async function runAnalysisFor(collectionPlanId: string): Promise<'ok' | 'failed'> {
  try {
    const ctx = await buildPromptContext(collectionPlanId);

    const storiesBlock = ctx.stories.map((s) => ({
      name: s.name,
      story_sales_summary: `${s.sku_ids.length} SKUs`,
    }));

    const flatCtx: Record<string, unknown> = {
      brand_name: ctx.brand_name,
      season: ctx.season,
      launch_date: ctx.launch_date,
      sales_summary: 'Cron-auto: no manual sales data provided.',
      predictions_vs_actual: 'Cron-auto: best-effort assessment.',
      stories: storiesBlock,
    };

    const { data } = await generateJSON({
      system: MARKETING_PROMPTS.post_launch_analysis.system,
      user: renderPrompt(MARKETING_PROMPTS.post_launch_analysis.user, flatCtx),
      temperature: 0.5,
      maxTokens: 4096,
    });

    const { data: plan } = await supabaseAdmin
      .from('collection_plans')
      .select('setup_data')
      .eq('id', collectionPlanId)
      .single();

    const nextSetup = {
      ...((plan?.setup_data as Record<string, unknown>) ?? {}),
      post_launch_analysis: {
        generated_at: new Date().toISOString(),
        source: 'cron',
        result: data,
      },
    };

    await supabaseAdmin
      .from('collection_plans')
      .update({ setup_data: nextSetup })
      .eq('id', collectionPlanId);

    return 'ok';
  } catch (err) {
    console.error('[post-launch cron] analysis failed for', collectionPlanId, err);
    return 'failed';
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffIso = cutoff.toISOString().split('T')[0];

    // Find collections that launched more than 7 days ago and don't yet have
    // a post_launch_analysis stored in setup_data.
    const { data: plans, error } = await supabaseAdmin
      .from('collection_plans')
      .select('id, launch_date, setup_data')
      .not('launch_date', 'is', null)
      .lte('launch_date', cutoffIso);

    if (error) {
      console.error('[post-launch cron] query failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = (plans ?? []).filter((p) => {
      const setup = (p.setup_data as Record<string, unknown> | null) ?? {};
      return !setup.post_launch_analysis;
    });

    let ok = 0;
    let failed = 0;
    // Sequential to keep the Gemini/Claude rate limits happy.
    for (const plan of candidates) {
      const res = await runAnalysisFor(plan.id);
      if (res === 'ok') ok += 1;
      else failed += 1;
    }

    return NextResponse.json({
      processed: candidates.length,
      ok,
      failed,
      cutoffDate: cutoffIso,
    });
  } catch (error) {
    console.error('Post-launch cron error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
