import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    const { data, error } = await supabaseAdmin
      .from('brand_voice_config')
      .select('*')
      .eq('collection_plan_id', planId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching brand_voice_config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    if (!body.collection_plan_id) {
      return NextResponse.json({ error: 'collection_plan_id required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(
      user.id,
      body.collection_plan_id,
      'edit_marketing',
    );
    if (!authorized) return ownerError;

    // Upsert: one config per collection
    const { data: existing } = await supabaseAdmin
      .from('brand_voice_config')
      .select('id')
      .eq('collection_plan_id', body.collection_plan_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('brand_voice_config')
        .update(body)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('brand_voice_config')
        .insert(body)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    // CIS: capture voice decisions (fire-and-forget)
    if (result && body.collection_plan_id) {
      const { recordDecisions } = await import('@/lib/collection-intelligence');
      const base = { collectionPlanId: body.collection_plan_id, sourcePhase: 'marketing', sourceComponent: 'BrandVoiceConfig', userId: user.id };
      const decisions: Parameters<typeof recordDecisions>[0] = [];
      if (result.personality) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'personality', value: result.personality, tags: ['affects_content'] });
      if (result.tone) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'tone', value: result.tone, tags: ['affects_content'] });
      if (result.do_rules?.length) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'do_rules', value: result.do_rules, tags: ['affects_content'] });
      if (result.dont_rules?.length) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'dont_rules', value: result.dont_rules, tags: ['affects_content'] });
      if (result.vocabulary?.length) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'vocabulary', value: result.vocabulary, tags: ['affects_content', 'affects_seo'] });
      if (decisions.length) recordDecisions(decisions).catch((err: unknown) => console.error('[CIS] voice config capture failed:', err));
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error saving brand_voice_config:', error);
    const message = error instanceof Error ? error.message : 'Failed to save';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
