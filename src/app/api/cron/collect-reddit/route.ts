import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Simple auth check for future Vercel Cron integration
function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!authHeader && authHeader === expected;
}

export async function GET(req: NextRequest) {
  // Always require auth in production. Local manual calls without a secret
  // are only permitted when NODE_ENV is not 'production'.
  if (process.env.NODE_ENV === 'production' && !verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env.CRON_SECRET && !verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // TODO: aquí irá la llamada real a Reddit. De momento creamos un dummy para probar el flujo end-to-end.

    // Insertar un raw_content de prueba
    const { data: raw, error: rawError } = await supabaseAdmin
      .from('raw_content')
      .insert({
        platform: 'reddit',
        content_id: `demo-${Date.now()}`,
        title: 'Demo Shoreditch streetwear post',
        body: 'Sample content from Reddit about Shoreditch streetwear.',
        url: 'https://reddit.com/r/fashionreps',
        author: 'demo_user',
        engagement_score: 123,
      })
      .select()
      .single();

    if (rawError) {
      console.error('Error inserting raw_content', rawError);
      throw rawError;
    }

    // Insertar una señal de prueba asociada al contenido
    const { error: signalError } = await supabaseAdmin.from('signals').insert({
      signal_name: 'Demo Shoreditch Streetwear',
      signal_type: 'style',
      location: 'Shoreditch',
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      reddit_mentions: 1,
      reddit_avg_engagement: 123,
      youtube_video_count: 0,
      youtube_total_views: 0,
      pinterest_pin_count: 0,
      pinterest_total_saves: 0,
      composite_score: 75,
      acceleration_factor: 1.2,
      platforms_present: 1,
    });

    if (signalError) {
      console.error('Error inserting signal', signalError);
      throw signalError;
    }

    return NextResponse.json({ success: true, raw_content_id: raw.id });
  } catch (error) {
    console.error('collect-reddit failed', error);
    return NextResponse.json({ error: 'collect-reddit failed' }, { status: 500 });
  }
}
