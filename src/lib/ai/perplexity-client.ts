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
  collectionContext?: { collectionName?: string; consumer?: string }
): Promise<TrendResearchResponse | null> {
  if (!PERPLEXITY_API_KEY) return null;

  const { full: seasonFull, previousSeason, isFuture } = expandSeason(season);

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
      prompt = `${collectionInfo}${seasonNote}
${trendQuery ? `\nIMPORTANT: The user wants trends specifically about "${trendQuery}". ALL trends must be relevant to ${trendQuery}. Do NOT return general fashion trends — focus exclusively on ${trendQuery} trends.\n` : ''}
Find 6-8 KEY FASHION TRENDS${trendQuery ? ` for ${trendQuery}` : ''} from runway shows, Vogue, Tag Walk, The Impression, Harper's Bazaar, and WWD. These must be REAL trends seen on runways and in fashion coverage — not abstract concepts.

For EACH trend, provide:
- "title": A Vogue-style headline (2-4 words). GOOD: ${trendQuery ? `e.g. for footwear: "Mesh Ballet Flats", "Chunky Loafers", "Kitten Heel Return"` : `"Quiet Luxury", "Sheer Everything", "The New Prep", "Linen Suiting"`}. BAD: "Digital Enlightenment", "Regenerative Authenticity"
- "brands": 3-5 designer/brand names that represent this trend
- "desc": 60-80 words — what it looks like (silhouettes, colors, materials), how a designer would use it. Direct and visual, not academic.
- "relevance": "high" or "medium"

Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
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

Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;

    case 'live-signals':
      prompt = `${collectionInfo}Find 6-8 things TRENDING RIGHT NOW in ${trendQuery ? trendQuery + ' fashion' : 'fashion and style'}. What are people wearing, buying, posting about? Search TikTok trends, Instagram style, celebrity fashion, street style photos from this month.
${trendQuery ? `\nFocus specifically on ${trendQuery}. ALL signals must be about ${trendQuery}.\n` : ''}

For EACH signal:
- "title": What people call it (e.g., "Cherry Red Everything", "Barn Jacket Revival")
- "brands": 3-5 brands/people driving this
- "desc": 50-70 words — what it looks like, who's driving it, where it's trending, how long it will last
- "relevance": "high" or "medium"

Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;

    case 'competitors':
      prompt = `${collectionInfo}Analyze these fashion brands/competitors: "${trendQuery}"

For EACH brand mentioned, provide:
- "title": "Brand Name: Key Insight" (e.g., "COS: Affordable Minimalism Gap")
- "brands": The brand + 2-3 closest competitors at same tier
- "desc": 60-80 words — price range (real € numbers), positioning, what they do well, the gap/opportunity for the user
- "relevance": "high" or "medium"

Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;
  }

  return callSonar(prompt, type === 'live-signals' ? 'month' : 'year');
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
  recency: 'hour' | 'day' | 'week' | 'month' | 'year' = 'year'
): Promise<TrendResearchResponse | null> {
  try {
    const res = await fetch(SONAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion industry expert. Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON. Every trend must be real, visual, and concrete — something you could see on a runway or in a store.',
          },
          { role: 'user', content: prompt },
        ],
        search_recency_filter: recency,
      }),
    });

    if (!res.ok) {
      console.error(`Perplexity Sonar error: ${res.status}`, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Parse JSON from response
    try {
      const parsed = JSON.parse(text);
      return { results: cleanResults(parsed.results || []), citations };
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { results: cleanResults(parsed.results || []), citations };
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
  return results.map(r => ({
    ...r,
    // Remove citation references like [1], [2], [3] from descriptions
    desc: r.desc.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim(),
    title: r.title.replace(/\[\d+\]/g, '').trim(),
    // Fix brands: ensure comma-separated (Sonar sometimes concatenates them)
    brands: fixBrandsList(r.brands || ''),
  }));
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
