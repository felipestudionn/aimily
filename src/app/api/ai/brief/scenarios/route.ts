import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON, generateText, extractJSON } from '@/lib/ai/llm-client';
import { buildScenariosPrompt, buildResearchQueries } from '@/lib/ai/brief-prompts';
import { loadFullContext } from '@/lib/ai/load-full-context';
import { formatCisPrefix } from '@/lib/ai/cis-prefix';

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

  const usage = await checkAuthOnly(user.id, user.email || '');
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const { understood, answers, researchTopics, language = 'en', collectionPlanId } = await req.json();

    if (!understood) {
      return NextResponse.json({ error: 'Missing understood data' }, { status: 400 });
    }

    // ── CIS context: opt-in for post-creation flows (Scenarios sub-block) ──
    let cisPrefix = '';
    if (collectionPlanId && typeof collectionPlanId === 'string') {
      try {
        const ctx = await loadFullContext(collectionPlanId);
        cisPrefix = formatCisPrefix(ctx);
      } catch (err) {
        console.warn('[Brief/Scenarios] loadFullContext failed, falling back:', err);
      }
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
    const { system, user: userPromptRaw } = buildScenariosPrompt(understood, answers || {}, combinedResearch, language);
    const userPrompt = cisPrefix + userPromptRaw;

    // Try generateJSON first, fall back to generateText + manual extraction
    let data;
    try {
      const result = await generateJSON({
        system,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 8192,
        language,
      });
      data = result.data;
    } catch (jsonErr) {
      console.error('[Brief/Scenarios] generateJSON failed, trying text fallback:', jsonErr instanceof Error ? jsonErr.message : jsonErr);
      // Fallback: get raw text and try to extract JSON manually
      const textResult = await generateText({
        system,
        user: userPrompt,
        temperature: 0.7,
        maxTokens: 8192,
        language,
      });
      console.log('[Brief/Scenarios] Raw text response (first 500):', textResult.text.slice(0, 500));
      try {
        data = extractJSON(textResult.text);
      } catch {
        // Last resort: return a structured error with the raw text for debugging
        return NextResponse.json({
          error: `AI returned non-JSON response. First 200 chars: ${textResult.text.slice(0, 200)}`,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ result: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Brief/Scenarios]', msg);
    return NextResponse.json({ error: `Failed to generate scenarios: ${msg}` }, { status: 500 });
  }
}
