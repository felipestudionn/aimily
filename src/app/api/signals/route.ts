import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location') || 'Shoreditch';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const { data, error } = await supabaseAdmin
    .from('signals')
    .select('*')
    .eq('location', location)
    .order('composite_score', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 },
    );
  }

  return NextResponse.json({ signals: data });
}
