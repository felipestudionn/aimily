/**
 * Full prompt testing script — simulates a complete user journey
 * Brand: MAISON LÚNA — Premium women's footwear, SS27
 *
 * Run: npx tsx scripts/test-all-prompts.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function callHaiku(system: string, user: string, temperature = 0.7): Promise<string> {
  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
    temperature,
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

function extractJSON<T = unknown>(text: string): T {
  try { return JSON.parse(text) as T; } catch {}
  const cbm = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cbm) { try { return JSON.parse(cbm[1].trim()) as T; } catch {} }
  const fb = text.indexOf('{'), lb = text.lastIndexOf('}');
  if (fb !== -1 && lb > fb) { try { return JSON.parse(text.slice(fb, lb + 1)) as T; } catch {} }
  const fk = text.indexOf('['), lk = text.lastIndexOf(']');
  if (fk !== -1 && lk > fk) { try { return JSON.parse(text.slice(fk, lk + 1)) as T; } catch {} }
  throw new Error(`JSON extraction failed: ${text.slice(0, 200)}`);
}

async function testJSON(label: string, system: string, user: string, temp = 0.7) {
  const start = Date.now();
  process.stdout.write(`\n${'═'.repeat(70)}\n🧪 ${label}\n${'─'.repeat(70)}\n`);
  try {
    const raw = await callHaiku(system, user, temp);
    const data = extractJSON(raw);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const json = JSON.stringify(data, null, 2);
    console.log(`✅ Haiku · ${elapsed}s\n`);
    console.log(json.slice(0, 3000));
    if (json.length > 3000) console.log('\n... (truncated)');
    return data;
  } catch (err) {
    console.error(`❌ ${((Date.now() - start) / 1000).toFixed(1)}s — ${(err as Error).message}`);
    return null;
  }
}

async function testText(label: string, system: string, user: string, temp = 0.7) {
  const start = Date.now();
  process.stdout.write(`\n${'═'.repeat(70)}\n🧪 ${label}\n${'─'.repeat(70)}\n`);
  try {
    const text = await callHaiku(system, user, temp);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ Haiku · ${elapsed}s\n`);
    console.log(text.slice(0, 2000));
    if (text.length > 2000) console.log('\n... (truncated)');
    return text;
  } catch (err) {
    console.error(`❌ ${((Date.now() - start) / 1000).toFixed(1)}s — ${(err as Error).message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// Import the real prompt builders
// ═══════════════════════════════════════════════════════
import { buildCreativePrompt } from '../src/lib/ai/creative-prompts';
import { buildMerchPrompt } from '../src/lib/ai/merch-prompts';
import { buildDesignPrompt } from '../src/lib/ai/design-prompts';

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║  AIMILY — Full Prompt Test Suite                                  ║
║  Brand: MAISON LÚNA · Premium Women's Footwear · SS27            ║
║  LLM: Claude Haiku 4.5                                           ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }
  console.log(`API Key loaded: ${ANTHROPIC_API_KEY.slice(0, 12)}...`);

  // ─────────── BLOCK 1: CREATIVE (10 types) ───────────

  // 1. Consumer Assisted (text response)
  const p1 = buildCreativePrompt('consumer-assisted', {
    season: 'SS27', collectionName: 'Lumière',
    keywords: 'Mediterranean woman, 28-40, architect or designer, values quality over quantity, shops The Row and Lemaire, natural fabrics',
  })!;
  await testText('CREATIVE › Consumer Assisted', p1.system, p1.user, p1.temperature);

  // 2. Consumer Proposals (JSON)
  const p2 = buildCreativePrompt('consumer-proposals', {
    season: 'SS27', collectionName: 'Lumière',
    direction: 'Mediterranean creative professional, 28-40, The Row / Lemaire customer',
  })!;
  await testJSON('CREATIVE › Consumer Proposals', p2.system, p2.user, p2.temperature);

  // 3. Vibe Assisted (text)
  const p3 = buildCreativePrompt('vibe-assisted', {
    season: 'SS27', collectionName: 'Lumière',
    keywords: 'sun-bleached stone, Aegean light, modernist architecture, bare feet on warm marble',
    consumer: 'Mediterranean creative professional, 28-40',
  })!;
  await testText('CREATIVE › Vibe Assisted', p3.system, p3.user, p3.temperature);

  // 4. Vibe Proposals (JSON)
  const p4 = buildCreativePrompt('vibe-proposals', {
    season: 'SS27', collectionName: 'Lumière',
    direction: 'Aegean summer light, modernist architecture, natural materials, bare sophistication',
    consumer: 'Creative professionals 28-40',
  })!;
  await testJSON('CREATIVE › Vibe Proposals', p4.system, p4.user, p4.temperature);

  // 5. Brand Extract (JSON)
  const p5 = buildCreativePrompt('brand-extract', {
    season: 'SS27', collectionName: 'Lumière',
    instagram: '@therow', website: 'https://www.therow.com',
  })!;
  await testJSON('CREATIVE › Brand Extract', p5.system, p5.user, p5.temperature);

  // 6. Brand Generate (JSON)
  const p6 = buildCreativePrompt('brand-generate', {
    season: 'SS27', collectionName: 'Lumière',
    direction: 'MAISON LÚNA: premium footwear. Mediterranean minimalism, warm neutrals, architectural shapes, natural materials.',
    consumer: 'Creative professionals 28-40',
  })!;
  await testJSON('CREATIVE › Brand Generate', p6.system, p6.user, p6.temperature);

  // 7. Trends Global (JSON)
  const p7 = buildCreativePrompt('trends-global', {
    season: 'SS27', collectionName: 'Lumière',
    consumer: 'Mediterranean creative professionals, premium footwear',
  })!;
  await testJSON('CREATIVE › Trends Global', p7.system, p7.user, p7.temperature);

  // 8. Trends Deep Dive (JSON)
  const p8 = buildCreativePrompt('trends-deep-dive', {
    season: 'SS27', collectionName: 'Lumière',
    category: 'Premium Women\'s Footwear', consumer: 'Creative professionals 28-40',
  })!;
  await testJSON('CREATIVE › Trends Deep Dive', p8.system, p8.user, p8.temperature);

  // 9. Trends Live Signals (JSON)
  const p9 = buildCreativePrompt('trends-live-signals', {
    season: 'SS27', collectionName: 'Lumière',
    consumer: 'Creative professionals 28-40',
  })!;
  await testJSON('CREATIVE › Trends Live Signals', p9.system, p9.user, p9.temperature);

  // 10. Trends Competitors (JSON)
  const p10 = buildCreativePrompt('trends-competitors', {
    season: 'SS27', collectionName: 'Lumière',
    consumer: 'Creative professionals 28-40',
    references: 'The Row, Lemaire, Bottega Veneta, Khaite',
  })!;
  await testJSON('CREATIVE › Trends Competitors', p10.system, p10.user, p10.temperature);

  // ─────────── BLOCK 2: MERCHANDISING (8 types) ───────────

  const mc = {
    season: 'SS27', collectionName: 'Lumière',
    consumer: 'Mediterranean creative professionals, 28-40, avg basket €300-500',
    vibe: 'Aegean summer light, modernist architecture, natural materials',
    brandDNA: 'Mediterranean minimalism, warm neutrals, architectural shapes',
  };

  const m1 = buildMerchPrompt('families-assisted', { ...mc, direction: 'Premium footwear: sandals, mules, loafers, boots. Italian craftsmanship, natural leathers.' })!;
  await testJSON('MERCH › Families Assisted', m1.system, m1.user, m1.temperature);

  const m2 = buildMerchPrompt('families-proposals', mc)!;
  await testJSON('MERCH › Families Proposals', m2.system, m2.user, m2.temperature);

  const m3 = buildMerchPrompt('pricing-assisted', { ...mc, families: 'Sandals 35%, Mules 25%, Loafers 25%, Boots 15%', direction: 'Entry €180-220, core €280-380, premium €450-650. Compete with ATP Atelier.' })!;
  await testJSON('MERCH › Pricing Assisted', m3.system, m3.user, m3.temperature);

  const m4 = buildMerchPrompt('pricing-proposals', { ...mc, families: 'Sandals 35%, Mules 25%, Loafers 25%, Boots 15%' })!;
  await testJSON('MERCH › Pricing Proposals', m4.system, m4.user, m4.temperature);

  const m5 = buildMerchPrompt('channels-assisted', { ...mc, families: 'Sandals, Mules, Loafers, Boots', pricing: '€180-650', direction: 'DTC primary, wholesale Ssense + Net-a-Porter, pop-up Barcelona.' })!;
  await testJSON('MERCH › Channels Assisted', m5.system, m5.user, m5.temperature);

  const m6 = buildMerchPrompt('channels-proposals', { ...mc, families: 'Sandals, Mules, Loafers, Boots', pricing: '€180-650' })!;
  await testJSON('MERCH › Channels Proposals', m6.system, m6.user, m6.temperature);

  const m7 = buildMerchPrompt('budget-assisted', { ...mc, families: 'Sandals 35%, Mules 25%, Loafers 25%, Boots 15%', pricing: '€180-650', channels: 'DTC 60%, Wholesale 30%, Pop-up 10%', markets: 'Spain, France, Italy, UK', direction: 'Target €450K, 30 SKUs, margin 68%.' })!;
  await testJSON('MERCH › Budget Assisted', m7.system, m7.user, m7.temperature);

  const m8 = buildMerchPrompt('budget-proposals', { ...mc, families: 'Sandals 35%, Mules 25%, Loafers 25%, Boots 15%', pricing: '€180-650', channels: 'DTC 60%, Wholesale 30%, Pop-up 10%', markets: 'Spain, France, Italy, UK' })!;
  await testJSON('MERCH › Budget Proposals', m8.system, m8.user, m8.temperature);

  // ─────────── BLOCK 3: DESIGN (4 types) ───────────

  const dc = {
    season: 'SS27', collectionName: 'Lumière',
    consumer: 'Creative professionals 28-40',
    vibe: 'Aegean light, modernist architecture',
    brandDNA: 'Mediterranean minimalism, warm neutrals',
  };

  const d1 = buildDesignPrompt('sketch-suggest', { ...dc, productType: 'Sandal', family: 'Sandals', subcategory: 'Flat Sandal', concept: 'Minimalist flat sandal, architectural strapping, vegetable-tanned leather', priceRange: '€280-350' })!;
  await testJSON('DESIGN › Sketch Suggest', d1.system, d1.user, d1.temperature);

  const d2 = buildDesignPrompt('color-suggest', { ...dc, productType: 'Sandal', family: 'Sandals', subcategory: 'Flat Sandal', concept: 'Minimalist flat sandal, architectural straps', priceRange: '€280-350' })!;
  await testJSON('DESIGN › Color Suggest', d2.system, d2.user, d2.temperature);

  const d3 = buildDesignPrompt('materials-suggest', { ...dc, productType: 'Sandal', subcategory: 'Flat Sandal', priceRange: '€280-350', designDirection: 'Architectural strapping, clean lines, Italian craftsmanship' })!;
  await testJSON('DESIGN › Materials Suggest', d3.system, d3.user, d3.temperature);

  const d4 = buildDesignPrompt('catalog-description', { ...dc, productType: 'Sandal', family: 'Sandals', subcategory: 'Flat Sandal', concept: 'The ARCO — minimalist flat sandal with asymmetric leather strapping. Italian vegetable-tanned nappa, cushioned insole, stacked heel 15mm.', priceRange: '€320' })!;
  await testJSON('DESIGN › Catalog Description', d4.system, d4.user, d4.temperature);

  // ─────────── BLOCK 4: COPY ENDPOINTS (5 modes) ───────────

  await testJSON('COPY › Product Description',
    `You are a senior fashion copywriter who has written for Net-a-Porter and Ssense. Never generic.
BRAND: MAISON LÚNA | Voice: Warm, architectural, sensory | Target: Creative professionals 28-40
RULES: Write copy that could ONLY belong to this brand. Use sensory language. Avoid "elevate", "curate", "versatile", "timeless". Return ONLY raw JSON.`,
    `Product: ARCO Flat Sandal | Category: Footwear | Family: Sandals | Price: €320
Colorways: Sand, Terracotta, Bone
Notes: Asymmetric strapping inspired by Roman aqueduct arches. Italian vegetable-tanned nappa, hand-stitched, cushioned leather insole, stacked heel 15mm.
Return JSON: { "headline": "max 8 words", "description": "2-3 sentences", "features": ["3-5 bullets"], "care": "materials + care" }`, 0.7);

  await testJSON('COPY › Brand Story',
    `You are a brand strategist. Authentic founding narratives, not manufactured. Return ONLY raw JSON.
BRAND: MAISON LÚNA | Tagline: "Walk in light" | Founded by Spanish architect turned footwear designer, Alicante.`,
    `Write a brand story. Return JSON: { "narrative": "2-3 paragraphs", "values": ["3-5 ownable values"], "vision": "1 sentence" }`, 0.8);

  await testJSON('COPY › SEO Meta',
    `You are a fashion e-commerce SEO specialist. Meta that ranks AND converts. Return ONLY raw JSON. BRAND: MAISON LÚNA`,
    `Product: ARCO Flat Sandal | Category: Sandals | Price: €320
Return JSON: { "meta_title": "max 60 chars", "meta_description": "max 155 chars", "alt_text": "image alt", "keywords": ["8-12 long-tail"] }`, 0.5);

  await testJSON('COPY › Social Caption (Instagram)',
    `You are a social media creative director for fashion. Captions that stop the scroll. Return ONLY raw JSON.
BRAND: MAISON LÚNA | Voice: Warm, architectural | Target: Creative professionals 28-40`,
    `Instagram caption for ARCO Flat Sandal (€320, leather, architectural strapping).
Rules: max 2200 chars, hook first line, up to 15 hashtags.
Return JSON: { "caption": "full text with line breaks", "hashtags": ["without #"], "cta": "call-to-action" }`, 0.75);

  await testJSON('COPY › Email Template (Launch)',
    `You are a CRM director for premium fashion. Personal, not promotional. Return ONLY raw JSON.
BRAND: MAISON LÚNA | Voice: Warm, architectural, sensory`,
    `Write a launch email for SS27 collection "Lumière".
Return JSON: { "subject_line": "max 50 chars", "preview_text": "max 90 chars", "heading": "hero headline", "body": "2-3 paragraphs", "cta_text": "button text", "cta_url_placeholder": "{{collection_url}}" }`, 0.7);

  // ─────────── BLOCK 5: STANDALONE ENDPOINTS ───────────

  await testJSON('STANDALONE › Analyze Text (Reddit post)',
    `You are a senior fashion trend analyst. Extract structured fashion intelligence from social text.
RULES: Be specific with items, use professional terminology, conservative with locations. Return ONLY raw JSON.`,
    `Analyze:
"Just got back from Barcelona and I'm OBSESSED with what everyone was wearing in El Born. So many women in these gorgeous woven leather sandals — artisan-made, thick straps. Saw Hereu and some brand called Pēkā. The whole vibe was linen-on-linen, natural colors, barely any logos. Basically if The Row was a neighborhood. Even older women doing this effortless Mediterranean thing with wide-leg trousers and flat sandals."
Return JSON: { "locations": [{ "name": "", "type": "neighborhood|city|country", "confidence": "low|medium|high" }], "fashion_items": [], "brands": [], "style_descriptors": [], "sentiment": "", "location_confidence": 0.0 }`, 0.3);

  await testJSON('STANDALONE › Market Trends (Footwear)',
    `You are a senior fashion trend forecaster at WGSN level. March 2026. Return ONLY raw JSON.`,
    `Professional trend report for SS27 women's footwear:
1. KEY COLORS (6-8): Pantone + context
2. KEY TRENDS (5-7): Name + designers + commercial relevance
3. KEY ITEMS (6-8): Specific piece + silhouette + materials
Return JSON: { "keyColors": [], "keyTrends": [], "keyItems": [], "seasonFocus": "", "lastUpdated": "2026-03-13" }`, 0.8);

  await testJSON('STANDALONE › Explore Trends — "Architectural Sandals"',
    `You are a senior fashion trend analyst. Deep-dive reports. Return ONLY raw JSON.`,
    `Deep-dive: "Architectural Sandals"
1. KEY COLORS (6-8): "Color (Pantone) — Context"
2. KEY TRENDS (5-7): "Trend — Connection"
3. KEY ITEMS (6-8): "Item — Full description"
4. DESCRIPTION: 4-5 sentences
Return JSON: { "query": "Architectural Sandals", "keyColors": [], "keyTrends": [], "keyItems": [], "description": "" }`, 0.7);

  await testJSON('STANDALONE › Generate Plan (SetupData)',
    `You are a senior fashion merchandiser. 15+ years at Inditex/LVMH. Return ONLY raw JSON.`,
    `Collection plan for:
Consumer: Creative professionals 28-40, Mediterranean, avg basket €300-500
Season: SS27 | Market: Spain, France, Italy | Categories: Footwear (Sandals, Mules, Loafers, Boots)
SKUs: 30 | Price: €180-650
Return JSON: { "totalSalesTarget": number, "monthlyDistribution": [12 nums summing to 100], "expectedSkus": 30, "families": [], "dropsCount": number, "avgPriceTarget": number, "targetMargin": number, "plannedDiscounts": number, "hasHistoricalData": false, "productCategory": "CALZADO", "productFamilies": [{"name":"","percentage":0}], "priceSegments": [{"name":"","minPrice":0,"maxPrice":0,"percentage":0}], "productTypeSegments": [{"type":"REVENUE","percentage":0}], "minPrice": 180, "maxPrice": 650 }`, 0.6);

  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 ALL TESTS COMPLETE — 27 prompts tested');
  console.log(`${'═'.repeat(70)}\n`);
}

main().catch(console.error);
