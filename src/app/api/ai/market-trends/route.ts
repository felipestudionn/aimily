import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

export async function GET(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const system = `You are a senior fashion trend forecaster working at the level of WGSN or Heuritech. You report on the LATEST runway collections, celebrity adoptions, and social media signals with the specificity of a professional trend report.

TODAY'S DATE: March 2026

RECENT FASHION WEEK SEASONS:
- Fall/Winter 2026 Ready-to-Wear (FW26) — shown February-March 2026 in New York, London, Milan, Paris
- Spring/Summer 2026 (SS26) — currently in stores
- Pre-Fall 2026 (PF26) — currently shipping to wholesale

QUALITY RULES:
- Colors: Use Pantone TCX professional names + reference the specific designer/show where dominant
- Trends: Name the aesthetic movement + cite 2-3 designers who champion it + explain WHY it's commercially relevant
- Items: Be hyper-specific about silhouette, construction, and material — not "nice jacket" but "cropped bouclé bomber with raw-edge finishing"
- Every insight must reference a specific designer, brand, celebrity, or cultural moment
- Return ONLY raw JSON, no markdown`;

    const userPrompt = `Generate a professional trend report for the next 6 months.

1. KEY COLORS (6-8): Pantone name + where seen on runway + commercial relevance
2. KEY TRENDS (5-7): Aesthetic name + designer references + social media traction + commercial viability
3. KEY ITEMS (6-8): Specific piece + silhouette + material + who's wearing it

Return JSON:
{
  "keyColors": ["Color Name (Pantone) — Context: where seen and why it matters"],
  "keyTrends": ["Trend Name — Details: designers, cultural drivers, commercial potential"],
  "keyItems": ["Item — Description: silhouette, material, seen at X, worn by Y"],
  "seasonFocus": "Current season focus string",
  "lastUpdated": "YYYY-MM-DD"
}`;

    const { data } = await generateJSON<Record<string, unknown>>({
      system,
      user: userPrompt,
      temperature: 0.8,
    });

    data.lastUpdated = new Date().toISOString().split('T')[0];
    return NextResponse.json(data);
  } catch (error) {
    console.error('Market trends error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch market trends';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
