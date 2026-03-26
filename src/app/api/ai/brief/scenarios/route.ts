import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildScenariosPrompt, buildResearchQueries } from '@/lib/ai/brief-prompts';

export const maxDuration = 60;

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function searchPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) return '';
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a fashion market research assistant. Return concise, data-rich answers with specific prices, brands, and numbers. Focus on European markets.' },
          { role: 'user', content: query },
        ],
        max_tokens: 1024,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { understood, answers, researchTopics, language = 'en' } = await req.json();

    if (!understood) {
      return NextResponse.json({ error: 'Missing understood data' }, { status: 400 });
    }

    // Step 1: Build research queries (max 2 for speed)
    const queries = buildResearchQueries(understood, answers || {}, researchTopics || []).slice(0, 2);

    // Step 2: Run Perplexity searches in parallel
    const researchResults = await Promise.all(queries.map(q => searchPerplexity(q)));
    const combinedResearch = researchResults
      .filter(Boolean)
      .map((r, i) => `--- Research ${i + 1} ---\n${r}`)
      .join('\n\n');

    // Step 3: Generate scenarios with AI
    const { system, user: userPrompt } = buildScenariosPrompt(understood, answers, combinedResearch, language);

    const { data } = await generateJSON({
      system,
      user: userPrompt,
      temperature: 0.7,
      maxTokens: 8192,
      language,
    });

    return NextResponse.json({ result: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Brief/Scenarios]', msg, err);
    return NextResponse.json({ error: `Failed to generate scenarios: ${msg}` }, { status: 500 });
  }
}
