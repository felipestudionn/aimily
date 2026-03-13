export interface ScrapedBrandData {
  url: string;
  title: string;
  description: string;
  ogImage: string;
  textContent: string;
  cssColors: string[];
  fontFamilies: string[];
  metaKeywords: string[];
  socialLinks: string[];
  headings: string[];
}

const TIMEOUT_MS = 8000;
const MAX_TEXT_LENGTH = 3000;

export async function scrapeWebsite(url: string): Promise<ScrapedBrandData | null> {
  try {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http')) normalizedUrl = 'https://' + normalizedUrl;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    return parseHTML(normalizedUrl, html);
  } catch (e) {
    console.error(`Brand scraper failed for ${url}:`, e);
    return null;
  }
}

function parseHTML(url: string, html: string): ScrapedBrandData {
  const title = extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i)
    || extractMeta(html, /property="og:title"\s+content="([^"]+)"/i) || '';
  const description = extractMeta(html, /name="description"\s+content="([^"]+)"/i)
    || extractMeta(html, /property="og:description"\s+content="([^"]+)"/i) || '';
  const ogImage = extractMeta(html, /property="og:image"\s+content="([^"]+)"/i) || '';
  const metaKeywords = (extractMeta(html, /name="keywords"\s+content="([^"]+)"/i) || '')
    .split(',').map(k => k.trim()).filter(Boolean);

  const headings: string[] = [];
  const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hM;
  while ((hM = hRe.exec(html)) !== null && headings.length < 20) {
    const t = stripTags(hM[1]).trim();
    if (t && t.length > 1 && t.length < 200) headings.push(t);
  }

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');
  body = stripTags(body).replace(/\s+/g, ' ').trim();
  if (body.length > MAX_TEXT_LENGTH) body = body.substring(0, MAX_TEXT_LENGTH) + '...';

  const colorSet = new Set<string>();
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let cM;
  while ((cM = hexRe.exec(html)) !== null) {
    const hex = cM[0].toLowerCase();
    if (!['#000000', '#ffffff', '#000', '#fff', '#333333', '#333'].includes(hex)) {
      colorSet.add(hex.length === 4 ? expandShortHex(hex) : hex);
    }
  }
  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  let rM;
  while ((rM = rgbRe.exec(html)) !== null) {
    const hex = rgbToHex(+rM[1], +rM[2], +rM[3]);
    if (!['#000000', '#ffffff'].includes(hex)) colorSet.add(hex);
  }

  const fontSet = new Set<string>();
  const skip = ['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace', 'cursive', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'Helvetica', 'Helvetica Neue'];
  const fRe = /font-family\s*:\s*([^;}"]+)/gi;
  let fM;
  while ((fM = fRe.exec(html)) !== null) {
    fM[1].split(',').map(f => f.trim().replace(/['"]/g, '').replace(/!important/g, '').trim())
      .filter(f => f && !skip.includes(f)).forEach(f => fontSet.add(f));
  }
  const gfRe = /fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/gi;
  let gM;
  while ((gM = gfRe.exec(html)) !== null) {
    decodeURIComponent(gM[1]).split('|').map(f => f.split(':')[0].trim()).forEach(f => fontSet.add(f));
  }

  const socialLinks: string[] = [];
  const sRe = /href="(https?:\/\/(?:www\.)?(?:instagram|facebook|twitter|x|tiktok|pinterest|linkedin|youtube)\.com\/[^"]+)"/gi;
  let sM;
  while ((sM = sRe.exec(html)) !== null) socialLinks.push(sM[1]);

  return {
    url, title, description, ogImage, textContent: body,
    cssColors: Array.from(colorSet).slice(0, 20),
    fontFamilies: Array.from(fontSet).slice(0, 10),
    metaKeywords, socialLinks: Array.from(new Set(socialLinks)).slice(0, 10), headings,
  };
}

export async function scrapeInstagramProfile(handle: string): Promise<{
  name: string; bio: string; ogImage: string; followers: string;
} | null> {
  try {
    let profileUrl = handle.trim();
    if (!profileUrl.startsWith('http')) {
      profileUrl = profileUrl.replace(/^@/, '');
      profileUrl = `https://www.instagram.com/${profileUrl}/`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(profileUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const name = extractMeta(html, /property="og:title"\s+content="([^"]+)"/i)
      || extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i) || '';
    const bio = extractMeta(html, /property="og:description"\s+content="([^"]+)"/i)
      || extractMeta(html, /name="description"\s+content="([^"]+)"/i) || '';
    const ogImage = extractMeta(html, /property="og:image"\s+content="([^"]+)"/i) || '';
    const fMatch = bio.match(/([\d,.]+[KMkm]?)\s*Followers/i);

    return { name, bio, ogImage, followers: fMatch ? fMatch[1] : '' };
  } catch (e) {
    console.error(`Instagram scrape failed for ${handle}:`, e);
    return null;
  }
}

function stripTags(html: string): string { return html.replace(/<[^>]+>/g, ' '); }

function extractMeta(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'") : null;
}

function expandShortHex(hex: string): string {
  const h = hex.replace('#', '');
  return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
