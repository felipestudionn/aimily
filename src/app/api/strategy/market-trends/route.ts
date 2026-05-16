/**
 * POST /api/strategy/market-trends
 *
 * Strategy-specific market trends · single Perplexity Sonar call with the
 * product-focused prompt built in lib/strategy/market-trends-prompt.ts.
 * Returns trends grouped by dimension (silhouette · pattern · color ·
 * material · reference_brand · category_direction) so the CreativeBlock UI
 * can render category sections instead of mixed buckets.
 *
 * Ad-hoc for Strategy — does NOT replace /api/ai/creative-generate trends-*
 * which Block 1 keeps using untouched.
 *
 * Body:    { tenant_slug, season?, language? }
 * Returns: { trends: StrategyTrend[], citations: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStrategyAccess } from '@/lib/strategy/auth-guard';
import { loadStrategyTenantContext } from '@/lib/strategy/context-loader';
import {
  buildStrategyMarketTrendsPrompt,
  type StrategyMarketTrendsResponse,
  type StrategyTrend,
  type StrategyTrendDimension,
} from '@/lib/strategy/market-trends-prompt';

export const runtime = 'nodejs';
export const maxDuration = 90;

const SONAR_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';
const VALID_DIMENSIONS: StrategyTrendDimension[] = [
  'silhouette',
  'pattern',
  'color',
  'material',
  'reference_brand',
];

function deriveCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) return `${year + 1} AW`;
  return `${year + 1} SS`;
}

function deriveProductCategory(tenantDisplayName: string, topFamilies: string[]): string {
  // Fallback heuristic until the Product DNA Profile lands: if family names
  // hint at women/men/kids/footwear, surface that. Otherwise return the
  // tenant name as the context label.
  const haystack = topFamilies.join(' ').toLowerCase();
  if (haystack.match(/woman|w\.|mujer|female|sastrería|vestido|falda/)) {
    return 'Womenswear contemporary';
  }
  if (haystack.match(/man|m\.|hombre|male/)) {
    return 'Menswear contemporary';
  }
  if (haystack.match(/kid|child|infant/)) {
    return 'Kidswear';
  }
  if (haystack.match(/shoe|calzado|footwear|sneaker/)) {
    return 'Footwear';
  }
  return tenantDisplayName;
}

function parseTrendsFromText(text: string): StrategyTrend[] {
  // Extract first JSON object from Sonar response.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return [];
  let parsed: StrategyMarketTrendsResponse;
  try {
    parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    return [];
  }
  if (!parsed?.trends || !Array.isArray(parsed.trends)) return [];

  const validated: StrategyTrend[] = [];
  for (const raw of parsed.trends) {
    if (!raw || typeof raw !== 'object') continue;
    const dim = raw.dimension as StrategyTrendDimension;
    if (!VALID_DIMENSIONS.includes(dim)) continue;
    if (typeof raw.title !== 'string' || !raw.title.trim()) continue;
    if (typeof raw.product_spec !== 'string' || !raw.product_spec.trim()) continue;

    const trend: StrategyTrend = {
      dimension: dim,
      title: raw.title.trim(),
      product_spec: raw.product_spec.trim(),
      reference_brands: Array.isArray(raw.reference_brands)
        ? raw.reference_brands.filter((b: unknown): b is string => typeof b === 'string' && b.trim().length > 0)
        : [],
    };

    if (dim === 'color') {
      if (typeof raw.color_hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color_hex)) {
        trend.color_hex = raw.color_hex.toUpperCase();
      }
      if (typeof raw.color_name === 'string' && raw.color_name.trim()) {
        trend.color_name = raw.color_name.trim();
      }
    }

    validated.push(trend);
  }
  return validated;
}

export async function POST(req: NextRequest) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json(
      { error: 'PERPLEXITY_API_KEY not configured' },
      { status: 500 }
    );
  }

  let body: { tenant_slug?: string; season?: string; language?: 'en' | 'es' } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenantSlug = body?.tenant_slug;
  if (typeof tenantSlug !== 'string' || !tenantSlug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 });
  }

  const access = await requireStrategyAccess({ tenantSlug });
  if (!access.ok) return access.response;

  const ctx = await loadStrategyTenantContext(access.tenant.id);
  if (!ctx) {
    return NextResponse.json({ error: 'Tenant context not loadable' }, { status: 500 });
  }

  const topFamilies = ctx.top_families.slice(0, 6).map((f) => f.family_code);
  const productCategory = deriveProductCategory(ctx.tenant.display_name, topFamilies);
  const season = body?.season || deriveCurrentSeason();

  const prompt = buildStrategyMarketTrendsPrompt({
    tenantName: ctx.tenant.display_name,
    productCategory,
    season,
    topFamilies,
    brandArchetype: ctx.brand_profile.brand_archetype,
    referenceBrands: undefined,
    language: body?.language ?? 'es',
  });

  try {
    const res = await fetch(SONAR_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        search_recency_filter: 'month',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Sonar request failed (${res.status})`, detail: errText.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const citations: string[] = Array.isArray(data?.citations) ? data.citations : [];

    const trends = parseTrendsFromText(text);

    if (trends.length === 0) {
      return NextResponse.json(
        {
          error: 'Sonar returned no parseable trends',
          raw_excerpt: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ trends, citations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Market trends fetch failed', detail: msg },
      { status: 500 }
    );
  }
}
