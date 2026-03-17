/**
 * Brand Scraper — Content-focused web scraping for Brand DNA extraction.
 *
 * Scrapes the homepage + about/story page to get REAL brand content:
 * copy, headings, product descriptions, brand story. This text is what
 * Claude analyzes to extract voice, tone, and identity — NOT CSS colors.
 */

export interface ScrapedBrandContent {
  brandName: string;        // Best guess from <title>, og:title, or domain
  url: string;
  tagline: string;          // From meta description or og:description
  headings: string[];       // H1-H3 headings from both pages
  bodyContent: string;      // Main page text content
  aboutContent: string;     // About/story page text content (if found)
  productDescriptions: string[]; // Product-related text snippets
  socialLinks: string[];
}

const TIMEOUT_MS = 8000;
const MAX_TEXT_LENGTH = 4000;
const MAX_ABOUT_LENGTH = 3000;

// Common about/story page paths for fashion brands
const ABOUT_PATHS = [
  '/about', '/about-us', '/story', '/our-story', '/the-brand',
  '/brand', '/pages/about', '/pages/our-story', '/pages/about-us',
  '/en/about', '/en/story', '/en/about-us',
];

export async function scrapeBrandContent(url: string): Promise<ScrapedBrandContent | null> {
  try {
    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    // Remove trailing path to get base domain
    const urlObj = new URL(baseUrl);
    const origin = urlObj.origin;

    // Scrape homepage + try about pages in parallel
    const [homepageHtml, aboutHtml] = await Promise.all([
      fetchPage(baseUrl),
      findAboutPage(origin),
    ]);

    if (!homepageHtml) return null;

    const homepage = parseContent(baseUrl, homepageHtml);
    const about = aboutHtml ? parseContent(origin + '/about', aboutHtml) : null;

    // Extract brand name from title (remove common suffixes)
    let brandName = homepage.title
      .replace(/\s*[-–|·:]\s*(official\s*(online\s*)?)?site.*$/i, '')
      .replace(/\s*[-–|·:]\s*(official\s*)?store.*$/i, '')
      .replace(/\s*[-–|·:]\s*(official\s*)?shop.*$/i, '')
      .replace(/\s*[-–|·:]\s*home$/i, '')
      .replace(/\s*[-–|·:]\s*tienda\s*oficial.*$/i, '')
      .trim();

    // Fallback: use og:site_name or domain
    if (!brandName || brandName.length < 2) {
      brandName = homepage.siteName || urlObj.hostname.replace('www.', '').split('.')[0];
    }

    return {
      brandName,
      url: baseUrl,
      tagline: homepage.description,
      headings: [...homepage.headings, ...(about?.headings || [])],
      bodyContent: homepage.textContent.substring(0, MAX_TEXT_LENGTH),
      aboutContent: about?.textContent.substring(0, MAX_ABOUT_LENGTH) || '',
      productDescriptions: homepage.productSnippets,
      socialLinks: homepage.socialLinks,
    };
  } catch (e) {
    console.error(`Brand scraper failed for ${url}:`, e);
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function findAboutPage(origin: string): Promise<string | null> {
  // Try about pages in order of likelihood — return first success
  for (const path of ABOUT_PATHS) {
    const html = await fetchPage(origin + path);
    if (html && html.length > 500) return html;
  }
  return null;
}

interface ParsedPage {
  title: string;
  siteName: string;
  description: string;
  headings: string[];
  textContent: string;
  productSnippets: string[];
  socialLinks: string[];
}

function parseContent(url: string, html: string): ParsedPage {
  const title = extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i)
    || extractMeta(html, /property="og:title"\s+content="([^"]+)"/i) || '';

  const siteName = extractMeta(html, /property="og:site_name"\s+content="([^"]+)"/i) || '';

  const description = extractMeta(html, /name="description"\s+content="([^"]+)"/i)
    || extractMeta(html, /property="og:description"\s+content="([^"]+)"/i) || '';

  // Extract headings (H1-H3)
  const headings: string[] = [];
  const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hM;
  while ((hM = hRe.exec(html)) !== null && headings.length < 30) {
    const t = stripTags(hM[1]).trim();
    if (t && t.length > 2 && t.length < 300) headings.push(t);
  }

  // Extract paragraph content (brand copy, descriptions)
  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pM;
  while ((pM = pRe.exec(html)) !== null && paragraphs.length < 50) {
    const t = stripTags(pM[1]).trim();
    // Only keep paragraphs with substance (>30 chars = real content, not "Free shipping")
    if (t && t.length > 30 && t.length < 2000) paragraphs.push(t);
  }

  // Also get main body text (fallback if few paragraphs)
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
  body = stripTags(body).replace(/\s+/g, ' ').trim();

  // Prefer paragraphs if we got good ones, otherwise use full body
  const textContent = paragraphs.length >= 3
    ? paragraphs.join('\n\n')
    : body;

  // Product-related snippets (descriptions from product cards/grids)
  const productSnippets: string[] = [];
  const descRe = /(?:product|item|collection)[\s\S]*?<(?:p|span|div)[^>]*>([\s\S]*?)<\/(?:p|span|div)>/gi;
  let dM;
  while ((dM = descRe.exec(html)) !== null && productSnippets.length < 10) {
    const t = stripTags(dM[1]).trim();
    if (t && t.length > 20 && t.length < 500) productSnippets.push(t);
  }

  // Social links
  const socialLinks: string[] = [];
  const sRe = /href="(https?:\/\/(?:www\.)?(?:instagram|facebook|twitter|x|tiktok|pinterest|linkedin|youtube)\.com\/[^"]+)"/gi;
  let sM;
  while ((sM = sRe.exec(html)) !== null) socialLinks.push(sM[1]);

  return {
    title, siteName, description, headings, textContent,
    productSnippets: Array.from(new Set(productSnippets)).slice(0, 8),
    socialLinks: Array.from(new Set(socialLinks)).slice(0, 10),
  };
}

function stripTags(html: string): string { return html.replace(/<[^>]+>/g, ' '); }

function extractMeta(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'") : null;
}
