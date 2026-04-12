import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/aimily-models
 *
 * Returns the aimily model roster — 28 AI-generated models (14 female,
 * 14 male) for editorial casting. Each model has a headshot URL,
 * physical description metadata, and a unique name.
 *
 * Query params:
 *   ?gender=female|male  — filter by gender (optional, returns all if omitted)
 *
 * Response: { models: AimilyModel[] }
 */
export async function GET(req: Request) {
  const { error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const gender = searchParams.get('gender');

  let query = supabaseAdmin
    .from('aimily_models')
    .select('id, name, gender, headshot_url, complexion, hair_style, hair_color, age_range, ethnicity, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (gender === 'female' || gender === 'male') {
    query = query.eq('gender', gender);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ models: data || [] });
}
