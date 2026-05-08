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
  // For multi-axis lenses (Tendencias and Live Signals) Sonar groups
  // its findings into multiple buckets. We flatten the buckets into a
  // single results array with this tag so the UI can group by
  // dimension while the existing select / edit / remove flow stays
  // unchanged.
  //   Tendencias  → theme | category | color | material
  //   Live Signals → street_style | social_media | retail_signals | cultural_moments
  dimension?:
    | 'theme'
    | 'category'
    | 'color'
    | 'material'
    | 'street_style'
    | 'social_media'
    | 'retail_signals'
    | 'cultural_moments';
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
  collectionContext?: {
    collectionName?: string;
    consumer?: string;
    // Live Signals reads the Tendencias framing chips (product
    // categories, gender, style genre, season). Without these,
    // Sonar searches "what's hot in {city} street style" globally
    // and drifts to running sneakers / balletcore. With them, every
    // axis (street/social/retail/cultural) stays anchored to the
    // collection's product universe.
    siblingTrendsFocus?: string;
  },
  excludeTitles?: string[],
  language?: string,
  // When set, narrows multi-axis research (Tendencias or Live Signals)
  // to a single bucket. Used by the "+ Más {axis}" buttons in the UI
  // to deepen one dimension without regenerating the whole grid.
  targetDimension?:
    | 'theme'
    | 'category'
    | 'color'
    | 'material'
    | 'street_style'
    | 'social_media'
    | 'retail_signals'
    | 'cultural_moments',
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

  // The collection name is intentionally NOT exposed to Sonar.
  // Earlier we passed `Collection: "SS27 SLAIZ"` here and the LLM
  // started using it as a brand placeholder in outputs ("brecha para
  // SLAIZ" inside a competitor card), which is wrong twice over: it's
  // a working title, not a brand, and it's also a privacy leak if the
  // output ever leaves the workspace. Sonar gets season + consumer +
  // framing chips — that's enough for grounded research.
  const collectionInfo = '';
  // Anti-leak rule appended to every research prompt. Forbids any
  // output field from naming the user's collection or brand. The rule
  // is explicit because Sonar will otherwise infer one from context.
  const antiLeakRule = `\n\nANTI-LEAK RULE: Your output must NEVER name the user's collection, brand, working title, or any internal label (real or fictional). Refer to the user's side generically as "your collection", "this brand", or "the user". Never invent a brand name for the user. Never echo any string that looks like a working title.`;

  switch (type) {
    case 'global':
      // Tendencias (merged Global + Deep) — return four axes by default.
      // When targetDimension is set, narrow to that single bucket and
      // return MORE depth on that axis (used by the "+ Más temas /
      // categorías / colores / materiales" buttons in the UI).
      {
        const themesBlock = `THEMES — concept-level cultural energy or aesthetic mood.
  HARD RULES:
  · NOT a colour name → if the title is a colour ("Tonos Morados", "Verde Azur", "Cherry Red"), it belongs in COLORS, never here.
  · NOT a product type → if the title is a piece ("Mocasines", "Vestidos Lenceros", "Blazers"), it belongs in CATEGORIES, never here.
  · NOT a fabric or finish → if the title is a textile ("Encaje", "Punto Jersey", "Satén"), it belongs in MATERIALS, never here.
  · NOT a print pattern → if the title is a print ("Lunares", "Flores Tridimensionales"), it belongs in MATERIALS or CATEGORIES.
  Themes are MOODS / ENERGIES / CULTURAL FORCES.
  · "title": Vogue/WWD headline (2-4 words). GOOD: "Quiet Luxury" · "Sheer Everything" · "Y2K Resurgence" · "The New Prep" · "Dark Romance" · "Balletcore Minimal" · "Utilitario Chic". BAD: "Tonos Morados Expresivos" · "Mocasines Sofisticados" · "Encaje Romántico" · "Lunares Gráficos".
  · "desc": 50-70 words — cultural force, brands embodying it, wearer signal.`;
        const categoriesBlock = `CATEGORIES — specific product types trending.
  HARD RULES:
  · A category is a piece you'd put on a buy sheet (silhouette + qualifier).
  · NOT a mood ("Quiet Luxury" is a theme). NOT a fabric ("Mesh" is a material). NOT a colour.
  · "title": Product type + qualifier (2-4 words). GOOD: "Mesh Ballet Flats" · "Bias-cut Slips" · "Barn Jacket" · "Tailored Bermudas" · "Knit Polo". BAD: "Quiet Luxury" · "Cherry Red" · "Liquid Jersey".
  · "desc": 50-70 words — silhouette, who wears it, styling, brands doing it best.`;
        const colorsBlock = `COLORS — color stories of the season.
  HARD RULES:
  · A color card has a single colour as the focus. NOT a print, NOT a fabric, NOT a mood.
  · "title": Color name (1-3 words). GOOD: "Cherry Red" · "Butter Yellow" · "Powder Blue" · "Chocolate Brown" · "Sage". BAD: "Tonos Morados Expresivos" (too verbose; just "Morado" or "Lila") · "Lunares Gráficos" (that's a print) · "Romantic Florals" (that's a theme).
  · "desc": 50-70 words — what materials carry it best, which designers championed it, mood it conveys.
  · "hex": REQUIRED. HEX colour code (format "#RRGGBB"). Closest match if a runway colour was only described in words. NEVER omit.`;
        const materialsBlock = `MATERIALS — fabric, finish and construction trends.
  HARD RULES:
  · A material card focuses on the textile / construction / finish itself.
  · NOT a mood, NOT a colour, NOT a product silhouette.
  · "title": Material or technique (1-4 words). GOOD: "Liquid Jersey" · "Vegetable-tanned Leather" · "Mesh Panels" · "Raw-edge Denim" · "Sheer Organza". BAD: "Romanticismo Etéreo" (theme) · "Vestidos Lenceros" (category) · "Cherry Red" (colour).
  · "desc": 50-70 words — feel, weight (gsm if known), drape, silhouettes it favours, brands working with it.`;

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
        //
        //    Source list curated to publications where trends are
        //    actually analyzed in depth (not just photo dumps). The
        //    LLM should treat these as primary reference points and
        //    cross-reference everything it returns against what the
        //    user's framing chips already imply.
        const contextHeader = `${collectionInfo}${seasonNote}
${trendQuery ? `\nIMPORTANT: The user's framing chips for this collection: "${trendQuery}". Cross-reference EVERY card you return against these — a finding only counts if it intersects with the user's chips. Don't generalise.\n` : ''}
RESEARCH SOURCES — pull only from publications where trends are seriously analysed. Treat these as primary:
  · Vogue Runway · Tag Walk · The Impression · Harper's Bazaar · Numero Magazine
  · Business of Fashion (BoF) · WWD · Highsnobiety · NSS Magazine · SSENSE editorial
  · Hypebeast / Hypebae · The Cut · 032c · 1 Granary · Dazed · i-D
  · Street-style coverage from Vogue.com / Tag Walk for the recent season.

Method: research these sources, identify recurring patterns across at least 2-3 of them, and only then propose a card. Do NOT invent trends that aren't backed by the sources. Reference real designers and shows in the desc.`;

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
${antiLeakRule}

${exclusionNote}Return ONLY valid JSON in this EXACT shape (no other keys, no extra wrapping):
${jsonShape}`;
      }
      break;

    case 'deep-dive':
      prompt = `${seasonNote}

You are doing a deep dive on: "${trendQuery}"

Find 6-8 SPECIFIC MICRO-TRENDS in this area from Vogue, Tag Walk, runway shows, and street style coverage. Design-level details — specific looks, constructions, materials, finishes.

For EACH micro-trend:
- "title": Concrete name (e.g., "Mesh Panel Sneakers", "Raw-Edge Denim", "Butter Yellow")
- "brands": 3-5 brands doing this
- "desc": 60-80 words — what it looks like, how to execute it, shelf life (flash/wave/staying)
- "relevance": "high" or "medium"
${antiLeakRule}

${exclusionNote}Return ONLY valid JSON: {"results": [{"title":"...","brands":"...","desc":"...","relevance":"high"}]}`;
      break;

    case 'live-signals':
      // Live Signals is a LOCATION-FIRST scan structured across four
      // axes — same canonical pattern as Tendencias but in the
      // present-tense (last 3 months) and grounded in the user's city
      // chips. Sonar searches each axis WITHIN the cities the user
      // has on screen (whatever their framing chips are at trigger
      // time) and returns four buckets we flatten with `dimension`.
      //
      // Audience reuses the consumer context that Tendencias already
      // had — we don't repeat demographics here, we reference the
      // SAME consumer profile.
      {
        const streetBlock = `STREET STYLE — what real people are wearing right now in the cities/neighborhoods listed.
  HARD RULES:
  · NOT a runway prediction. NOT a generic mood. Concrete pieces and looks people are wearing on the street.
  · Sources: street-style coverage from Vogue.com, Tag Walk, Hypebae, The Cut, Highsnobiety, neighborhood-tagged Instagram accounts, TikTok #ootd / #streetstyle, Pinterest "spotted" boards.
  · "title": Concrete look name (2-4 words). GOOD: "Sheer Layered Tights" · "Bermuda + Loafers" · "Slouchy Barrel Jeans" · "Knit Polo Tucked".
  · "desc": 50-70 words — what it looks like, WHICH city/neighborhood it's been spotted in, type of person wearing it, when (last weeks), brands they're styling.`;
        const socialBlock = `SOCIAL MEDIA — what's viral or trending on platforms tied to these locations.
  HARD RULES:
  · Pull only from publicly trackable platforms: TikTok hashtags / sounds / search trends, Instagram reels / accounts, Pinterest "most saved", Reddit r/femalefashionadvice / r/malefashionadvice / r/streetwear, X/Twitter fashion threads.
  · "title": Hashtag, look name, or viral idea (2-4 words). GOOD: "#tabiflats" · "Mob Wife Aesthetic" · "Tomato Girl Summer" · "Quiet Luxury Backlash".
  · "desc": 50-70 words — what the trend visually looks like, which platform / sub-platform drives it, hashtag count or view count if known, which cities/neighborhoods amplify it most, who started it.`;
        const retailBlock = `RETAIL SIGNALS — what's selling out / new pop-ups / store changes in these cities right now.
  HARD RULES:
  · Concrete commerce signals only. NOT runway. NOT social.
  · Examples to look for: items selling out at Zara/COS/Arket/&OS/Massimo Dutti/Uniqlo C/Mango/H&M Studio, sold-out drops at independents (Ssense / Mr Porter / End / Browns), new pop-ups, new flagship stores, brand entries / exits in given neighborhoods, resale heatmap on Vinted / Depop / Vestiaire.
  · "title": Concrete commerce headline (2-5 words). GOOD: "COS Mesh Ballet Sold Out" · "Loewe Bushwick Pop-up" · "Vinted Bermuda Spike".
  · "desc": 50-70 words — exact retailer/brand, the city/neighborhood, what's happening, why it matters (price tier, audience, what it signals about taste).`;
        const culturalBlock = `CULTURAL MOMENTS — celebrity outfits / film / TV / music / events that are shaping fashion conversation.
  HARD RULES:
  · NOT a generic theme. NOT a runway. Concrete cultural moments with a wearer + a piece + a date.
  · Examples: viral red-carpet moments, "as worn by" Instagram posts, costume design that's bleeding into street style, music-video looks, A-list paparazzi shots.
  · "title": "[Wearer] in [piece] / [moment]" (2-5 words). GOOD: "Zendaya Vintage Mugler" · "The Bear Costume" · "Charli XCX Vinyl" · "Saltburn Jacket Revival".
  · "desc": 50-70 words — who, what they wore, when, how it's reverberating in the cities listed, what's selling because of it.`;

        type LiveDimSpec = { plural: string; block: string; jsonKey: string };
        const liveTargetMap: Record<string, LiveDimSpec> = {
          street_style:      { plural: 'street style looks',  block: streetBlock,    jsonKey: 'street_style' },
          social_media:      { plural: 'social signals',      block: socialBlock,    jsonKey: 'social_media' },
          retail_signals:    { plural: 'retail signals',      block: retailBlock,    jsonKey: 'retail_signals' },
          cultural_moments:  { plural: 'cultural moments',    block: culturalBlock,  jsonKey: 'cultural_moments' },
        };

        const consumerLine = collectionContext?.consumer
          ? `Consumer profile (already established for this collection — REUSE, don't repeat the demographics in your output):\n${collectionContext.consumer}\n`
          : '';

        // Tendencias' framing chips inherited verbatim. These are
        // the product categories / gender / style genre / season the
        // user already locked in on the trends lens. Live Signals'
        // four axes MUST stay inside this universe — that's what
        // makes the signals relevant to THIS collection rather than
        // generic street-style hits (running sneakers, balletcore).
        const siblingFramingLine = collectionContext?.siblingTrendsFocus
          ? `PRODUCT UNIVERSE — Tendencias framing chips already locked in for this collection: "${collectionContext.siblingTrendsFocus}". EVERY card across every axis must intersect with this universe (e.g. if the chips include "Mujer · Sastrería · Knitwear · Vestidos · Calzado plano", do NOT return men's running sneakers, do NOT return basketball gear, do NOT return generic athleisure unless those chips include athleisure / sportswear). The signals are about WHO this consumer is and WHAT she wears — filter every street-style / social / retail / cultural finding through that lens.\n`
          : '';

        const liveContextHeader = `${collectionInfo}${seasonNote}
${consumerLine}${siblingFramingLine}
${trendQuery ? `LOCATIONS — search WITHIN these cities/neighborhoods the user has on screen: "${trendQuery}". EVERY card you return must be tied to ONE of these locations (named explicitly in title or desc). Don't generalise to "global street style".\n` : ''}
RESEARCH SOURCES — pull from where live signals are tracked:
  · Street style: Vogue.com street style, Tag Walk, Hypebae, The Cut, Highsnobiety, neighborhood-tagged Instagram, TikTok #ootd / #streetstyle.
  · Social: TikTok hashtags / sounds, Instagram reels, Pinterest most-saved, r/femalefashionadvice / r/malefashionadvice / r/streetwear, X fashion threads.
  · Retail: Zara / COS / Arket / & Other Stories / Massimo Dutti / Uniqlo C / Mango / H&M Studio "sold out" pages, Ssense / Mr Porter / End / Browns drops, Vinted / Depop / Vestiaire heatmaps, store openings press.
  · Cultural: red-carpet coverage, costume design press, "as worn by" Instagram, music videos, paparazzi.

Method: scan these sources for the LAST 3 MONTHS only. A card only counts if it's grounded in something concrete (a sold-out item, a viral hashtag with view count, a celebrity outfit on a known date, a real pop-up). NEVER invent. Reference real names, real cities, real platforms.`;

        let liveAskBody = '';
        let liveJsonShape = '';

        if (targetDimension && liveTargetMap[targetDimension]) {
          const spec = liveTargetMap[targetDimension];
          liveJsonShape = `{ "${spec.jsonKey}": [{"title":"...","brands":"...","desc":"..."}, ...] }`;
          const existingBlock = existingInDimension && existingInDimension.length > 0
            ? `\nThe user already has these ${spec.plural.toUpperCase()} from your earlier research:\n${existingInDimension.map(c => `  · ${c.title}${c.desc ? ` — ${c.desc.slice(0, 100)}` : ''}`).join('\n')}\n\nDeepen this axis: give me 3-5 MORE ${spec.plural} that COMPLEMENT (don't repeat or paraphrase) what's above.`
            : `\nGive me 4-6 ${spec.plural}.`;
          liveAskBody = `${spec.block}
${existingBlock}

For EVERY card include "brands" (3-5 names — brands, people, accounts, neighborhoods, or platforms driving this).`;
        } else {
          liveJsonShape = `{
  "street_style":     [{"title":"...","brands":"...","desc":"..."}, ...],
  "social_media":     [{"title":"...","brands":"...","desc":"..."}, ...],
  "retail_signals":   [{"title":"...","brands":"...","desc":"..."}, ...],
  "cultural_moments": [{"title":"...","brands":"...","desc":"..."}, ...]
}`;
          liveAskBody = `Research live fashion signals across FOUR DIMENSIONS — all grounded in the listed cities, all from the LAST 3 MONTHS. Each dimension is a separate bucket. NEVER mix. NEVER duplicate across dimensions.

DIMENSION 1 · ${streetBlock}
(produce 3-5 cards)

DIMENSION 2 · ${socialBlock}
(produce 3-5 cards)

DIMENSION 3 · ${retailBlock}
(produce 3-5 cards)

DIMENSION 4 · ${culturalBlock}
(produce 3-4 cards)

For EVERY card across all dimensions, also include "brands" (3-5 names — brands, people, accounts, neighborhoods, or platforms driving this).`;
        }

        prompt = `${liveContextHeader}

${liveAskBody}
${antiLeakRule}

${exclusionNote}Return ONLY valid JSON in this EXACT shape (no other keys, no extra wrapping):
${liveJsonShape}`;
      }
      break;

    case 'competitors':
      // Competitors prompt: the user passes a list of brand names in
      // trendQuery. The model analyses positioning vs THEIR brand
      // generically — never naming the user's collection or working
      // title. The opportunity / gap field is phrased as "for a brand
      // sitting in this space" so the LLM doesn't try to invent a
      // placeholder name from context.
      prompt = `Analyze these fashion brands as competitive landscape: "${trendQuery}"

For EACH brand mentioned, provide:
- "title": "Brand Name: Key Insight" (e.g., "COS: Affordable Minimalism Gap")
- "brands": The brand + 2-3 closest competitors at same tier
- "desc": 60-80 words — price range (real € numbers), positioning, what they do well, and the gap or opportunity a NEW brand entering this space could exploit (refer to that new brand only as "a new entrant", "your collection", or "the user" — NEVER invent or echo any specific name)
- "relevance": "high" or "medium"
${antiLeakRule}

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
          content: 'You are a senior fashion trend analyst writing for designers who will actually use your research. You read the major fashion publications closely (Vogue Runway, Tag Walk, The Impression, Harper\'s Bazaar, Numero, Business of Fashion, Highsnobiety, NSS Magazine, SSENSE editorial, The Cut, 032c, Dazed, WWD) and synthesize what they\'re collectively saying. Every trend you return must be backed by recurring coverage across multiple of these sources — not invented, not generalised, not from one isolated mention. Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON.',
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
      const buckets: Array<[NonNullable<TrendResult['dimension']>, string]> = [
        // Tendencias
        ['theme', 'themes'],
        ['category', 'categories'],
        ['color', 'colors'],
        ['material', 'materials'],
        // Live Signals
        ['street_style', 'street_style'],
        ['social_media', 'social_media'],
        ['retail_signals', 'retail_signals'],
        ['cultural_moments', 'cultural_moments'],
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
