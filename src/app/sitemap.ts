/* ═══════════════════════════════════════════════════════════════════
   sitemap.xml — N marketing paths × 9 locales, with hreflang
   alternates per entry so Google can discover all language versions
   from a single sitemap.

   Spec: https://www.sitemaps.org/protocol.html (xhtml:link tags via
   the `alternates.languages` shape Next.js renders for us).

   Reference: SEO-GEO-STRATEGY §3.3.6.

   Wave 0 covers home + 5 legal pages = 6 paths × 9 locales = 54 URLs.
   Wave 1 will append /workflows/{4 slugs} and /vs/{competitors}.
   Wave 2 adds /for/{role}, Wave 3 adds /learn/{slug}.
   ═══════════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { listEntries } from '@/lib/content/loader';

const BASE = 'https://www.aimily.app';

// Build-time timestamp for static pages. Per-page lastmod comes from MDX
// frontmatter for content-driven pages.
const LASTMOD = new Date().toISOString();

type MarketingPath = {
  path: string; // path AFTER the locale segment, e.g. '' for home or '/contact'
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

const STATIC_PATHS: MarketingPath[] = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/trust', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
];

function staticEntries(): MetadataRoute.Sitemap {
  return STATIC_PATHS.flatMap(({ path, changeFrequency, priority }) => {
    const languages: Record<string, string> = Object.fromEntries(
      locales.map((l) => [l, `${BASE}/${l}${path}`]),
    );
    languages['x-default'] = `${BASE}/en${path}`;

    return locales.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: LASTMOD,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}

async function contentEntries(
  type: 'workflows' | 'vs',
  pathPrefix: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): Promise<MetadataRoute.Sitemap> {
  const entries = await listEntries(type);
  // Group by slug → { slug: [locale, locale, ...] }
  const bySlug = new Map<string, string[]>();
  for (const { slug, locale } of entries) {
    const arr = bySlug.get(slug) ?? [];
    arr.push(locale);
    bySlug.set(slug, arr);
  }

  const out: MetadataRoute.Sitemap = [];
  bySlug.forEach((availableLocales, slug) => {
    const languages: Record<string, string> = Object.fromEntries(
      availableLocales.map((l: string) => [l, `${BASE}/${l}${pathPrefix}/${slug}`]),
    );
    languages['x-default'] = `${BASE}/en${pathPrefix}/${slug}`;

    for (const locale of availableLocales) {
      out.push({
        url: `${BASE}/${locale}${pathPrefix}/${slug}`,
        lastModified: LASTMOD,
        changeFrequency,
        priority,
        alternates: { languages },
      });
    }
  });
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [workflows, comparisons] = await Promise.all([
    contentEntries('workflows', '/workflows', 'monthly', 0.85),
    contentEntries('vs', '/vs', 'monthly', 0.8),
  ]);
  return [...staticEntries(), ...workflows, ...comparisons];
}
