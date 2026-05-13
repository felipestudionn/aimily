import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadSubscriptionForUser } from '@/lib/billing/load-subscription';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await loadSubscriptionForUser(user.id, user.email);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
