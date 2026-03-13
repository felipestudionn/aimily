import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies Pinterest images through our server to avoid CDN hotlink protection.
 * Pinterest's CDN (i.pinimg.com) serves degraded/striped images when loaded
 * from external domains. This proxy fetches server-side with no referrer.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url || !url.includes('pinimg.com')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Aimily/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
