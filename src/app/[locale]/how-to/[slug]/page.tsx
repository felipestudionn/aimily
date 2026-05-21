/* ═══════════════════════════════════════════════════════════════════
   /[locale]/how-to/[slug] — high-intent commercial pillar pages.

   Targets bottom-funnel keywords like "how to create a fashion
   collection", "how to launch a fashion collection", "start a
   fashion brand", "design a clothing line" — and their native-locale
   variants across EN, ES, FR, IT, DE, PT, NL, NO, SV.

   Same render machinery as /workflows/[slug] (MDX + HowTo + FAQ
   + breadcrumb + alternates). The four pillars cross-link into the
   four /workflows/ pages so the high-intent visitor lands on the
   exact block of the product they need next.

   Reference: SEO-GEO-STRATEGY §4.4 (Learn cluster, accelerated for
   commercial intent).
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
  howToSchema,
  breadcrumbSchema,
  articleSchema,
  jsonLdScript,
} from '@/lib/schema/aimily';

const BASE = 'https://www.aimily.app';

export async function generateStaticParams() {
  const entries = await listEntries('how-to');
  return entries.map(({ slug, locale }) => ({ slug, locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const entry = await loadEntry('how-to', slug, locale as Locale);
  if (!entry) notFound();

  const languages = Object.fromEntries(
    locales.map((l) => [l, `${BASE}/${l}/how-to/${slug}`]),
  );
  languages['x-default'] = `${BASE}/en/how-to/${slug}`;

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: {
      canonical: `${BASE}/${locale}/how-to/${slug}`,
      languages,
    },
    openGraph: {
      title: entry.frontmatter.title,
      description: entry.frontmatter.description,
      url: `${BASE}/${locale}/how-to/${slug}`,
      type: 'article',
    },
    robots: entry.fallback ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function HowToPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const entry = await loadEntry('how-to', slug, locale as Locale);
  if (!entry) notFound();

  const url = `${BASE}/${locale}/how-to/${slug}`;
  const fm = entry.frontmatter;

  const breadcrumbs = breadcrumbSchema([
    { name: 'aimily', url: `${BASE}/${locale}` },
    { name: 'How to', url: `${BASE}/${locale}/how-to` },
    { name: fm.title, url },
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
      {fm.howTo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              howToSchema({
                name: fm.howTo.name,
                description: fm.howTo.description,
                totalTime: fm.howTo.totalTime,
                steps: fm.howTo.steps,
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
          <p className="text-[22px] md:text-[28px] font-light text-crema/80 leading-snug mb-8 tracking-[-0.01em]">
            {fm.hero}
          </p>
          <h1 className="font-display text-[40px] md:text-[64px] leading-[1.05] tracking-[-0.02em] mb-10">
            {fm.title}
          </h1>
          <p className="text-[18px] md:text-[20px] leading-relaxed text-crema/85 max-w-2xl">
            {fm.lead}
          </p>
        </header>

        <section className="px-6 pb-24 max-w-3xl mx-auto prose prose-invert prose-lg">
          <MDXRemote source={entry.body} />
        </section>

        {fm.faq && fm.faq.length > 0 && (
          <section className="px-6 pb-24 max-w-3xl mx-auto">
            <h2 className="font-display text-[32px] md:text-[44px] mb-10 text-crema">
              Questions
            </h2>
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
            Try aimily free — 30 days
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-crema/60 text-[13px] mt-4">No credit card required.</p>
        </section>

        {fm.related && fm.related.length > 0 && (
          <section className="px-6 pb-24 max-w-3xl mx-auto">
            <h2 className="text-[14px] uppercase tracking-[0.18em] text-crema/50 mb-6">
              Related
            </h2>
            <ul className="space-y-3">
              {fm.related.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="text-crema/85 hover:text-crema underline-offset-4 hover:underline"
                  >
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
