/* ═══════════════════════════════════════════════════════════════════
   /[locale]/vs/[competitor] — comparison pages.

   Wave 1 ships 4 comparisons against the dominant fashion PLMs:
   - centric         (Centric Software)
   - ptc-flexplm     (PTC FlexPLM)
   - bamboo-rose     (Bamboo Rose)
   - backbone-plm    (Backbone PLM)

   MDX with frontmatter.comparison.rows drives a side-by-side table
   that's both visible to users and emitted as ItemList JSON-LD for
   GEO citation.

   Reference: SEO-GEO-STRATEGY §4.5.
   ═══════════════════════════════════════════════════════════════════ */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { ArrowRight } from 'lucide-react';
import { routing } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n/config';
import { loadEntry, listEntries } from '@/lib/content/loader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import {
  faqPageSchema,
  breadcrumbSchema,
  comparisonItemListSchema,
  articleSchema,
  jsonLdScript,
} from '@/lib/schema/aimily';

const BASE = 'https://www.aimily.app';

export async function generateStaticParams() {
  const entries = await listEntries('vs');
  return entries.map(({ slug, locale }) => ({ competitor: slug, locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; competitor: string }>;
}): Promise<Metadata> {
  const { locale, competitor } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const entry = await loadEntry('vs', competitor, locale as Locale);
  if (!entry) notFound();

  const languages = Object.fromEntries(
    locales.map((l) => [l, `${BASE}/${l}/vs/${competitor}`]),
  );
  languages['x-default'] = `${BASE}/en/vs/${competitor}`;

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: {
      canonical: `${BASE}/${locale}/vs/${competitor}`,
      languages,
    },
    openGraph: {
      title: entry.frontmatter.title,
      description: entry.frontmatter.description,
      url: `${BASE}/${locale}/vs/${competitor}`,
      type: 'article',
    },
    robots: entry.fallback ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ locale: string; competitor: string }>;
}) {
  const { locale, competitor } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const entry = await loadEntry('vs', competitor, locale as Locale);
  if (!entry) notFound();

  const url = `${BASE}/${locale}/vs/${competitor}`;
  const fm = entry.frontmatter;
  const cmp = fm.comparison;

  const breadcrumbs = breadcrumbSchema([
    { name: 'aimily', url: `${BASE}/${locale}` },
    { name: 'Compare', url: `${BASE}/${locale}/vs` },
    { name: cmp?.competitor ?? competitor, url },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            articleSchema({
              headline: fm.title,
              description: fm.description,
              url,
              datePublished: fm.updated,
              dateModified: fm.updated,
              inLanguage: locale,
            }),
          ),
        }}
      />
      {cmp && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              comparisonItemListSchema({
                name: fm.title,
                competitorName: cmp.competitor,
                url,
              }),
            ),
          }}
        />
      )}
      {fm.faq && fm.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageSchema(fm.faq)) }}
        />
      )}

      <article className="bg-carbon text-crema min-h-screen">
        <header className="px-6 pt-32 pb-16 md:pt-40 md:pb-20 max-w-3xl mx-auto">
          <p
            className="font-display text-[22px] md:text-[28px] italic text-crema/70 leading-snug mb-8"
            style={{ fontFamily: 'var(--font-display), serif' }}
          >
            {fm.hero}
          </p>
          <h1 className="font-display text-[40px] md:text-[64px] leading-[1.05] tracking-[-0.02em] mb-10">
            {fm.title}
          </h1>
          <p className="text-[18px] md:text-[20px] leading-relaxed text-crema/85 max-w-2xl">
            {fm.lead}
          </p>
        </header>

        {cmp && cmp.rows.length > 0 && (
          <section className="px-6 pb-16 max-w-5xl mx-auto">
            <div className="overflow-x-auto rounded-xl border border-crema/10">
              <table className="w-full text-[14px] md:text-[15px]">
                <thead className="bg-crema/5">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-crema/70">Capability</th>
                    <th className="text-left px-4 py-3 font-semibold text-crema/70">{cmp.competitor}</th>
                    <th className="text-left px-4 py-3 font-semibold text-crema">aimily</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((row, i) => (
                    <tr
                      key={`${row.feature}-${i}`}
                      className={i % 2 === 0 ? 'bg-transparent' : 'bg-crema/[0.02]'}
                    >
                      <td className="px-4 py-3 text-crema/90 align-top">{row.feature}</td>
                      <td className="px-4 py-3 text-crema/70 align-top">{row.competitor}</td>
                      <td className="px-4 py-3 text-crema align-top">{row.aimily}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cmp.competitorUrl && (
              <p className="text-crema/50 text-[13px] mt-4">
                Competitor data sourced from public materials including{' '}
                <a
                  href={cmp.competitorUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-crema/80"
                >
                  {cmp.competitor}
                </a>
                , vendor press releases, G2 / Capterra reviews, and SelectHub.
                Last verified: {fm.updated}.
              </p>
            )}
          </section>
        )}

        <section className="px-6 pb-24 max-w-3xl mx-auto prose prose-invert prose-lg">
          <MDXRemote source={entry.body} />
        </section>

        {fm.faq && fm.faq.length > 0 && (
          <section className="px-6 pb-24 max-w-3xl mx-auto">
            <h2 className="font-display text-[32px] md:text-[44px] mb-10 text-crema">Questions</h2>
            <div className="space-y-8">
              {fm.faq.map((q) => (
                <div key={q.q} className="border-b border-crema/10 pb-8">
                  <h3 className="text-[18px] font-semibold mb-3 text-crema">{q.q}</h3>
                  <p className="text-[16px] leading-relaxed text-crema/80">{q.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="px-6 pb-24 max-w-3xl mx-auto">
          <Link
            href={`/${locale}#pricing`}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-crema text-carbon text-[14px] font-semibold tracking-[-0.01em] hover:bg-crema/90 transition-all"
          >
            Try aimily free — 14 days
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-crema/60 text-[13px] mt-4">No credit card required.</p>
        </section>

        {fm.related && fm.related.length > 0 && (
          <section className="px-6 pb-24 max-w-3xl mx-auto">
            <h2 className="text-[14px] uppercase tracking-[0.18em] text-crema/50 mb-6">Related</h2>
            <ul className="space-y-3">
              {fm.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="text-crema/85 hover:text-crema underline-offset-4 hover:underline">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SiteFooter />
      </article>
    </>
  );
}
