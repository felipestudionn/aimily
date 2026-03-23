import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', '10.', '172.16.', '192.168.'];

/**
 * Proxy for fetching external images (Pinterest, etc.)
 * Converts them to base64 to avoid CORS issues.
 * Protected: auth required, size-limited, SSRF-blocked.
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid image URL — HTTPS required' }, { status: 400 });
    }

    // Block internal/private network requests (SSRF protection)
    const url = new URL(imageUrl);
    if (BLOCKED_HOSTS.some((h) => url.hostname === h || url.hostname.startsWith(h))) {
      return NextResponse.json({ error: 'Blocked host' }, { status: 400 });
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AimilyBot/1.0)' },
      signal: controller.signal,
      redirect: 'error', // Don't follow redirects (prevents SSRF via redirect)
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    // Check content length before downloading
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({ base64, mimeType: contentType });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
