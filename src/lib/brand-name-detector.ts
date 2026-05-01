/* ═══════════════════════════════════════════════════════════════════
   Brand-name detector for share-link / PDF-export sanity checks.

   Scans a deck-shaped JSON blob (presentation_deck_overrides,
   workspace_data, the rendered slide payload, etc.) for mentions of
   third-party brand names. The legal disclaimer that ships in
   share-link footers + PDF cover slides covers the bases, but for
   business-perfect we surface the matches to the user BEFORE they
   share so they can soften phrasing where it matters.

   The list is non-exhaustive on purpose. It's the set we know
   appears most often in fashion brand work in EU + US markets:
   sportswear, luxury houses, fast-fashion competitors, secondhand
   marketplaces, big tech / social platforms. Casing-tolerant; we
   trim word boundaries with \b so "Nikon" doesn't match "Nike" and
   "Maximus" doesn't match "Max Mara".
   ═══════════════════════════════════════════════════════════════════ */

const KNOWN_BRANDS: readonly string[] = [
  // Sportswear / streetwear
  'Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'ASICS', 'Converse', 'Vans',
  'Under Armour', 'Yeezy', 'Jordan', 'Off-White', 'Supreme', 'Stüssy', 'Palace',
  'Carhartt', 'Stone Island', 'Patagonia', 'Arc\'teryx', 'The North Face',
  'BAPE', 'Kith', 'Aimé Leon Dore', 'Clot', 'Fear of God', 'Essentials',
  // Denim / casual
  'Levi\'s', 'Diesel', 'Wrangler', 'Lee', 'Calvin Klein', 'Tommy Hilfiger',
  // Luxury
  'Hermès', 'Chanel', 'Louis Vuitton', 'Gucci', 'Prada', 'Dior', 'Burberry',
  'Versace', 'Balenciaga', 'Saint Laurent', 'Bottega Veneta', 'Loewe', 'Celine',
  'Margiela', 'Rick Owens', 'Dries Van Noten', 'Comme des Garçons', 'Issey Miyake',
  'Yohji Yamamoto', 'Acne Studios', 'Jacquemus', 'Toteme', 'The Row', 'Khaite',
  // Fast fashion
  'Zara', 'H&M', 'Uniqlo', 'Mango', 'Bershka', 'Pull&Bear', 'Stradivarius',
  'Massimo Dutti', 'COS', 'Arket', 'Other Stories',
  // Sustainable / mid-market
  'Allbirds', 'Veja', 'Stella McCartney', 'Reformation', 'Everlane', 'Pangaia',
  // Marketplaces / resale
  'Vinted', 'Vestiaire Collective', 'Depop', 'eBay', 'Amazon', 'Wallapop',
  'ASOS', 'Zalando', 'Shein', 'Temu', 'Farfetch', 'SSENSE', 'Net-a-Porter',
  'Mytheresa',
  // Big tech / social platforms
  'Discord', 'Telegram', 'WhatsApp', 'Instagram', 'TikTok', 'Twitter', 'Facebook',
  'Snapchat', 'YouTube', 'Spotify', 'Apple', 'Google', 'Microsoft', 'Meta',
  'Twitch', 'Pinterest', 'LinkedIn', 'Reddit',
  // Beauty (for cross-category collabs)
  'Sephora', 'Glossier', 'Charlotte Tilbury', 'Fenty Beauty',
];

interface DetectionHit {
  brand: string;
  contextSnippet: string; // surrounding ~80 chars to help the user locate the mention
}

/* Build a single regex that matches any brand name with word
   boundaries, case-insensitive. Special chars in brand names
   (apostrophe, ampersand, hyphen) are escaped first. The boundary
   handling avoids false positives like Nikon/Nike or Maximus/Max. */
function buildBrandRegex(brands: readonly string[]): RegExp {
  const escaped = brands
    .map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length); // longest first so "New Balance" wins over "New"
  return new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'gi');
}

const BRAND_REGEX = buildBrandRegex(KNOWN_BRANDS);

function walk(value: unknown, hits: Map<string, DetectionHit>): void {
  if (typeof value === 'string') {
    BRAND_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BRAND_REGEX.exec(value)) !== null) {
      const brand = match[1];
      // Normalize the matched brand to its canonical casing from the list
      const canonical = KNOWN_BRANDS.find(
        (b) => b.toLowerCase() === brand.toLowerCase(),
      ) || brand;
      if (hits.has(canonical)) continue; // dedupe — first hit wins for snippet
      const start = Math.max(0, match.index - 40);
      const end = Math.min(value.length, match.index + brand.length + 40);
      const snippet = value.slice(start, end).replace(/\s+/g, ' ').trim();
      hits.set(canonical, {
        brand: canonical,
        contextSnippet: (start > 0 ? '…' : '') + snippet + (end < value.length ? '…' : ''),
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walk(v, hits);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) walk(v, hits);
  }
}

/**
 * Scan an arbitrary JSON-ish payload for known third-party brand
 * mentions. Returns one hit per brand (deduped) with a context
 * snippet to help the user locate the mention.
 */
export function detectBrandNames(payload: unknown): DetectionHit[] {
  const hits = new Map<string, DetectionHit>();
  walk(payload, hits);
  return Array.from(hits.values()).sort((a, b) => a.brand.localeCompare(b.brand));
}

/**
 * Build a compact warning string suitable for an HTTP header. Keeps
 * the brand list under ~250 chars so it fits comfortably in a
 * `X-Brand-Names-Detected` header without tripping any reverse-proxy
 * limit. Returns null if nothing was found.
 */
export function buildBrandNamesWarningHeader(hits: DetectionHit[]): string | null {
  if (hits.length === 0) return null;
  const list = hits.map((h) => h.brand).join(', ');
  return list.length <= 250 ? list : list.slice(0, 247) + '…';
}
