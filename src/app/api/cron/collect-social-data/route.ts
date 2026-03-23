import { NextRequest, NextResponse } from 'next/server';

// This cron orchestrates all data collection
// Calls each collector sequentially to avoid timeout

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!process.env.CRON_SECRET && !!authHeader && authHeader === expected;
}

async function callEndpoint(path: string, secret: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET || '';
  const results: Record<string, unknown> = {};


  // Call Instagram collectors sequentially
  results.instagram1 = await callEndpoint('/api/cron/collect-instagram', secret);
  
  results.instagram2 = await callEndpoint('/api/cron/collect-instagram-2', secret);
  
  results.instagram3 = await callEndpoint('/api/cron/collect-instagram-3', secret);
  
  // Call TikTok collector
  results.tiktok = await callEndpoint('/api/cron/collect-tiktok', secret);


  return NextResponse.json({
    success: true,
    message: 'Social data collection orchestration completed',
    results,
    timestamp: new Date().toISOString(),
  });
}
