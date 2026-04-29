import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';

/**
 * Save/assign a collection plan to a user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const { id: planId } = await params;

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user.id, planId);
    if (!authorized) return ownerError;

    // Optional: rename / re-describe the collection from inline edits.
    // Body is optional — if absent, this just touches updated_at.
    let name: string | undefined;
    let description: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.name === 'string') {
        const trimmed = body.name.trim();
        if (trimmed.length > 0 && trimmed.length <= 120) name = trimmed;
      }
      if (typeof body?.description === 'string') description = body.description.slice(0, 600);
    } catch {
      // No body — that's fine, this becomes a touch.
    }

    const updatePayload: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;

    const { data, error } = await supabaseAdmin
      .from('collection_plans')
      .update(updatePayload)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error saving plan:', error);
      return NextResponse.json(
        { error: 'Failed to save plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: data,
      message: 'Plan saved successfully'
    });
  } catch (error) {
    console.error('Save plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
