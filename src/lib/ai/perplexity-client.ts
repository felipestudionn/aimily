/**
 * Perplexity Client — Web-grounded research for Brand DNA & Trends.
 *
 * Brand DNA: Search API (raw results) → fed to Claude for analysis
 * Trends: Sonar API (AI + search) → returns structured JSON directly, no Claude needed
 *
 * Search API: $5 per 1,000 requests
 * Sonar API: ~$0.01 per request
 * Docs: https://docs.perplexity.ai
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const SEARCH_ENDPOINT = 'https://api.perplexity.ai/search';
const SONAR_ENDPOINT = 'https://api.perplexity.ai/v1/sonar';

// ─── Types ───

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date: string | null;
}

export interface PerplexitySearchResponse {
  content: string;
  sources: string[];
  resultCount: number;
}

export interface TrendResult {
  title: string;
  brands: string;
  desc: string;
  relevance: 'high' | 'medium';
  // For the merged Tendencias lens, Sonar groups its findings across
  // four dimensions (themes / categories / colors / materials). We
  // flatten the four buckets into a single results array with this
  // tag so the UI can group by dimension while the existing select /
  // edit / remove flow stays unchanged.
  dimension?: 'theme' | 'category' | 'color' | 'material';
  // Color cards carry a hex string so the UI can render a swatch
  // alongside the title. Format: "#RRGGBB" or a Pantone code that
  // the frontend can resolve against the local pantone_colors table.
  hex?: string;
}

export interface TrendResearchResponse {
  results: TrendResult[];
  citations: string[];
}

// ─── Season Logic ───

function expandSeason(season?: string): { full: string; year: string; isFuture: boolean; previousSeason: string } {
  const s = (season || '').toUpperCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();

  const yearMatch = s.match(/(\d{2,4})/);
  let year = '';
  if (yearMatch) {
    year = yearMatch[1].length === 2 ? '20' + yearMatch[1] : yearMatch[1];
  } else {
    year = String(currentYear);
  }
  const yearNum = parseInt(year);

  if (s.startsWith('SS') || s.includes('SPRING') || s.includes('SUMMER')) {
    const full = `Spring Summer ${year}`;
    const previousSeason = `Spring Summer ${yearNum - 1}`;
    const showDate = new Date(yearNum - 1, 8); // SS shows happen Sept of previous year
    return { full, year, isFuture: now < showDate, previousSeason };
  }

  if (s.startsWith('FW') || s.startsWith('AW') || s.includes('FALL') || s.includes('WINTER')) {
    const full = `Fall Winter ${year}`;
    const previousSeason = `Fall Winter ${yearNum - 1}`;
    const showDate = new Date(yearNum, 1); // FW shows happen Feb of same year
    return { full, year, isFuture: now < showDate, previousSeason };
  }

  return { full: season || String(currentYear), year, isFuture: false, previousSeason: '' };
}

// ─── Brand Research (Search API → raw results for Claude) ───

export async function researchBrand(
  brandName: string,
  website?: string,
  instagram?: string
): Promise<PerplexitySearchResponse | null> {
  if (!PERPLEXITY_API_KEY) return null;

  const brandRef = brandName || website || instagram || '';
  if (!brandRef) return null;

  const queries = [
    `"${brandRef}" fashion brand identity visual style colors typography aesthetic`,
    `"${brandRef}" brand positioning tone of voice campaigns photography`,
  ];

  return callSearch(queries);
}

// ─── Trend Research (Sonar API → structured JSON directly) ───

export async function researchTrends(
  trendQuery: string,
  season?: string,
  type: 'global' | 'deep-dive' | 'live-signals' | 'competitors' = 'global',
  collectionContext?: { collectionName?: string; consumer?: string },
  excludeTitles?: string[],
  language?: string,
  // When set, narrows the type='global' research to a single bucket.
  // Used by the "+ Más temas / categorías / colores / materiales"
  // buttons in the UI to deepen one axis without regenerating the
  // whole multi-dimension grid.
  targetDimension?: 'theme' | 'category' | 'color' | 'material',
  // Existing cards in the same axis. When the user clicks "+ Más",
  // we show Sonar what it already produced so it complements rather
  // than restates. Each entry is the user's view of an existing
  // card — title + a short hint from the desc.
  existingInDimension?: Array<{ title: string; desc?: string }>,
): Promise<TrendResearchResponse | null> {
  if (!PERPLEXITY_API_KEY) return null;

  const { full: seasonFull, previousSeason, isFuture } = expandSeason(season);

  // Exclusion instruction (for Load More / Replace Unselected)
  const exclusionNote = excludeTitles && excludeTitles.length > 0
    ? `\n\nIMPORTANT: Do NOT repeat any of these trends that the user already has: ${excludeTitles.join(', ')}. Generate COMPLETELY DIFFERENT trends.\n`
    : '';

  // Build the Sonar prompt based on trend type
  let prompt = '';

  const seasonNote = isFuture
    ? `The user is planning for ${seasonFull}, which hasn't been shown on runways yet. Research the most recent equivalent season (${previousSeason}) as the primary reference — those trends inform what's coming next. Also include any early forecasts or pre-collection signals for ${seasonFull}.`
    : `The user is researching ${seasonFull}. Search for runway coverage, trend reports, and street style from this season.`;

  const collectionInfo = collectionContext?.collectionName
    ? `Collection: "${collectionContext.collectionName}". `
    : '';

  switch (type) {
    case 'global':
      // Tendencias (merged Global + Deep) — return four axes by default.
      // When targetDimension is set, narrow to that single bucket and
      // return MORE depth on that axis (used by the "+ Más temas /
      // categorías / colores / materiales" buttons in the UI).
      {
        const themesBlock = `THEMES — concept-level cultural energy.
  · "title": Vogue-style headline (2-4 words). Examples: "Quiet Luxury", "Sheer Everything", "The New Prep", "Y2K Resurgence"
  · "desc": 50-70 words — what cultural force this captures, how brands embody it, what a wearer signals when they buy in.`;
        const categoriesBlock = `CATEGORIES — specific product types trending.
  · "title": Product type + qualifier (2-4 words). Examples: "Mesh Ballet Flats", "Bias-cut Slips", "Barn Jacket", "Tailored Bermudas", "Knit Polo"
  · "desc": 50-70 words — silhouette, who wears it, how it's styled, brands doing it best.`;
        const colorsBlock = `COLORS — color stories of the season.
  · "title": Color name (1-3 words). Examples: "Cherry Red", "Butter Yellow", "Powder Blue", "Chocolate Brown", "Sage"
  · "desc": 50-70 words — what materials carry it best, which designers championed it, mood it conveys.
  · "hex": REQUIRED. The HEX color code for the swatch (format "#RRGGBB"). Use the closest Pantone equivalent if a runway color was named without a hex. NEVER omit this field for color cards.`;
        const materialsBlock = `MATERIALS — fabric, finish and construction trends.
  · "title": Material or construction technique (1-4 words). Examples: "Liquid Jersey", "Vegetable-tanned Leather", "Mesh Panels", "Raw-edge Denim", "Sheer Organza"
  · "desc": 50-70 words — feel, weight (gsm if known), how it drapes, which silhouettes it favours, brands working with it.`;

        type DimSpec = { plural: string; block: string; jsonKey: string };
        const targetMap: Record<string, DimSpec> = {
          theme:    { plural: 'themes',     block: themesBlock,     jsonKey: 'themes' },
          category: { plural: 'categories', block: categoriesBlock, jsonKey: 'categories' },
          color:    { plural: 'colors',     block: colorsBlock,     jsonKey: 'colors' },
          material: { plural: 'materials',  block: materialsBlock,  jsonKey: 'materials' },
        };

        // ── Common context header — IDENTICAL in both modes (initial
        //    4-axis report and per-axis deepen). Keeps Sonar grounded
        //    in the same brand/season/framing/source no matter what
        //    the ask is. Only the BODY (the ask) varies.
        const contextHeader = `${collectionInfo}${seasonNote}
${trendQuery ? `\nIMPORTANT: The framing chips the user gave you: "${trendQuery}". Use them to focus the research.\n` : ''}
Source: runway shows, Vogue, Tag Walk, The Impression, Harper's Bazaar, WWD, street-style coverage.`;

        let askBody = '';
        let jsonShape = '';

        if (targetDimension && targetMap[targetDimension]) {
          // ── Single-axis deepen ──
          const spec = targetMap[targetDimension];
          const isColor = targetDimension === 'color';
          jsonShape = isColor
            ? `{ "${spec.jsonKey}": [{"title":"...","brands":"...","desc":"...","hex":"#RRGGBB"}, ...] }`
            : `{ "${spec.jsonKey}": [{"title":"...","brands":"...","desc":"..."}, ...] }`;

          const existingBlock = existingInDimension && existingInDimension.length > 0
            ? `\nThe user already has these ${spec.plural.toUpperCase()} from your earlier research:\n${existingInDimension.map(c => `  · ${c.title}${c.desc ? ` — ${c.desc.slice(0, 100)}` : ''}`).join('\n')}\n\nDeepen this axis: give me 3-5 MORE ${spec.plural} that COMPLEMENT (don't repeat or paraphrase) what's above.`
            : `\nGive me 4-6 ${spec.plural}.`;

          askBody = `${spec.block}
${existingBlock}

For EVERY card include "brands" (3-5 designer/brand references).`;
        } else {
          // ── Initial 4-axis report ──
          jsonShape = `{
  "themes":     [{"title":"...","brands":"...","desc":"..."}, ...],
  "categories": [{"title":"...","brands":"...","desc":"..."}, ...],
  "colors":     [{"title":"...","brands":"...","desc":"...","hex":"#RRGGBB"}, ...],
  "materials":  [{"title":"...","brands":"...","desc":"..."}, ...]
}`;
          askBody = `Research this collection's market across FOUR DIMENSIONS. Each dimension is a separate bucket of cards. NEVER mix dimensions. NEVER duplicate across dimensions.

DIMENSION 1 · ${themesBlock}
(produce 3-4 cards)

DIMENSION 2 · ${categoriesBlock}
(produce 4-6 cards)

DIMENSION 3 · ${colorsBlock}
(produce 3-5 cards)

DIMENSION 4 · ${materialsBlock}
(produce 3-5 cards)

For EVERY card across all dimensions, also include "brands" (3-5 designer/brand references).`;
        }

        prompt = `${contextHeader}

${askBody}

${exclusionNote}Return ONLY valid JSON in this EXACT shape (no other keys, no extra wrapping):
${jsonShape}`;
      }
      break;

    case 'deep-dive':
      prompt = `${collectionInfo}${seasonNote}

The user wants a deep dive on: "${trendQuery}"

Find 6-8 SPECIFIC MICRO-TRENDS in this area from Vogue, Tag Walk, runway shows, and street style coverage. Design-level details — specific looks, constructions, materials, finishes.

For EACH micro-trend:
- "title": Concrete name (e.g., "Mesh Panel Sneakers", "Raw-Edge Denim", "Butter Yellow")
- "brands": 3-5 brands doing this
- "desc": 60-80 words — what it looks like, how to execute it, shelf life (flash/wave/staying)
- "relevance": "high" or "medium"

${exclusionNote}Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;

    case 'live-signals':
      prompt = `${collectionInfo}Find 6-8 LIVE FASHION SIGNALS — what real people are actually wearing, buying, and talking about right now in ${trendQuery ? trendQuery : 'fashion'}.
${trendQuery ? `\nFocus specifically on ${trendQuery}. ALL signals must be about ${trendQuery}.\n` : ''}
This is NOT about runway predictions. This is about what's HAPPENING ON THE GROUND:

1. STREET STYLE — What are people wearing in fashion neighborhoods?
   - London: Hackney, Shoreditch, Dalston
   - NYC: Williamsburg, SoHo, Lower East Side
   - Paris: Le Marais, Saint-Germain, Pigalle
   - Tokyo: Daikanyama, Harajuku, Shimokitazawa
   - Stockholm: Södermalm
   - Barcelona: Born, Gràcia
   - Copenhagen: Nørrebro, Vesterbro
   - Milan: Brera, Navigli

2. SOCIAL MEDIA — What's viral on TikTok fashion, Instagram style accounts, Reddit r/malefashionadvice and r/femalefashionadvice, Pinterest most-saved

3. RETAIL SIGNALS — What's selling out at Zara, COS, & Other Stories, Massimo Dutti, Arket? What new stores or pop-ups have opened in key neighborhoods?

4. CULTURAL MOMENTS — Which celebrity outfits went viral? Which TV shows or films are influencing style?

For EACH signal:
- "title": What people call it (e.g., "Cherry Red Everything", "Barn Jacket Revival", "Ballet Flat Comeback")
- "brands": 3-5 brands, people, neighborhoods, or platforms driving this
- "desc": 50-70 words — what it looks like, WHERE it's been spotted (city/neighborhood/platform), who's wearing it, how long it will last
- "relevance": "high" or "medium"

${exclusionNote}Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;

    case 'competitors':
      prompt = `${collectionInfo}Analyze these fashion brands/competitors: "${trendQuery}"

For EACH brand mentioned, provide:
- "title": "Brand Name: Key Insight" (e.g., "COS: Affordable Minimalism Gap")
- "brands": The brand + 2-3 closest competitors at same tier
- "desc": 60-80 words — price range (real € numbers), positioning, what they do well, the gap/opportunity for the user
- "relevance": "high" or "medium"

${exclusionNote}Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;
  }

  // Locale instruction — Sonar searches global English fashion press
  // either way, but the JSON values it returns must be in the user's
  // working language. Otherwise a Spanish-speaking user gets English
  // headlines while their chips were in Spanish.
  const langName: Record<string, string> = {
    es: 'Spanish (Castilian)',
    pt: 'Portuguese',
    it: 'Italian',
    fr: 'French',
    de: 'German',
    nl: 'Dutch',
    sv: 'Swedish',
    no: 'Norwegian',
    en: 'English',
  };
  const targetLang = (language && langName[language]) ? langName[language] : null;
  if (targetLang && targetLang !== 'English') {
    prompt += `\n\nLANGUAGE OUTPUT: All JSON field values (title, brands, desc) MUST be written in ${targetLang}. The user is working in ${targetLang}; do not return English text. Brand proper nouns stay as-is (e.g. "The Row"); everything else translated to ${targetLang}.`;
  }

  // Live signals: last 3 months; others: last year
  if (type === 'live-signals') {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const afterDate = `${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}/${String(threeMonthsAgo.getDate()).padStart(2, '0')}/${threeMonthsAgo.getFullYear()}`;
    return callSonar(prompt, undefined, afterDate);
  }
  return callSonar(prompt, 'year');
}

// ─── Brand Pricing Research (Sonar → text for Claude) ───

export async function researchBrandPricing(
  brands: string[],
  productCategories?: string
): Promise<string | null> {
  if (!PERPLEXITY_API_KEY || brands.length === 0) return null;

  const brandList = brands.join(', ');
  const categoryClause = productCategories
    ? `Focus specifically on these product categories: ${productCategories}.`
    : '';

  const prompt = `Research the RETAIL PRICING (in EUR) of these fashion brands: ${brandList}.

${categoryClause}

For EACH brand, find:
1. Price ranges by product category (e.g., shirts €X-€Y, trousers €X-€Y, accessories €X-€Y)
2. Their market positioning (accessible-premium, premium, entry-luxury, luxury)
3. Their pricing strategy (full-price focused, heavy markdowns, outlet channels)

Use real prices from their official e-commerce, Farfetch, SSENSE, Net-a-Porter, or retail press. Be specific — actual price points, not vague ranges.

Return a structured text summary. Do NOT return JSON. Be concise — 3-5 lines per brand with real numbers.`;

  try {
    const body: Record<string, unknown> = {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a fashion retail pricing analyst. Provide real, specific price points in EUR from current retail data. Be precise and concise.',
        },
        { role: 'user', content: prompt },
      ],
      search_recency_filter: 'year',
    };

    const res = await fetch(SONAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Perplexity pricing research error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    // Clean citation references
    return text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim() || null;
  } catch (e) {
    console.error('Brand pricing research failed:', e);
    return null;
  }
}

// ─── Search API (raw results) ───

async function callSearch(
  queries: string[],
  recency?: 'hour' | 'day' | 'week' | 'month' | 'year'
): Promise<PerplexitySearchResponse | null> {
  try {
    const body: Record<string, unknown> = {
      query: queries,
      max_results: 5,
      max_tokens_per_page: 2000,
    };
    if (recency) body.search_recency_filter = recency;

    const res = await fetch(SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Perplexity Search error: ${res.status}`, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const results: SearchResult[] = data.results || [];
    if (results.length === 0) return null;

    return {
      content: results.map((r, i) => `[Source ${i + 1}: ${r.title}${r.date ? ` (${r.date})` : ''}]\n${r.snippet}`).join('\n\n'),
      sources: results.map(r => r.url).filter(Boolean),
      resultCount: results.length,
    };
  } catch (e) {
    console.error('Perplexity Search failed:', e);
    return null;
  }
}

// ─── Sonar API (AI + search → structured response) ───

async function callSonar(
  prompt: string,
  recency?: 'hour' | 'day' | 'week' | 'month' | 'year',
  afterDate?: string // MM/DD/YYYY format
): Promise<TrendResearchResponse | null> {
  try {
    const body: Record<string, unknown> = {
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a fashion industry expert. Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON. Every trend must be real, visual, and concrete — something you could see on a runway or in a store.',
        },
        { role: 'user', content: prompt },
      ],
    };
    if (recency) body.search_recency_filter = recency;
    if (afterDate) body.search_after_date_filter = afterDate;

    const res = await fetch(SONAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Perplexity Sonar error: ${res.status}`, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Parse JSON from response. Handles two shapes:
    //   1. Legacy flat: { results: [...] }
    //   2. New 4-axis: { themes: [...], categories: [...], colors: [...], materials: [...] }
    // For (2) we flatten and tag each entry with `dimension` so the
    // UI can group while preserving the existing select/edit/remove
    // flow that operates on a flat results array.
    const flatten = (parsed: Record<string, unknown>): TrendResult[] => {
      if (Array.isArray(parsed.results)) return parsed.results as TrendResult[];
      const out: TrendResult[] = [];
      const buckets: Array<['theme' | 'category' | 'color' | 'material', string]> = [
        ['theme', 'themes'],
        ['category', 'categories'],
        ['color', 'colors'],
        ['material', 'materials'],
      ];
      for (const [dimension, key] of buckets) {
        const list = parsed[key];
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && typeof item === 'object') {
              out.push({ ...(item as TrendResult), dimension });
            }
          }
        }
      }
      return out;
    };
    try {
      const parsed = JSON.parse(text);
      return { results: cleanResults(flatten(parsed)), citations };
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { results: cleanResults(flatten(parsed)), citations };
      }
    }

    console.error('Sonar returned non-JSON:', text.substring(0, 200));
    return null;
  } catch (e) {
    console.error('Perplexity Sonar failed:', e);
    return null;
  }
}

// ─── Clean Sonar results ───

function cleanResults(results: TrendResult[]): TrendResult[] {
  return results.map(r => {
    const cleanDesc = (r.desc || '').replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
    const cleanTitle = (r.title || '').replace(/\[\d+\]/g, '').trim();
    // Hex fallback for color cards: if Sonar omitted the structured
    // hex field but mentioned a #RRGGBB or "Pantone XX-XXXX" inside
    // the description, recover it. Pantone codes get mapped via the
    // small inline lookup below for the most common runway codes.
    let hex = r.hex;
    if (r.dimension === 'color' && !hex) {
      const hexMatch = cleanDesc.match(/#([0-9A-Fa-f]{6})/);
      if (hexMatch) {
        hex = `#${hexMatch[1].toUpperCase()}`;
      } else {
        const pantoneMatch = cleanDesc.match(/Pantone\s*(\d{2}-\d{4})/i);
        if (pantoneMatch) {
          hex = pantoneCodeToHex(pantoneMatch[1]);
        }
      }
    }
    return {
      ...r,
      desc: cleanDesc,
      title: cleanTitle,
      brands: fixBrandsList(r.brands || ''),
      hex,
    };
  });
}

// Tiny Pantone → hex map for the most common runway/season colours.
// Falls back to undefined if no match. The Pantone DB cross-reference
// (S-future) will replace this with the local pantone_colors table.
function pantoneCodeToHex(code: string): string | undefined {
  const map: Record<string, string> = {
    '13-1907': '#F4C2C2', // Baby Pink / Pastel Pink
    '15-4319': '#A4C8DD', // Ice Blue
    '19-1012': '#5C4033', // Earth Brown
    '12-0734': '#F0E68C', // Butter Yellow
    '11-0602': '#F5F2E9', // Off-White / Cream
    '17-1463': '#F25C40', // Tomato / Cherry Red
    '17-1126': '#A87B5C', // Tobacco
    '15-3817': '#94A4C7', // Powder Blue
    '14-1064': '#FFA94D', // Tangerine
    '15-0850': '#E5C76B', // Saffron
    '18-1750': '#A02B3A', // Burgundy
    '13-0625': '#E1D8A8', // Sage / Pale Lime
    '17-5641': '#0F8A6C', // Emerald
    '19-3832': '#3F4F8F', // Cobalt / Indigo
  };
  return map[code];
}

function fixBrandsList(brands: string): string {
  // If already has commas, just clean up
  if (brands.includes(',')) {
    return brands.replace(/\[\d+\]/g, '').trim();
  }
  // Detect concatenated PascalCase brand names: "CelineLoewePradaVersace"
  // Split on uppercase letter boundaries (but keep consecutive uppercase like "DKNY", "A.P.C.")
  const split = brands.replace(/([a-z])([A-Z])/g, '$1, $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1, $2');
  return split.replace(/\[\d+\]/g, '').trim();
}
