import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'models/gemini-2.5-flash';

const MARKET_TRENDS_PROMPT = `You are a fashion market analyst reporting on the LATEST runway trends from the most recent fashion weeks.

TODAY'S DATE: November 2025

THE MOST RECENT FASHION WEEK SEASONS ARE:
- **Spring/Summer 2026 Ready-to-Wear (SS26)** - Shown September-October 2025 in New York, London, Milan, Paris
- **Pre-Fall 2026 (PF26)** - Currently showing November 2025
- **Resort 2026 / Cruise 2026** - Shown earlier in 2025

Your analysis must be based on:
- SS26 collections from the Big Four fashion weeks (September-October 2025)
- Pre-Fall 2026 collections currently being shown
- What celebrities are already wearing from SS26 collections
- Current social media trends (TikTok, Instagram)
- Street style from Paris, Milan, London, New York Fashion Weeks September-October 2025

Focus on the NEXT 6 MONTHS - what will be in stores and what people will be wearing.

Provide:

1. **KEY COLORS** (6-8 colors)
   - Colors dominant on SS26 and PF26 runways
   - Use professional Pantone TCX fashion names
   - Include Pantone Color of the Year 2025: Mocha Mousse (17-1230)
   - Reference specific designers: "Burgundy at Bottega", "Butter yellow at Prada"

2. **KEY TRENDS** (5-7 trends)
   - Major trends from SS26 runway shows
   - Reference specific designers and collections
   - What aesthetics dominated the September 2025 shows?
   - Be concrete: "Sheer everything", "Quiet Luxury evolution", "Boho redux"

3. **KEY ITEMS** (6-8 items)
   - Specific pieces seen repeatedly on SS26 runways
   - What items are celebrities already wearing from new collections?
   - Be very specific: "Leather trenches", "Maxi skirts", "Ballet flats"

Return ONLY valid JSON:
{
  "keyColors": ["Color 1", "Color 2", "Color 3", "Color 4", "Color 5", "Color 6"],
  "keyTrends": ["Trend 1", "Trend 2", "Trend 3", "Trend 4", "Trend 5"],
  "keyItems": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"],
  "seasonFocus": "SS26 & Pre-Fall 2026",
  "lastUpdated": "2025-11-25"
}`;

export async function GET(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
    );
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: MARKET_TRENDS_PROMPT }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch market trends' },
        { status: 500 }
      );
    }

    const data = await response.json();
    let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Remove markdown code blocks if present
    textResponse = textResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Extract JSON
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const result = JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      // Add timestamp
      result.lastUpdated = new Date().toISOString().split('T')[0];
      return NextResponse.json(result);
    }

    const result = JSON.parse(textResponse);
    result.lastUpdated = new Date().toISOString().split('T')[0];
    return NextResponse.json(result);
  } catch (error) {
    console.error('Market trends error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market trends' },
      { status: 500 }
    );
  }
}
