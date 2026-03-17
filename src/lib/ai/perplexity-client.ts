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

  // Multiple targeted queries for comprehensive brand research
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

  const seasonStr = season || '2026';
  const queries: string[] = [];

  switch (type) {
    case 'global':
      queries.push(
        `fashion macro trends ${seasonStr} runway collections key designers`,
        `fashion industry trends ${seasonStr} colors materials silhouettes`,
      );
      break;
    case 'deep-dive':
      queries.push(
        `${trendQuery} fashion micro trends ${seasonStr} specific design details materials`,
        `${trendQuery} trend adoption brands price tiers ${seasonStr}`,
      );
      break;
    case 'live-signals':
      queries.push(
        `fashion trending now ${seasonStr} viral social media street style`,
        `emerging fashion trends ${seasonStr} TikTok Instagram cultural signals`,
      );
      break;
    case 'competitors':
      queries.push(
        `${trendQuery} brand analysis positioning pricing strategy`,
        `${trendQuery} competitive landscape fashion market ${seasonStr}`,
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
