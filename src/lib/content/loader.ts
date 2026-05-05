/* ═══════════════════════════════════════════════════════════════════
   Content loader — reads MDX files from /content/{type}/{slug}/{locale}.mdx,
   parses frontmatter with gray-matter, returns typed content + body.

   Used by:
   - [locale]/workflows/[slug]/page.tsx
   - [locale]/vs/[competitor]/page.tsx
   - llms-full.txt route (concatenates everything)

   Falls back to EN when the requested locale doesn't exist (with a noindex
   signal so we don't dilute SEO with duplicate content).

   Reference: SEO-GEO-STRATEGY §4.6.
   ═══════════════════════════════════════════════════════════════════ */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Locale } from '@/i18n/config';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

export type ContentType = 'workflows' | 'vs' | 'how-to';

export interface FaqItem {
  q: string;
  a: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface ComparisonRow {
  feature: string;
  competitor: string; // e.g. "✅", "❌", "⚠️ minutes", or short text
  aimily: string;
}

export interface ContentFrontmatter {
  /** Page title — appears in <title> + H1 */
  title: string;
  /** SEO meta description (≤160 chars) */
  description: string;
  /** Hero pull-quote (the "I'M THE EMILY WHO…" frase-oro for workflows;
   *  an attribution-style line for comparisons) */
  hero: string;
  /** Single-paragraph lead, 40-80 words, dense + citable */
  lead: string;
  /** Question H1 should answer (kept identical to title for now) */
  query?: string;
  /** Last updated ISO date — drives sitemap lastmod + page footer */
  updated: string;
  /** FAQ entries — feed FAQPage schema + render at end of page */
  faq?: FaqItem[];
  /** HowTo steps — feed HowTo schema (workflows only) */
  howTo?: {
    name: string;
    description: string;
    totalTime?: string; // ISO 8601 duration, e.g. "PT60M"
    steps: HowToStep[];
  };
  /** Comparison data (vs/* only) */
  comparison?: {
    competitor: string; // "Centric Software", "PTC FlexPLM"…
    competitorUrl?: string;
    rows: ComparisonRow[];
  };
  /** Related links — internal cross-cluster linking */
  related?: { href: string; label: string }[];
}

export interface ContentEntry<F extends ContentFrontmatter = ContentFrontmatter> {
  slug: string;
  locale: Locale;
  /** True when we served EN as fallback for a requested non-EN locale */
  fallback: boolean;
  frontmatter: F;
  body: string;
}

async function safeRead(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function loadEntry(
  type: ContentType,
  slug: string,
  locale: Locale,
): Promise<ContentEntry | null> {
  const localePath = path.join(CONTENT_ROOT, type, slug, `${locale}.mdx`);
  let raw = await safeRead(localePath);
  let fallback = false;

  if (!raw && locale !== 'en') {
    const enPath = path.join(CONTENT_ROOT, type, slug, 'en.mdx');
    raw = await safeRead(enPath);
    fallback = true;
  }

  if (!raw) return null;

  const { data, content } = matter(raw);
  return {
    slug,
    locale,
    fallback,
    frontmatter: data as ContentFrontmatter,
    body: content,
  };
}

export async function listSlugs(type: ContentType): Promise<string[]> {
  const dir = path.join(CONTENT_ROOT, type);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/** All available (slug, locale) pairs — used by sitemap + generateStaticParams. */
export async function listEntries(type: ContentType): Promise<{ slug: string; locale: Locale }[]> {
  const slugs = await listSlugs(type);
  const out: { slug: string; locale: Locale }[] = [];
  for (const slug of slugs) {
    const dir = path.join(CONTENT_ROOT, type, slug);
    const files = await fs.readdir(dir);
    for (const f of files) {
      if (f.endsWith('.mdx')) {
        const locale = f.replace('.mdx', '') as Locale;
        out.push({ slug, locale });
      }
    }
  }
  return out;
}
