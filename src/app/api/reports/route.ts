import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .order('report_date', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 },
    );
  }

  return NextResponse.json({ reports: data });
}
