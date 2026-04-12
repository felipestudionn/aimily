import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/stories?planId=xxx
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_stories')
      .select('*')
      .eq('collection_plan_id', planId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching stories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Stories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stories — create one or many stories (bulk for AI)
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    // Support bulk insert: { stories: [...] } or single: { collection_plan_id, name, ... }
    const rows = Array.isArray(body.stories) ? body.stories : [body];

    for (const row of rows) {
      if (!row.collection_plan_id || !row.name) {
        return NextResponse.json(
          { error: 'collection_plan_id and name are required for every story' },
          { status: 400 }
        );
      }
    }

    // Verify ownership for the collection_plan_id
    const planId = rows[0].collection_plan_id;
    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId, 'edit_marketing');
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('collection_stories')
      .insert(rows)
      .select();

    if (error) {
      console.error('Error creating stories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If bulk, also assign SKUs to stories via story_id on collection_skus.
    // Robustified so an LLM that hallucinates or partially fills sku_ids
    // can't leave the collection in a broken state:
    //  1. Pre-fetch the real SKU ids for this collection_plan_id
    //  2. Intersect the AI's sku_ids with real ids (drop anything hallucinated)
    //  3. After the assigned pass, sweep any SKU still orphaned into the
    //     first story so nothing is silently lost.
    //  4. Always clear story_id on every SKU of the plan first (so that
    //     re-runs of this bulk POST produce a clean state, not merged state).
    let assignmentSummary: {
      assigned: number;
      hallucinated: number;
      orphan_fallback: number;
      total_skus: number;
    } | null = null;

    if (Array.isArray(body.stories)) {
      // Fetch real SKU ids once
      const { data: realSkus } = await supabaseAdmin
        .from('collection_skus')
        .select('id')
        .eq('collection_plan_id', planId);

      const realSkuIds = new Set((realSkus ?? []).map((s) => s.id as string));
      const totalSkus = realSkuIds.size;

      // Reset every SKU to unassigned so a re-run yields a clean state.
      if (totalSkus > 0) {
        await supabaseAdmin
          .from('collection_skus')
          .update({ story_id: null })
          .eq('collection_plan_id', planId);
      }

      const storyMap = new Map<string, string>();
      for (const s of data) {
        storyMap.set(s.name, s.id);
      }

      let assigned = 0;
      let hallucinated = 0;
      const assignedSkus = new Set<string>();

      if (body.sku_assignments) {
        for (const [storyName, skuIds] of Object.entries(body.sku_assignments)) {
          const storyId = storyMap.get(storyName);
          if (!storyId || !Array.isArray(skuIds)) continue;
          for (const skuId of skuIds as string[]) {
            if (!realSkuIds.has(skuId)) {
              hallucinated += 1;
              continue;
            }
            if (assignedSkus.has(skuId)) continue; // already claimed by an earlier story
            const { error: updErr } = await supabaseAdmin
              .from('collection_skus')
              .update({ story_id: storyId })
              .eq('id', skuId);
            if (!updErr) {
              assigned += 1;
              assignedSkus.add(skuId);
            }
          }
        }
      }

      // Sweep orphans: any SKU not yet assigned gets attached to the first
      // story so ProductVisualsCard never shows zero assigned when there
      // are real products to show.
      let orphanFallback = 0;
      const firstStoryId = data[0]?.id as string | undefined;
      if (firstStoryId) {
        const orphans = Array.from(realSkuIds).filter((id) => !assignedSkus.has(id));
        if (orphans.length > 0) {
          const { error: sweepErr } = await supabaseAdmin
            .from('collection_skus')
            .update({ story_id: firstStoryId })
            .in('id', orphans);
          if (!sweepErr) orphanFallback = orphans.length;
        }
      }

      assignmentSummary = {
        assigned,
        hallucinated,
        orphan_fallback: orphanFallback,
        total_skus: totalSkus,
      };

      if (hallucinated > 0) {
        console.warn(
          `[stories POST] AI proposed ${hallucinated} SKU ids that do not exist in plan ${planId}; dropped.`
        );
      }
    }

    // CIS: capture story decisions (fire-and-forget)
    if (data?.length && planId) {
      const { recordDecisions } = await import('@/lib/collection-intelligence');
      const storyArcs = data.map((s: Record<string, unknown>) => ({
        name: s.name as string,
        narrative: (s.narrative as string) || '',
        mood: s.mood || [],
      }));
      const editorialHooks = data
        .map((s: Record<string, unknown>) => s.editorial_hook as string)
        .filter(Boolean);
      const base = { collectionPlanId: planId, sourcePhase: 'marketing', sourceComponent: 'StoriesCard', userId: user.id };
      recordDecisions([
        { ...base, domain: 'marketing', subdomain: 'stories', key: 'story_arcs', value: storyArcs, tags: ['affects_content', 'affects_photography'] },
        ...(editorialHooks.length ? [{ ...base, domain: 'marketing', subdomain: 'stories', key: 'editorial_hooks', value: editorialHooks, tags: ['affects_content', 'affects_seo'] }] : []),
      ]).catch((err: unknown) => console.error('[CIS] stories capture failed:', err));
    }

    const payload = Array.isArray(body.stories)
      ? { stories: data, assignment_summary: assignmentSummary }
      : data[0];
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error('Stories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
