/* Storefront robots.txt — allow all + sitemap pointer */
import { NextResponse } from 'next/server';

interface Ctx { params: Promise<{ host: string }>; }

export async function GET(_: Request, ctx: Ctx) {
  const { host } = await ctx.params;
  const body =
    `User-agent: *\nAllow: /\n\nSitemap: https://${host}/sitemap.xml\n`;
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
