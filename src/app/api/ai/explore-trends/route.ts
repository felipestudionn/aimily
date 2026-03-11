import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'models/gemini-2.5-flash';

interface TrendExplorationResult {
  query: string;
  keyColors: string[];
  keyTrends: string[];
  keyItems: string[];
  description: string;
}

const EXPLORE_PROMPT = (query: string) => `You are a senior fashion trend analyst doing a DEEP DIVE analysis on: "${query}"

TODAY'S DATE: November 2025

THE MOST RECENT FASHION WEEK SEASONS ARE:
- **Spring/Summer 2026 (SS26)** - Shown September-October 2025 in New York, London, Milan, Paris
- **Pre-Fall 2026 (PF26)** - Currently showing November 2025
- **Resort 2026** - Shown earlier in 2025

Conduct an IN-DEPTH analysis of "${query}" covering:
- Runway presence: Which specific designers showed this? What looks stood out?
- Celebrity adoption: Who's wearing it? Red carpet, street style, social media
- Social media momentum: TikTok trends, Instagram aesthetics, Pinterest searches
- Retail availability: Which brands are producing it? Price points?
- Historical context: Where did this trend originate? How has it evolved?

Provide DETAILED analysis with specific references:

1. **KEY COLORS** (6-8 colors with context)
   FORMAT: "Color Name (Pantone code if known) - Where it was seen and why it matters"
   - Colors specifically associated with "${query}" on SS26/PF26 runways
   - Reference specific designers and looks
   - Example: "Burgundy (19-1617) - Dominant at Bottega Veneta SS26, seen in leather goods and tailoring"

2. **KEY TRENDS** (5-7 related trends with deep context)
   FORMAT: "Trend Name: Detailed explanation of how it connects to ${query}, which designers champion it, and how it's being interpreted"
   - Related aesthetics and movements
   - Specific designer references
   - Social media interpretations
   - Example: "Quiet Luxury Evolution: The trend toward understated elegance connects directly to ${query} through..."

3. **KEY ITEMS** (6-8 specific items with details)
   FORMAT: "Item Name - Detailed description including silhouette, materials, styling, and where seen"
   - Specific pieces from SS26/PF26 runways
   - Celebrity-worn pieces
   - Retail bestsellers
   - Example: "The Leather Trench - Oversized silhouette in butter-soft leather, seen at Bottega Veneta and already worn by Hailey Bieber"

4. **DESCRIPTION**
   - 4-5 sentences providing comprehensive context
   - Origin and evolution of this trend
   - Key designers and celebrities driving it
   - Why it's relevant NOW and for the next 6 months
   - Commercial viability and target audience

Return ONLY valid JSON:
{
  "query": "${query}",
  "keyColors": ["Color (code) - Context and where seen", "..."],
  "keyTrends": ["Trend Name: Detailed explanation with designer references", "..."],
  "keyItems": ["Item Name - Detailed description with styling and references", "..."],
  "description": "Comprehensive 4-5 sentence analysis of the trend..."
}`;

export async function POST(req: NextRequest) {
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
    const { query } = await req.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
    );
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: EXPLORE_PROMPT(query) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
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
        { error: 'Failed to explore trend' },
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
      return NextResponse.json(result);
    }

    return NextResponse.json(JSON.parse(textResponse));
  } catch (error) {
    console.error('Explore trends error:', error);
    return NextResponse.json(
      { error: 'Failed to explore trend' },
      { status: 500 }
    );
  }
}
