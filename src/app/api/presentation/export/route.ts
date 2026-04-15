/* ═══════════════════════════════════════════════════════════════════
   POST /api/presentation/export

   Vercel Function that launches headless Chrome (puppeteer-core +
   @sparticuz/chromium-min) against the internal /presentation/export/[id]
   route and returns a PDF blob. One page per slide, A4 landscape.

   Runs on Fluid Compute (Node.js runtime). Cold start ~1s, warm ~500ms.
   ═══════════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { signExportToken } from '@/lib/presentation/export-token';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ExportBody {
  collectionId: string;
  themeId?: string;
  coverSubtitle?: string;
}

/* URL of the running app — used by headless Chrome to render the
   internal export route. Must be the PUBLIC-facing domain (e.g.
   www.aimily.app) rather than the internal *.vercel.app, because
   Vercel Deployment Protection gates internal URLs behind a Vercel
   login which the headless browser can't pass. */
function getBaseUrl(req: NextRequest): string {
  // Priority: incoming request origin (the exact host the client
  // used — guaranteed unprotected since the user just hit it) →
  // NEXT_PUBLIC_SITE_URL (if explicitly set) → VERCEL_URL (last
  // resort, may be protected).
  const origin = req.nextUrl.origin;
  if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, '');
  if (origin) return origin.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

/* Chromium binary URL for @sparticuz/chromium-min. Set this in env
   to pin a version (per Vercel docs); the default downloads the
   bundled binary tarball on cold start. */
const CHROMIUM_TARBALL =
  process.env.CHROMIUM_TARBALL_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  let body: ExportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { collectionId, themeId = 'editorial-heritage', coverSubtitle } = body;
  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
  }

  const check = await verifyCollectionOwnership(user!.id, collectionId);
  if (!check.authorized) return check.error;

  // Sign a short-lived token the export route will validate
  const token = signExportToken({ collectionId, userId: user!.id, themeId });
  const baseUrl = getBaseUrl(req);
  const exportUrl =
    `${baseUrl}/presentation/export/${collectionId}` +
    `?token=${encodeURIComponent(token)}` +
    `&theme=${encodeURIComponent(themeId)}` +
    (coverSubtitle ? `&subtitle=${encodeURIComponent(coverSubtitle)}` : '');

  // Dynamic imports so the Chromium binary isn't pulled into other bundles
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
  const puppeteer = (puppeteerMod.default ?? puppeteerMod) as { launch: (opts: Record<string, unknown>) => Promise<{ newPage: () => Promise<{ goto: (url: string, opts: unknown) => Promise<void>; pdf: (opts: unknown) => Promise<Buffer>; setViewport: (opts: unknown) => Promise<void> }>; close: () => Promise<void> }> };

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
    await page.setViewport({ width: 1600, height: 1131 }); // A4 landscape @ ~137 dpi
    await page.goto(exportUrl, { waitUntil: 'networkidle0', timeout: 45_000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });

    const filename = `presentation-${collectionId.slice(0, 8)}-${Date.now()}.pdf`;
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[api/presentation/export] failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF export failed' },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
