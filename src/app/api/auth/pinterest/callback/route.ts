import { NextRequest, NextResponse } from 'next/server';

/**
 * Pinterest OAuth callback handler
 * This endpoint receives the authorization code from Pinterest
 * and exchanges it for an access token
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') || '';

  // Extract return path from state (format: "random_return_/path/to/page")
  const returnMatch = state.match(/_return_(.+)$/);
  const returnPath = returnMatch ? decodeURIComponent(returnMatch[1]) : '/creative-space';

  if (error) {
    return NextResponse.redirect(
      new URL(`${returnPath}?error=${error}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${returnPath}?error=no_code`, req.url)
    );
  }

  try {
    const redirectUri = process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/pinterest/callback`;
    const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID || '';
    const clientSecret = process.env.PINTEREST_CLIENT_SECRET || '';
    
    
    // Pinterest API v5 requires Basic Auth header for token exchange
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const responseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error('Pinterest token exchange failed:', responseText);
      return NextResponse.redirect(
        new URL(`${returnPath}?error=token_exchange_failed&details=${encodeURIComponent(responseText.substring(0, 100))}`, req.url)
      );
    }

    const tokenData = JSON.parse(responseText);

    // Return an HTML page that notifies the opener window and closes itself
    // This supports popup-based OAuth without leaving the parent page
    // In PWA standalone mode, window.opener is null, so we redirect directly
    // targetOrigin '*' — necessary because aimily.app vs www.aimily.app
    // host mismatch otherwise rejects the postMessage. The payload is a
    // harmless flag (no token or PII), the cookie is httpOnly + sameSite.
    const html = `<!DOCTYPE html><html><head><title>Pinterest Connected</title></head><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'pinterest_connected' }, '*');
    window.close();
  } else {
    window.location.href = '${returnPath}?pinterest_connected=true';
  }
</script>
<p>Connecting Pinterest... You can close this window.</p>
</body></html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

    // Set secure cookie with token. Domain '.aimily.app' is critical:
    // the callback may run on either aimily.app or www.aimily.app
    // (depends on NEXT_PUBLIC_PINTEREST_REDIRECT_URI). Without the
    // leading-dot domain, the cookie is host-only and the user's
    // tab at the OTHER host can't read it, so /api/pinterest/boards
    // keeps returning 401 even after successful OAuth.
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('pinterest_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
      // In production, share across all aimily.app subdomains. In dev,
      // omit so localhost works without a domain attr.
      ...(isProd ? { domain: '.aimily.app' } : {}),
    });

    return response;
  } catch (error) {
    console.error('Pinterest OAuth error:', error);
    const html = `<!DOCTYPE html><html><head><title>Pinterest Error</title></head><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'pinterest_error' }, '*');
    window.close();
  } else {
    window.location.href = '${returnPath}?error=auth_failed';
  }
</script>
<p>Authentication failed. You can close this window.</p>
</body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
