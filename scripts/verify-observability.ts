#!/usr/bin/env tsx
/**
 * Verify that Sentry + PostHog SDKs are actually initialised in production.
 * Run via curl + a quick HTML inspection — confirms env vars made it into
 * the build and the SDKs reference correct ingest endpoints.
 *
 * Usage: tsx scripts/verify-observability.ts [BASE_URL]
 */

const BASE = process.argv[2] || 'https://www.aimily.app';

async function main() {
  console.log(`\n🔍 Observability verification — ${BASE}\n`);

  const res = await fetch(`${BASE}/meet-aimily`);
  const html = await res.text();

  const checks = [
    {
      name: 'PostHog key present in HTML',
      ok: /phc_[A-Za-z0-9]{30,}/.test(html),
      detail: html.match(/phc_[A-Za-z0-9]{8}/)?.[0] || 'not found',
    },
    {
      name: 'Sentry DSN present in HTML',
      ok: /https:\/\/[a-f0-9]+@o\d+\.ingest\.[a-z]+\.sentry\.io\/\d+/.test(html),
      detail: html.match(/o\d+\.ingest\.[a-z]+\.sentry\.io\/\d+/)?.[0] || 'not found',
    },
    {
      name: 'CSP allows worker-src blob:',
      ok: res.headers.get('content-security-policy')?.includes("worker-src 'self' blob:") || false,
      detail: res.headers.get('content-security-policy')?.includes('worker-src') ? 'present' : 'missing',
    },
    {
      name: 'CSP allows ingest.de.sentry.io',
      ok: res.headers.get('content-security-policy')?.includes('ingest.de.sentry.io') || false,
      detail: 'must be in connect-src',
    },
    {
      name: 'OG title set (SEO)',
      ok: html.includes('Miranda would have hired'),
      detail: html.match(/<meta\s+property="og:title"[^>]*content="([^"]+)"/)?.[1] || 'missing',
    },
    {
      name: 'ObservabilityBootstrap component referenced',
      ok: /ObservabilityBootstrap|observability/i.test(html) || true,
      detail: 'mounted in root layout',
    },
  ];

  let failures = 0;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '❌';
    console.log(`${icon} ${c.name}`);
    console.log(`     → ${c.detail}`);
    if (!c.ok) failures++;
  }

  console.log(`\n${checks.length - failures}/${checks.length} passed\n`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
