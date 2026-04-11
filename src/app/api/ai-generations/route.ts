import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    const type = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');
    const storyId = req.nextUrl.searchParams.get('storyId');
    const skuId = req.nextUrl.searchParams.get('skuId');

    if (planId) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
      if (!authorized) return ownerError;
    }

    let query = supabaseAdmin
      .from('ai_generations')
      .select('*')
      .order('created_at', { ascending: false });

    if (planId) query = query.eq('collection_plan_id', planId);
    if (type) query = query.eq('generation_type', type);
    if (status) query = query.eq('status', status);
    if (storyId) query = query.eq('story_id', storyId);
    if (skuId) query = query.contains('input_data', { sku_id: skuId });

    // If no planId, filter by user_id to only return user's own generations
    if (!planId) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching ai_generations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch generations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();

    if (!body.generation_type || !body.prompt) {
      return NextResponse.json(
        { error: 'generation_type and prompt are required' },
        { status: 400 }
      );
    }

    // Use authenticated user's id
    body.user_id = user.id;

    if (body.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, body.collection_plan_id);
      if (!authorized) return ownerError;
    }

    // Whitelist only columns that exist in ai_generations so a stale client
    // (or an extra field sneaked in by mistake) can't blow up the insert.
    // Everything else is silently dropped.
    const allowedColumns = new Set([
      'user_id',
      'collection_plan_id',
      'generation_type',
      'prompt',
      'input_data',
      'output_data',
      'provider_request_id',
      'model_used',
      'cost_credits',
      'status',
      'is_favorite',
      'error',
      'story_id',
      'completed_at',
    ]);
    const cleanBody: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (allowedColumns.has(k)) cleanBody[k] = v;
    }
    if (cleanBody.is_favorite === undefined) cleanBody.is_favorite = false;
    if (cleanBody.status === undefined) cleanBody.status = 'completed';

    // FK safety: if a story_id is provided, drop it when it doesn't resolve
    // to a real story in the same collection_plan. Prevents 23503 foreign
    // key constraint failures when the client passes a stale id.
    if (cleanBody.story_id) {
      const { data: storyExists } = await supabaseAdmin
        .from('collection_stories')
        .select('id')
        .eq('id', cleanBody.story_id as string)
        .maybeSingle();
      if (!storyExists) {
        console.warn(
          `[ai-generations POST] story_id ${cleanBody.story_id} not found, nulling.`
        );
        cleanBody.story_id = null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('ai_generations')
      .insert(cleanBody)
      .select()
      .single();

    if (error) {
      // Structured error — surfaces in Vercel logs with enough info to
      // diagnose schema constraint violations without redeploy.
      console.error('[ai-generations POST] Supabase insert failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        body_keys: Object.keys(cleanBody),
        generation_type: cleanBody.generation_type,
      });
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[ai-generations POST] unexpected', error);
    const message = error instanceof Error ? error.message : 'Failed to create generation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
