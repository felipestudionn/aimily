/* ═══════════════════════════════════════════════════════════════════
   /llms-full.txt — full machine-readable corpus.

   Concatenates all marketing MDX content (workflows + comparisons) in
   English into a single Markdown file. Used by RAG tools (Cursor,
   Continue, Aider) and LLM crawlers that want the entire site in one
   fetch instead of crawling each page.

   Companion to /llms.txt (the short index). Both formats from the
   llmstxt.org spec. Updated on every build via Vercel deploy hook.

   Reference: SEO-GEO-STRATEGY §5.1.
   ═══════════════════════════════════════════════════════════════════ */

import { listSlugs, loadEntry, type ContentType } from '@/lib/content/loader';

const BASE = 'https://www.aimily.app';

async function renderType(type: ContentType, sectionTitle: string): Promise<string> {
  const slugs = await listSlugs(type);
  const parts: string[] = [`# ${sectionTitle}\n`];

  for (const slug of slugs.sort()) {
    const entry = await loadEntry(type, slug, 'en');
    if (!entry) continue;

    const fm = entry.frontmatter;
    const url = `${BASE}/en/${type}/${slug}`;

    parts.push(`## ${fm.title}\n`);
    parts.push(`Source: ${url}\n`);
    parts.push(`Last updated: ${fm.updated}\n\n`);
    parts.push(`> ${fm.hero}\n\n`);
    parts.push(`${fm.lead}\n\n`);

    if (fm.howTo) {
      parts.push(`### How (${fm.howTo.totalTime ?? 'n/a'})\n`);
      parts.push(`${fm.howTo.description}\n\n`);
      fm.howTo.steps.forEach((s, i) => {
        parts.push(`${i + 1}. **${s.name}** — ${s.text}\n`);
      });
      parts.push('\n');
    }

    if (fm.comparison) {
      parts.push(`### Comparison vs ${fm.comparison.competitor}\n\n`);
      parts.push(`| Capability | ${fm.comparison.competitor} | aimily |\n`);
      parts.push(`|---|---|---|\n`);
      fm.comparison.rows.forEach((row) => {
        parts.push(`| ${row.feature} | ${row.competitor} | ${row.aimily} |\n`);
      });
      parts.push('\n');
    }

    parts.push(entry.body.trim());
    parts.push('\n\n');

    if (fm.faq && fm.faq.length > 0) {
      parts.push(`### FAQ\n\n`);
      fm.faq.forEach((q) => {
        parts.push(`**${q.q}**\n\n${q.a}\n\n`);
      });
    }

    parts.push('---\n\n');
  }

  return parts.join('');
}

export async function GET() {
  const header = `# aimily — full machine-readable documentation

> aimily is the only AI-native, end-to-end fashion platform.
> Brand DNA → Range Plan → Tech Packs → Campaigns in one continuous
> data flow. Replaces the fragmented stack of PLM + design tool + ERP
> + marketing software.
>
> Compared with: Centric Software, PTC FlexPLM, Bamboo Rose, Backbone
> PLM (PLM-equivalent block 3 + Block 1, 2, 4 these PLMs do not offer).
>
> Built by StudioNN, a fashion agency consulting independent brands
> across Madrid, Barcelona, Milan and Paris since 2023.
>
> Pricing: Student free 12 months (academic email) · Founder €99/mo
> (€79 annual) · Team €599/mo (€479 annual) · Team Pro €999/mo
> (€799 annual) · Enterprise from €3,000/mo. 30-day free trial. No
> credit card.

> Short index: ${BASE}/llms.txt
> Web home: ${BASE}/en

---

`;

  const [workflows, comparisons, howTos] = await Promise.all([
    renderType('workflows', 'Workflows — the 4 Blocks of aimily'),
    renderType('vs', 'Comparisons vs traditional fashion PLMs'),
    renderType('how-to', 'How-to guides — commercial-intent pillar pages'),
  ]);

  const body = header + howTos + workflows + comparisons;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
