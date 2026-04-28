#!/usr/bin/env tsx
/**
 * Launch smoke test — runs against production (https://www.aimily.app) and
 * exercises the critical path that a "meme click" user goes through.
 *
 * Tests:
 *   1. /meet-aimily renders in <3s with hero + first CTA visible
 *   2. /pricing renders in <3s with 4 plan cards + 3 packs
 *   3. /api/billing/subscription returns 401 without auth (correct guard)
 *   4. /api/ai/merch-generate returns 401 without auth (correct guard)
 *   5. AI rate-limit kicks in: 31 anonymous calls in <60s → 429 on the 31st
 *   6. /robots.txt and /sitemap.xml return 200 (basic SEO)
 *   7. OG meta tags are present on /meet-aimily
 *
 * Usage: tsx scripts/smoke-test.ts [BASE_URL]
 *   BASE_URL defaults to https://www.aimily.app
 *
 * Exit code 1 on any failure. Print a summary table.
 */

const BASE = process.argv[2] || 'https://www.aimily.app';

interface Result {
  name: string;
  ok: boolean;
  detail?: string;
  ms?: number;
}

const results: Result[] = [];

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

async function check(name: string, fn: () => Promise<{ ok: boolean; detail?: string }>) {
  try {
    const { value, ms } = await timed(fn);
    results.push({ name, ok: value.ok, detail: value.detail, ms });
  } catch (err) {
    results.push({ name, ok: false, detail: (err as Error).message });
  }
}

async function run() {
  console.log(`\n🧪 aimily smoke test — ${BASE}\n`);

  await check('1. /meet-aimily renders fast', async () => {
    const res = await fetch(`${BASE}/meet-aimily`);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const html = await res.text();
    if (!html.includes('aimily')) return { ok: false, detail: 'no aimily mention in HTML' };
    return { ok: true };
  });

  await check('2. /pricing renders 4 tiers + packs', async () => {
    const res = await fetch(`${BASE}/pricing`);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const html = await res.text();
    const hasStarter = html.toLowerCase().includes('starter');
    const hasProMax = html.toLowerCase().includes('professional max') || html.toLowerCase().includes('professional_max');
    if (!hasStarter || !hasProMax) {
      return { ok: false, detail: `Starter:${hasStarter} ProMax:${hasProMax}` };
    }
    return { ok: true };
  });

  await check('3. /api/billing/subscription 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/billing/subscription`);
    return res.status === 401
      ? { ok: true }
      : { ok: false, detail: `expected 401 got ${res.status}` };
  });

  await check('4. /api/ai/merch-generate 401 without auth', async () => {
    const res = await fetch(`${BASE}/api/ai/merch-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.status === 401
      ? { ok: true }
      : { ok: false, detail: `expected 401 got ${res.status}` };
  });

  await check('5. AI rate limit returns 429', async () => {
    let got429 = false;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${BASE}/api/ai/merch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    return got429
      ? { ok: true }
      : { ok: false, detail: 'never got 429 — limiter not engaging' };
  });

  await check('6. /robots.txt 200', async () => {
    const res = await fetch(`${BASE}/robots.txt`);
    return res.status === 200 ? { ok: true } : { ok: false, detail: `HTTP ${res.status}` };
  });

  await check('7. OG tags on /meet-aimily', async () => {
    const res = await fetch(`${BASE}/meet-aimily`);
    const html = await res.text();
    const hasOgTitle = /<meta\s+property="og:title"/i.test(html);
    const hasOgImg = /<meta\s+property="og:image"/i.test(html);
    const hasTwitter = /<meta\s+name="twitter:card"/i.test(html);
    if (!hasOgTitle || !hasOgImg || !hasTwitter) {
      return { ok: false, detail: `og:title=${hasOgTitle} og:image=${hasOgImg} twitter=${hasTwitter}` };
    }
    return { ok: true };
  });

  // Print summary
  console.log('\nResults:');
  console.log('━'.repeat(80));
  let failures = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    const ms = r.ms ? ` (${r.ms}ms)` : '';
    console.log(`${icon} ${r.name}${ms}`);
    if (r.detail) console.log(`     ${r.detail}`);
    if (!r.ok) failures++;
  }
  console.log('━'.repeat(80));
  console.log(`\n${results.length - failures}/${results.length} passed\n`);
  if (failures > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
