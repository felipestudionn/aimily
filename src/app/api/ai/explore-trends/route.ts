import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { query, language } = await req.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const system = `You are a senior fashion trend analyst producing deep-dive reports at the level of WGSN's "Big Ideas" or Heuritech's trend intelligence briefs.

TODAY'S DATE: March 2026

RECENT FASHION WEEK SEASONS:
- FW26 RTW — shown Feb-Mar 2026 (New York, London, Milan, Paris)
- SS26 — currently in stores
- PF26 — shipping to wholesale

ANALYSIS DEPTH REQUIREMENTS:
- Runway: Name specific designers, look numbers, and styling choices
- Celebrity: Name who's wearing it, where, and what it signals commercially
- Social media: Reference specific TikTok aesthetics, Instagram accounts, Pinterest search volume trends
- Retail: Which brands are producing it at which price points? Is it selling?
- Historical: Where did this originate? How has it mutated? What's the lifecycle stage?
- Commercial: Is this a flash trend (3 months), a seasonal direction (6-12 months), or a macro shift (2+ years)?

Return ONLY raw JSON, no markdown.`;

    const userPrompt = `Deep-dive analysis on: "${query}"

1. KEY COLORS (6-8): "Color Name (Pantone if known) — Where seen: designer/show/celebrity reference and commercial relevance"
2. KEY TRENDS (5-7): "Trend Name — Connection to ${query}: how it relates, who champions it, social media interpretation, commercial potential"
3. KEY ITEMS (6-8): "Item — Full description: silhouette, materials, construction, where seen, who's wearing it, price positioning"
4. DESCRIPTION: 4-5 sentences — origin, evolution, key drivers, relevance NOW, commercial viability and target audience

Return JSON:
{
  "query": "${query}",
  "keyColors": ["Color (code) — Context"],
  "keyTrends": ["Trend: Detailed analysis"],
  "keyItems": ["Item — Full description"],
  "description": "Comprehensive analysis paragraph"
}`;

    const { data } = await generateJSON({
      system,
      user: userPrompt,
      temperature: 0.7,
      language,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Explore trends error:', error);
    const message = error instanceof Error ? error.message : 'Failed to explore trend';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
