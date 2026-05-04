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

const BASE = 'https://www.aimily.app';

// Build-time timestamp. Honest signal — when MDX content lands per page
// we'll switch to per-page lastmod from frontmatter.
const LASTMOD = new Date().toISOString();

type MarketingPath = {
  path: string; // path AFTER the locale segment, e.g. '' for home or '/contact'
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

const MARKETING_PATHS: MarketingPath[] = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/trust', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_PATHS.flatMap(({ path, changeFrequency, priority }) => {
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
