import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

// GET /api/brand-profiles?planId=xxx - Get or create brand profile for a collection
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    // Try to find existing profile
    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .select('*')
      .eq('collection_plan_id', planId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found — auto-create an empty profile
      const { data: created, error: createErr } = await supabaseAdmin
        .from('brand_profiles')
        .insert([{ collection_plan_id: planId }])
        .select()
        .single();

      if (createErr) {
        console.error('Error creating brand profile:', createErr);
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json(created);
    }

    if (error) {
      console.error('Error fetching brand profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET brand profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/brand-profiles - Update brand profile
export async function PATCH(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Look up the brand profile to get collection_plan_id for ownership check
    const { data: profile } = await supabaseAdmin
      .from('brand_profiles')
      .select('collection_plan_id')
      .eq('id', id)
      .single();

    if (profile?.collection_plan_id) {
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, profile.collection_plan_id);
      if (!authorized) return ownerError;
    }

    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating brand profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // CIS: capture brand profile decisions (fire-and-forget)
    if (data && profile?.collection_plan_id) {
      const { recordDecisions } = await import('@/lib/collection-intelligence');
      const planId = profile.collection_plan_id;
      const decisions: Parameters<typeof recordDecisions>[0] = [];
      const base = { collectionPlanId: planId, sourcePhase: 'creative', sourceComponent: 'BrandProfileCard', userId: user.id };

      if (data.brand_name) decisions.push({ ...base, domain: 'creative', subdomain: 'identity', key: 'brand_name', value: data.brand_name, tags: ['affects_content', 'affects_seo', 'affects_sales'] });
      if (data.tagline) decisions.push({ ...base, domain: 'creative', subdomain: 'identity', key: 'tagline', value: data.tagline, tags: ['affects_content', 'affects_seo'] });
      if (data.brand_story) decisions.push({ ...base, domain: 'creative', subdomain: 'identity', key: 'brand_story', value: data.brand_story, tags: ['affects_content'] });
      if (data.brand_voice) {
        if (data.brand_voice.tone) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'tone', value: data.brand_voice.tone, sourcePhase: 'marketing', tags: ['affects_content'] });
        if (data.brand_voice.personality) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'personality', value: data.brand_voice.personality, sourcePhase: 'marketing', tags: ['affects_content'] });
        if (data.brand_voice.keywords?.length) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'vocabulary', value: data.brand_voice.keywords, sourcePhase: 'marketing', tags: ['affects_content', 'affects_seo'] });
        if (data.brand_voice.doNot?.length) decisions.push({ ...base, domain: 'marketing', subdomain: 'voice', key: 'dont_rules', value: data.brand_voice.doNot, sourcePhase: 'marketing', tags: ['affects_content'] });
      }
      if (data.target_audience) {
        if (data.target_audience.demographics) decisions.push({ ...base, domain: 'creative', subdomain: 'target', key: 'demographics', value: data.target_audience.demographics, tags: ['affects_content', 'affects_pricing', 'affects_channels'] });
        if (data.target_audience.psychographics) decisions.push({ ...base, domain: 'creative', subdomain: 'target', key: 'psychographics', value: data.target_audience.psychographics, tags: ['affects_content'] });
        if (data.target_audience.lifestyle) decisions.push({ ...base, domain: 'creative', subdomain: 'target', key: 'lifestyle', value: data.target_audience.lifestyle, tags: ['affects_content', 'affects_photography'] });
      }
      if (data.primary_colors?.length) decisions.push({ ...base, domain: 'creative', subdomain: 'color', key: 'primary_palette', value: data.primary_colors, tags: ['affects_photography', 'affects_web'] });
      if (data.competitors?.length) decisions.push({ ...base, domain: 'creative', subdomain: 'inspiration', key: 'competitors', value: data.competitors, tags: ['affects_pricing', 'affects_content'] });

      if (decisions.length > 0) {
        recordDecisions(decisions).catch((err: unknown) => console.error('[CIS] brand profile capture failed:', err));
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH brand profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
