import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

const SYSTEM_PROMPT = `You are a senior fashion trend analyst with deep expertise in street style, social media culture, and retail intelligence.

You receive raw text from Reddit, YouTube, Pinterest, TikTok comments, and similar sources. Your job is to extract structured fashion intelligence — the kind a trend forecasting team at WGSN or Heuritech would produce.

EXTRACTION RULES:
- Fashion items: Be specific. Not "dress" but "midi wrap dress" or "oversized blazer." Include construction details when mentioned.
- Brands: Capture both luxury (Bottega Veneta) and contemporary (COS, Arket) references. Include designer names if mentioned as brands.
- Style descriptors: Use professional terminology. Not "nice" but "minimalist," "deconstructed," "tonal." Map casual language to industry terms (e.g., "clean girl" → "minimal-luxe").
- Locations: Only extract when clearly fashion-relevant (shopping districts, fashion capitals, neighborhood style tribes). Be conservative with confidence.
- Sentiment: Gauge commercial intent — is the person aspiring to buy, critiquing, or merely observing?

Return ONLY raw JSON, no markdown wrapping.`;

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text;
  const locationHint: string | undefined = body?.locationHint;

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing "text" in request body' }, { status: 400 });
  }

  const userParts = ['Analyze the following text and extract structured fashion intelligence.'];
  if (locationHint) {
    userParts.push(`Location context (use only if the text supports it): ${locationHint}`);
  }
  userParts.push(`\nText to analyze:\n${text}`);
  userParts.push(`\nReturn JSON with this schema:
{
  "locations": [{ "name": "string", "type": "neighborhood|city|country|unknown", "confidence": "low|medium|high" }],
  "fashion_items": ["specific item descriptions"],
  "brands": ["brand names mentioned or implied"],
  "style_descriptors": ["professional fashion terminology"],
  "sentiment": "positive|neutral|negative",
  "location_confidence": 0.0-1.0
}`);

  try {
    const { data } = await generateJSON({
      system: SYSTEM_PROMPT,
      user: userParts.join('\n'),
      temperature: 0.3,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing text:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
