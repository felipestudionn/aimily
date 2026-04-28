#!/usr/bin/env tsx
/**
 * Verify that observability is configured at the HTTP level.
 *
 * Note: this only checks server-side configuration (CSP headers, OG tags,
 * route availability). The SDKs themselves load dynamically via useEffect,
 * so verifying init requires a real browser. Run a Playwright session
 * against /meet-aimily and check window.posthog + Sentry network requests
 * to confirm the SDKs are alive.
 *
 * Usage: tsx scripts/verify-observability.ts [BASE_URL]
 */

const BASE = process.argv[2] || 'https://www.aimily.app';

async function main() {
  console.log(`\n🔍 Observability HTTP-level verification — ${BASE}\n`);

  const res = await fetch(`${BASE}/meet-aimily`);
  const html = await res.text();
  const csp = res.headers.get('content-security-policy') || '';

  const checks = [
    {
      name: 'CSP allows worker-src blob: (PostHog Session Replay)',
      ok: csp.includes("worker-src 'self' blob:"),
      detail: csp.includes('worker-src') ? 'present' : 'missing',
    },
    {
      name: 'CSP connect-src allows Sentry EU ingest',
      ok: csp.includes('ingest.de.sentry.io'),
      detail: csp.includes('ingest.de.sentry.io') ? 'present' : 'missing',
    },
    {
      name: 'CSP connect-src allows PostHog EU ingest',
      ok: csp.includes('eu.i.posthog.com'),
      detail: csp.includes('eu.i.posthog.com') ? 'present' : 'missing',
    },
    {
      name: 'OG title set for social previews',
      ok: html.includes('Miranda would have hired'),
      detail: html.match(/<meta\s+property="og:title"[^>]*content="([^"]+)"/)?.[1] || 'missing',
    },
    {
      name: 'OG image set for social previews',
      ok: /og:image/i.test(html),
      detail: html.match(/<meta\s+property="og:image"[^>]*content="([^"]+)"/)?.[1] || 'missing',
    },
    {
      name: 'Twitter card set',
      ok: /twitter:card/i.test(html),
      detail: html.match(/<meta\s+name="twitter:card"[^>]*content="([^"]+)"/)?.[1] || 'missing',
    },
    {
      name: 'robots.txt available',
      ok: (await fetch(`${BASE}/robots.txt`)).ok,
      detail: 'GET /robots.txt',
    },
  ];

  let failures = 0;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '❌';
    console.log(`${icon} ${c.name}`);
    console.log(`     → ${c.detail}`);
    if (!c.ok) failures++;
  }

  console.log(`\n${checks.length - failures}/${checks.length} HTTP-level checks passed`);
  console.log('\n💡 To verify the SDKs are actually transmitting events, run a real browser session');
  console.log('   against /meet-aimily and inspect network requests to ingest.de.sentry.io and');
  console.log('   eu.i.posthog.com (both should return 200).\n');

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
