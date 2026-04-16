/* ═══════════════════════════════════════════════════════════════════
   POST /api/tech-pack/export
   Body: { skuId }
   Launches headless Chrome, navigates to /tech-pack/export/[skuId]
   with a signed token, returns an A3-landscape PDF blob.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signTechPackToken } from '@/lib/tech-pack/export-token';

export const runtime = 'nodejs';
export const maxDuration = 60;

function getBaseUrl(req: NextRequest): string {
  const origin = req.nextUrl.origin;
  if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, '');
  if (origin) return origin.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

const CHROMIUM_TARBALL =
  process.env.CHROMIUM_TARBALL_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: { skuId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.skuId) return NextResponse.json({ error: 'Missing skuId' }, { status: 400 });

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, collection_plan_id')
    .eq('id', body.skuId)
    .maybeSingle();
  if (!sku) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id')
    .eq('id', sku.collection_plan_id)
    .maybeSingle();
  if (!plan || plan.user_id !== user!.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = signTechPackToken({
    collectionId: sku.collection_plan_id,
    userId: user!.id,
    skuId: sku.id,
  });

  const baseUrl = getBaseUrl(req);
  const exportUrl = `${baseUrl}/tech-pack/export/${sku.id}?token=${encodeURIComponent(token)}`;

  const chromiumMod = (await import('@sparticuz/chromium-min')) as unknown as {
    default?: {
      args: string[];
      defaultViewport: { width: number; height: number };
      executablePath: (tarball?: string) => Promise<string>;
    };
    args: string[];
    defaultViewport: { width: number; height: number };
    executablePath: (tarball?: string) => Promise<string>;
  };
  const chromium = chromiumMod.default ?? chromiumMod;
  const puppeteerMod = (await import('puppeteer-core')) as unknown as {
    default?: { launch: (opts: unknown) => Promise<unknown> };
    launch?: (opts: unknown) => Promise<unknown>;
  };
  const puppeteer = (puppeteerMod.default ?? puppeteerMod) as { launch: (opts: Record<string, unknown>) => Promise<{ newPage: () => Promise<{ goto: (url: string, opts: unknown) => Promise<void>; pdf: (opts: unknown) => Promise<Buffer>; setViewport: (opts: unknown) => Promise<void>; evaluate: <T>(fn: () => T | Promise<T>) => Promise<T> }>; close: () => Promise<void> }> };

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const executablePath = await chromium.executablePath(CHROMIUM_TARBALL);
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 2260 }); // A3 portrait-ish canvas
    await page.goto(exportUrl, { waitUntil: 'networkidle0', timeout: 60_000 });

    await page.evaluate(() =>
      typeof document !== 'undefined' && 'fonts' in document
        ? (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready.then(() => undefined)
        : undefined,
    );

    const pdfBuffer = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });

    const safeName = sku.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40).toLowerCase();
    const filename = `tech-pack-${safeName || sku.id.slice(0, 8)}-${Date.now()}.pdf`;
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[api/tech-pack/export] failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF export failed' },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
