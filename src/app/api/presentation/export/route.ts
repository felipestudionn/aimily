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
import { detectBrandNames, buildBrandNamesWarningHeader } from '@/lib/brand-name-detector';
import { loadPresentationData } from '@/lib/presentation/load-presentation-data';

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
    await page.setViewport({ width: 1600, height: 1131 }); // A4 landscape @ ~137 dpi
    await page.goto(exportUrl, { waitUntil: 'networkidle0', timeout: 45_000 });

    // If the internal /presentation/export/[id] route threw server-side,
    // Next.js renders an error page ("Application error: a server-side
    // exception has occurred…"). Puppeteer would happily snapshot that
    // into a 2-page PDF and the API would return 200 with garbage. Detect
    // it explicitly and surface the digest + body text so the client gets
    // an actionable 500 instead of a corrupt PDF.
    const pageState = await (page as unknown as { evaluate: <T>(fn: () => T) => Promise<T> }).evaluate(() => {
      const body = document.body?.innerText ?? '';
      const slideCount = document.querySelectorAll('.pdf-slide').length;
      return { body: body.slice(0, 1500), slideCount };
    });
    if (pageState.slideCount === 0 || /server-side exception/i.test(pageState.body)) {
      console.error('[api/presentation/export] internal route did not render slides:', pageState);
      return NextResponse.json(
        {
          error: 'Internal export page failed to render',
          slideCount: pageState.slideCount,
          bodyExcerpt: pageState.body,
          exportUrl: exportUrl.replace(/token=[^&]+/, 'token=…'),
        },
        { status: 500 },
      );
    }

    // Wait for Google Fonts to finish downloading + parsing before
    // snapshotting — without this, Chromium may emit the PDF with
    // generic serif/sans fallbacks instead of Playfair, Archivo Black,
    // etc.
    await page.evaluate(() =>
      typeof document !== 'undefined' && 'fonts' in document
        ? (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready.then(() => undefined)
        : undefined,
    );

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });

    const filename = `presentation-${collectionId.slice(0, 8)}-${Date.now()}.pdf`;
    /* Sanity-scan the deck for third-party brand mentions and surface
       hits via a non-blocking response header. The legal disclaimer
       on the cover slide covers us, but the header lets the UI nudge
       the user "you mentioned Nike, Vinted, Veja — soften the
       phrasing if you don't want to read as endorsement". */
    let brandWarning: string | null = null;
    try {
      const deckData = await loadPresentationData(collectionId);
      brandWarning = buildBrandNamesWarningHeader(detectBrandNames(deckData));
    } catch (err) {
      console.warn('[api/presentation/export] brand-name scan failed (non-blocking):', err);
    }
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    };
    if (brandWarning) {
      responseHeaders['X-Brand-Names-Detected'] = brandWarning;
      responseHeaders['Access-Control-Expose-Headers'] = 'X-Brand-Names-Detected';
    }
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: responseHeaders,
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
