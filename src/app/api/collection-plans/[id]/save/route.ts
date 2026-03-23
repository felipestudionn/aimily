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

    // Update the collection plan with the user_id
    const { data, error } = await supabaseAdmin
      .from('collection_plans')
      .update({
        user_id: user.id,
        updated_at: new Date().toISOString()
      })
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
