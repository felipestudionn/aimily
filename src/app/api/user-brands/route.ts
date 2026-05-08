import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ═══════════════════════════════════════════════════════════
   user_brands — user-level brand vault.
   Sprint A.3 of Brand DNA refactor (2026-05-08): a brand is a
   USER-LEVEL entity that may cover multiple collections, not a
   per-collection blob in collection_decisions. This endpoint is
   the canonical CRUD on the vault.

   GET    — list user's brands (excludes soft-deleted)
   POST   — UPSERT (insert or update by id) + optional collection link
   DELETE — soft delete (sets deleted_at; papelera 30d cron purges)

   New (2026-05-08) structured columns honored:
     tagline (text), voice (jsonb), visual_identity (jsonb),
     applications (jsonb), source (text), source_data (jsonb)

   Legacy columns kept (backward compat with the pre-refactor UI):
     tone (text), typography (text), style (text), instagram (text),
     website (text), is_trend_driven (bool), brand_data (jsonb)
   ═══════════════════════════════════════════════════════════ */

// GET /api/user-brands — list non-deleted brands for the user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_brands')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user brands:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ brands: data || [] });
  } catch (error) {
    console.error('GET user-brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user-brands — UPSERT a brand (and optionally link to a collection)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      id,
      brand_name,
      // legacy summary fields (kept for backward compat with pre-refactor UI)
      tone,
      typography,
      style,
      instagram,
      website,
      is_trend_driven,
      brand_data,
      // new structured fields (Sprint A.3)
      tagline,
      colors,
      voice,
      visual_identity,
      applications,
      source,
      source_data,
      // optional: in the same operation, set collection_plans.brand_id = brand.id
      link_collection_plan_id,
    } = body as Record<string, unknown>;

    // Build the row payload, only including provided fields so partial
    // updates don't wipe columns that callers didn't intend to touch.
    const row: Record<string, unknown> = { user_id: user.id };
    if (typeof brand_name === 'string') row.brand_name = brand_name || 'Untitled Brand';
    if (tagline !== undefined) row.tagline = (tagline as string) || null;
    if (colors !== undefined) row.colors = colors;
    if (voice !== undefined) row.voice = voice;
    if (visual_identity !== undefined) row.visual_identity = visual_identity;
    if (applications !== undefined) row.applications = applications;
    if (source !== undefined) row.source = source;
    if (source_data !== undefined) row.source_data = source_data;
    if (tone !== undefined) row.tone = tone || '';
    if (typography !== undefined) row.typography = typography || '';
    if (style !== undefined) row.style = style || '';
    if (instagram !== undefined) row.instagram = instagram || '';
    if (website !== undefined) row.website = website || '';
    if (is_trend_driven !== undefined) row.is_trend_driven = !!is_trend_driven;
    if (brand_data !== undefined) row.brand_data = brand_data;

    let saved: Record<string, unknown> | null = null;

    if (typeof id === 'string' && id) {
      // UPDATE — must own the row
      const { data: existing, error: existingErr } = await supabase
        .from('user_brands')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (existingErr || !existing) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }
      // Touch updated_at so the vault picker can sort by recency
      row.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_brands')
        .update(row)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        console.error('Error updating user brand:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      saved = data;
    } else {
      // INSERT — brand_name is required at creation time
      if (!row.brand_name) row.brand_name = 'Untitled Brand';
      const { data, error } = await supabase
        .from('user_brands')
        .insert([row])
        .select()
        .single();
      if (error) {
        console.error('Error inserting user brand:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      saved = data;
    }

    // Optional: link this brand to a collection plan in the same call.
    // Verifies the caller owns the plan via supabase (RLS); falls through
    // silently if not — the brand row still saved.
    if (saved && typeof link_collection_plan_id === 'string' && link_collection_plan_id) {
      const { data: plan, error: planErr } = await supabase
        .from('collection_plans')
        .select('id, user_id')
        .eq('id', link_collection_plan_id)
        .single();
      if (!planErr && plan && plan.user_id === user.id) {
        // Use admin client to bypass any FK / RLS quirks; ownership already
        // verified above via the user-scoped client.
        await supabaseAdmin
          .from('collection_plans')
          .update({ brand_id: saved.id, updated_at: new Date().toISOString() })
          .eq('id', link_collection_plan_id);
      }
    }

    return NextResponse.json({ brand: saved });
  } catch (error) {
    console.error('POST user-brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user-brands?id=xxx — soft delete (sets deleted_at)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error soft-deleting user brand:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Unlink from any collection_plans that pointed at this brand so
    // those collections fall back to "no brand" on next read instead of
    // pointing at a tombstone row.
    await supabaseAdmin
      .from('collection_plans')
      .update({ brand_id: null })
      .eq('brand_id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE user-brands error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
