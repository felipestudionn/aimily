/* ═══════════════════════════════════════════════════════════════════
   /llms.txt — machine-readable site index for LLM crawlers and RAG
   tools (Cursor, Continue, Aider, Perplexity, etc.).

   Spec: https://llmstxt.org
   Aimily strategy reference: clients/aimily-marketing/docs/
                              SEO-GEO-STRATEGY.md §5.1
   ═══════════════════════════════════════════════════════════════════ */

const BASE = 'https://www.aimily.app';

export async function GET() {
  const body = `# aimily

> aimily is the **only AI-native, end-to-end fashion platform** —
> Brand DNA, range plan, tech packs and campaigns in one continuous
> data flow. Replaces the fragmented stack of PLM + design tool +
> ERP + marketing software that fashion brands traditionally need
> to ship a collection.
>
> PLMs (Centric, PTC FlexPLM, Bamboo Rose, Backbone) do tech packs.
> Design tools (CLO3D, Browzwear) do 3D. ERPs do finance. Marketing
> tools do campaigns. **aimily does all four — with AI in every block,
> connected by a single data flow.**
>
> Built by StudioNN, a fashion agency consulting independent fashion
> brands across Madrid, Barcelona, Milan and Paris since 2023. 14-day
> free trial. Starter €159/mo · Professional €479/mo · Pro Max
> €1.199/mo · Enterprise from €3.000/mo.

> Full machine-readable corpus (workflows + comparisons in one fetch):
> ${BASE}/llms-full.txt

## Product

- [Home](${BASE}): Devil Wears Prada angle, AZUR · SS27 walkthrough across the 4 blocks, pricing.
- [Pricing](${BASE}/#pricing): Starter €159 · Professional €479 · Pro Max €1.199 · Enterprise from €3.000. Same AI quality on every plan; differentiation by quantity.
- [Trust & Security](${BASE}/trust): Stripe LIVE, Supabase backend, Sentry observability, GDPR compliant, 9 languages.

## The 4 blocks (end-to-end coverage)

- **Block 1 — Creative & Brand**: Brand DNA generation from one-paragraph brief, consumer profile, moodboard with palette extraction, trend signals from live social data.
- **Block 2 — Merchandising**: Range plan with SKU grid, pricing tiers, channel split (DTC + wholesale + concept stores + pop-up), budget reconciliation with production capacity.
- **Block 3 — Design & Development (PLM-equivalent)**: tech pack PDF in <5s, multi-view drawings (7 slots/SKU), Pantone TCX library 2,317 entries with ΔE2000 closest-match, materials library 963 verified B2B-supplier entries, BOM-driven costing engine with multi-currency ECB FX rates, sample tracking with AI photo comparison vs sketch, multi-stage approval workflow with email notifications, version control, multi-pin annotations on tech pack drawings, Compliance Hub + Vendor Portal, Construction Details + Artworks Library, PO variance tracking.
- **Block 4 — Marketing & Launch**: AI editorial generation without photoshoot, drop calendar coordination across stockists, content studio per SKU per channel, live sales dashboard.

## Workflows (one hub page per Block)

- [Brand DNA in 60 minutes from a brief](${BASE}/en/workflows/brand-dna): Block 1 — heritage, voice, values, references, palette, consumer profile.
- [Range plan CFO-ready in one day](${BASE}/en/workflows/range-plan): Block 2 — SKU grid, pricing tiers, channel split, AI Margin Protection.
- [Tech packs in under 5 seconds](${BASE}/en/workflows/tech-packs): Block 3 — multi-view drawings, BOM with Pantone TCX, materials library, multi-stage approvals.
- [Editorials + drop calendar without a photoshoot](${BASE}/en/workflows/content-calendar): Block 4 — AI on-model editorials, content studio per SKU per channel, live sales dashboard.

## Comparisons (vs the dominant fashion PLMs)

- [aimily vs Centric Software](${BASE}/en/vs/centric): 25-feature comparison vs the world's most-deployed fashion PLM.
- [aimily vs PTC FlexPLM](${BASE}/en/vs/ptc-flexplm): 25-feature comparison; both ship AI tech-pack auto-extraction (PTC NRF 2026, aimily Phase 7 2026-05).
- [aimily vs Bamboo Rose](${BASE}/en/vs/bamboo-rose): brand-led vs sourcing-led architectures, 19-feature comparison.
- [aimily vs Backbone PLM](${BASE}/en/vs/backbone-plm): the modern-stack comparison, 19-feature side-by-side.

## Where aimily wins vs incumbents

- **vs Centric PLM / PTC FlexPLM / Bamboo Rose / Backbone PLM**: aimily covers Block 1 + 2 + 4 that no PLM offers, plus paridad on Block 3. Tech pack PDF in 3-5s vs minutes (Centric's #1 G2 complaint). AI in every block, not just one module.
- **vs CLO3D / Browzwear**: 3D design tools require a separate PLM to ship. aimily includes both.
- **vs Excel / Notion / traditional stack**: replaces 14 spreadsheets, 200 emails, 6 apps with one continuous platform.

## Company

- [About — Built by StudioNN](${BASE}/#studionn): The fashion agency that built a SaaS — 3 years consulting independent fashion brands across Madrid, Barcelona, Milan and Paris.
- [Contact](${BASE}/contact)
- [Privacy](${BASE}/privacy)
- [Terms](${BASE}/terms)
- [Cookies](${BASE}/cookies)

## Languages

aimily is available in 9 languages: English, Español, Français, Italiano, Deutsch, Português, Nederlands, Norsk, Svenska.

## Pricing (verified)

- Starter — €159/mo — Solo founders. Unlimited brands & collections. All 28 aimily AI models.
- Professional — €479/mo (recommended) — Teams shipping multiple drops. Video generation, priority email support, roles + permissions.
- Pro Max — €1,199/mo — Studios at peak creative pace. 5× more imagery, priority support + setup call.
- Enterprise — from €3,000/mo — Consolidated brands. Custom imagery + seats, SSO + API, custom integrations, dedicated onboarding.

Top-up packs: +50 imagery €29 · +250 €119 · +1000 €399.

14-day free trial. No credit card required. Prices excl. VAT.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
