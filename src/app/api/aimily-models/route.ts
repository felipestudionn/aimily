import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/aimily-models
 *
 * Returns the aimily model roster grouped by family + gender.
 *
 * Query params:
 *   ?gender=female|male       — filter by gender (optional)
 *   ?family=sophisticated|strong — filter by mood family (optional; defaults to sophisticated)
 *
 * Response: { models: AimilyModel[], families: { slug, name }[] }
 */
export async function GET(req: Request) {
  const { error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const gender = searchParams.get('gender');
  const family = searchParams.get('family') || 'sophisticated';

  let query = supabaseAdmin
    .from('aimily_models')
    .select('id, name, gender, headshot_url, complexion, hair_style, hair_color, age_range, ethnicity, description, sort_order, family_slug')
    .eq('is_active', true)
    .eq('family_slug', family)
    .order('sort_order', { ascending: true });

  if (gender === 'female' || gender === 'male') {
    query = query.eq('gender', gender);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: families } = await supabaseAdmin
    .from('aimily_model_families')
    .select('slug, name, description, sort_order')
    .order('sort_order', { ascending: true });

  return NextResponse.json({ models: data || [], families: families || [] });
}
