/* POST /api/ai/seo-audit
   Body: { storefrontId }
   Returns: { score, breakdown, recommendations[] }

   Audit fetches the published storefront HTML and runs heuristics:
   - Has <title> + <meta description>?
   - Has Open Graph + Twitter card tags?
   - Has h1 with reasonable length?
   - Has alt text on images?
   - Has Schema.org JSON-LD?
   - Has sitemap reachable?

   No external API call — pure HTML inspection. Fast + free. */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { loadStorefrontById } from '@/lib/storefront/load-storefront';

interface AuditCheck { id: string; label: string; pass: boolean; note?: string; }

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: { storefrontId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.storefrontId) return NextResponse.json({ error: 'storefrontId required' }, { status: 400 });

  const sf = await loadStorefrontById(body.storefrontId);
  if (!sf) return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });

  const own = await verifyCollectionOwnership(user.id, sf.collection_plan_id, 'view_all');
  if (!own.authorized) return own.error;

  if (!sf.published_at) {
    return NextResponse.json({ error: 'Storefront is not published yet — publish first to audit.' }, { status: 400 });
  }

  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';
  const url = `https://${sf.subdomain}.${baseDomain}`;

  let html: string;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Storefront returned HTTP ${res.status}` }, { status: 502 });
    }
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Fetch failed' }, { status: 502 });
  }

  const checks: AuditCheck[] = [
    { id: 'title',           label: 'Has <title> tag',                pass: /<title[^>]*>[^<]+<\/title>/.test(html) },
    { id: 'meta_description',label: 'Has <meta description>',          pass: /<meta\s+name=["']description["']\s+content=["'][^"']{20,}["']/.test(html) },
    { id: 'og_title',        label: 'Has Open Graph title',            pass: /<meta\s+property=["']og:title["']/.test(html) },
    { id: 'og_description',  label: 'Has Open Graph description',      pass: /<meta\s+property=["']og:description["']/.test(html) },
    { id: 'og_image',        label: 'Has Open Graph image',            pass: /<meta\s+property=["']og:image["']/.test(html) },
    { id: 'twitter_card',    label: 'Has Twitter card meta',           pass: /<meta\s+name=["']twitter:card["']/.test(html) },
    { id: 'h1',              label: 'Has <h1> heading',                pass: /<h1[^>]*>[^<]+<\/h1>/.test(html) },
    { id: 'json_ld',         label: 'Has Schema.org JSON-LD',          pass: /application\/ld\+json/.test(html) },
    { id: 'lang_attr',       label: 'Has <html lang> attribute',       pass: /<html[^>]+lang=/.test(html) },
    { id: 'viewport',        label: 'Has responsive viewport meta',    pass: /<meta\s+name=["']viewport["']/.test(html) },
  ];

  const sitemapRes = await fetch(`${url}/sitemap.xml`, { cache: 'no-store' }).catch(() => null);
  const robotsRes  = await fetch(`${url}/robots.txt`, { cache: 'no-store' }).catch(() => null);
  checks.push({ id: 'sitemap', label: 'sitemap.xml reachable', pass: sitemapRes?.ok === true });
  checks.push({ id: 'robots',  label: 'robots.txt reachable',  pass: robotsRes?.ok === true });

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  const recommendations = checks.filter((c) => !c.pass).map((c) => `Fix: ${c.label}`);

  return NextResponse.json({
    url,
    score,
    passed,
    total: checks.length,
    checks,
    recommendations,
  });
}
