/* Storefront sitemap.xml — generated per-host */
import { NextResponse } from 'next/server';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadStorefrontData, StorefrontDataMissingError } from '@/lib/storefront/load-storefront-data';

interface Ctx { params: Promise<{ host: string }>; }

export async function GET(_: Request, ctx: Ctx) {
  const { host } = await ctx.params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) return new NextResponse('Not found', { status: 404 });

  let data;
  try {
    data = await loadStorefrontData(storefront);
  } catch (e) {
    if (e instanceof StorefrontDataMissingError) {
      return new NextResponse('Storefront data incomplete', { status: 404 });
    }
    throw e;
  }

  const base = `https://${host}`;
  const lastmod = (storefront.last_built_at ?? storefront.published_at ?? new Date().toISOString()).slice(0, 10);

  const urls = [
    `${base}/`,
    `${base}/shop`,
    `${base}/lookbook`,
    `${base}/about`,
    `${base}/contact`,
    ...data.skus.map((s) => `${base}/shop/${s.id}`),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n') +
    `\n</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
