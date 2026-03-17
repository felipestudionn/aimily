/**
 * Perplexity Search Client — Web research for Brand DNA & Trends.
 *
 * Uses Perplexity's Search API to get real web content (articles, press,
 * reviews) that Claude then analyzes with expert-level fashion knowledge.
 *
 * Search API: $5 per 1,000 requests ($0.005/search)
 * Docs: https://docs.perplexity.ai/api-reference/search-post
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const SEARCH_ENDPOINT = 'https://api.perplexity.ai/search';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date: string | null;
}

interface PerplexitySearchResponse {
  content: string;        // Combined content from all results
  sources: string[];      // Source URLs
  resultCount: number;
}

/**
 * Expand season codes to full searchable strings.
 * "SS27" → "Spring Summer 2027"
 * "FW26" → "Fall Winter 2026"
 * Also determines if the season's shows have already happened.
 */
function expandSeason(season?: string): { full: string; year: string; isFuture: boolean } {
  const s = (season || '').toUpperCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based

  // Extract year digits
  const yearMatch = s.match(/(\d{2,4})/);
  let year = '';
  if (yearMatch) {
    year = yearMatch[1].length === 2 ? '20' + yearMatch[1] : yearMatch[1];
  } else {
    year = String(currentYear);
  }
  const yearNum = parseInt(year);

  // Determine season type and full name
  let full = '';
  let showMonth = 0; // Month when runway shows typically happen

  if (s.startsWith('SS') || s.includes('SPRING') || s.includes('SUMMER')) {
    full = `Spring Summer ${year}`;
    showMonth = 8; // SS shows happen in September of PREVIOUS year
    // SS27 shows happen Sept 2026
    const showYear = yearNum - 1;
    const showDate = new Date(showYear, showMonth);
    return { full, year, isFuture: now < showDate };
  }

  if (s.startsWith('FW') || s.startsWith('AW') || s.includes('FALL') || s.includes('WINTER')) {
    full = `Fall Winter ${year}`;
    showMonth = 1; // FW shows happen in February of SAME year
    const showDate = new Date(yearNum, showMonth);
    return { full, year, isFuture: now < showDate };
  }

  // Fallback
  return { full: season || String(currentYear), year, isFuture: false };
}

/**
 * Research a brand using web search.
 * Returns real articles, press coverage, and reviews about the brand.
 */
export async function researchBrand(
  brandName: string,
  website?: string,
  instagram?: string
): Promise<PerplexitySearchResponse | null> {
  if (!PERPLEXITY_API_KEY) {
    console.warn('PERPLEXITY_API_KEY not configured — skipping web research');
    return null;
  }

  const brandRef = brandName || website || instagram || '';
  if (!brandRef) return null;

  const queries = [
    `"${brandRef}" fashion brand identity visual style colors typography aesthetic`,
    `"${brandRef}" brand positioning tone of voice campaigns photography`,
  ];

  return callSearch(queries);
}

/**
 * Research fashion trends using web search.
 * Returns current, real-world trend data from fashion press and industry sources.
 */
export async function researchTrends(
  trendQuery: string,
  season?: string,
  type: 'global' | 'deep-dive' | 'live-signals' | 'competitors' = 'global'
): Promise<PerplexitySearchResponse | null> {
  if (!PERPLEXITY_API_KEY) {
    console.warn('PERPLEXITY_API_KEY not configured — skipping web research');
    return null;
  }

  const { full: seasonFull, year, isFuture } = expandSeason(season);
  const queries: string[] = [];

  switch (type) {
    case 'global':
      if (isFuture) {
        // Season shows haven't happened yet → search for forecasts + current runway direction
        queries.push(
          `"${seasonFull}" fashion trend forecast predictions Vogue WGSN colors silhouettes`,
          `${year} fashion trends runway direction "Tag Walk" "The Impression" "Harper's Bazaar" key looks`,
          `fashion trends ${year} what designers are showing resort pre-fall collections`,
        );
      } else {
        // Season shows already happened → search for runway coverage
        queries.push(
          `"${seasonFull}" runway trends Vogue "The Impression" "Tag Walk" fashion week key looks`,
          `"${seasonFull}" fashion trends "Harper's Bazaar" colors materials silhouettes designers`,
          `"${seasonFull}" best collections runway highlights street style`,
        );
      }
      break;
    case 'deep-dive':
      queries.push(
        `${trendQuery} fashion trends ${year} runway designers collections Vogue "Tag Walk"`,
        `${trendQuery} ${seasonFull} trend details materials colors styling brands`,
      );
      break;
    case 'live-signals':
      queries.push(
        `fashion trending right now ${year} street style viral looks celebrity style`,
        `most popular fashion trends ${year} TikTok Instagram what people are wearing`,
      );
      break;
    case 'competitors':
      queries.push(
        `${trendQuery} brand analysis positioning pricing collections ${year}`,
        `${trendQuery} competitive landscape fashion market strategy`,
      );
      break;
  }

  return callSearch(
    queries,
    type === 'live-signals' ? 'month' : 'year'
  );
}

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

    if (recency) {
      body.search_recency_filter = recency;
    }

    const res = await fetch(SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Perplexity Search API error: ${res.status} ${res.statusText}`, errText);
      return null;
    }

    const data = await res.json();
    const results: SearchResult[] = data.results || [];

    if (results.length === 0) return null;

    // Combine all snippets into a single content block
    const contentParts = results.map((r, i) =>
      `[Source ${i + 1}: ${r.title}${r.date ? ` (${r.date})` : ''}]\n${r.snippet}`
    );

    return {
      content: contentParts.join('\n\n'),
      sources: results.map(r => r.url).filter(Boolean),
      resultCount: results.length,
    };
  } catch (e) {
    console.error('Perplexity Search API call failed:', e);
    return null;
  }
}
