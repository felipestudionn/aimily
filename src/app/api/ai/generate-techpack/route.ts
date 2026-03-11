import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SKETCH_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/sketch-generation';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

interface RequestBody {
  images: Array<{
    base64: string;
    mimeType: string;
    instructions: string;
  }>;
  garmentType: string;
  season: string;
  styleName: string;
  fabric: string;
  additionalNotes: string;
}

function parseJsonFromText(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');

    // Try to extract JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  }
}

async function generateWithClaude(body: RequestBody) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const imageBlocks: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  for (let i = 0; i < body.images.length; i++) {
    const img = body.images[i];
    imageBlocks.push({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: img.base64,
      },
    });
    imageBlocks.push({
      type: 'text' as const,
      text: `Photo ${i + 1} instructions: ${img.instructions || 'Use as general reference'}`,
    });
  }

  imageBlocks.push({
    type: 'text' as const,
    text: buildUserPrompt(body),
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    system: SKETCH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: imageBlocks }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return parseJsonFromText(textContent.text);
}

async function generateWithGemini(body: RequestBody) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const parts: Array<Record<string, unknown>> = [];

  // Add images as inline data
  for (let i = 0; i < body.images.length; i++) {
    const img = body.images[i];
    parts.push({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64,
      },
    });
    parts.push({
      text: `Photo ${i + 1} instructions: ${img.instructions || 'Use as general reference'}`,
    });
  }

  // Add system prompt + user prompt as text
  parts.push({
    text: `${SKETCH_SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(body)}`,
  });

  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`);
  url.searchParams.set('key', GEMINI_API_KEY);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text in Gemini response');

  return parseJsonFromText(text);
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: RequestBody = await req.json();

    // Validation
    if (!body.images || body.images.length === 0) {
      return NextResponse.json({ error: 'At least 1 reference image is required' }, { status: 400 });
    }
    if (body.images.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 reference images allowed' }, { status: 400 });
    }
    if (!body.garmentType) {
      return NextResponse.json({ error: 'Garment type is required' }, { status: 400 });
    }

    let result;

    // Primary: Claude Sonnet
    try {
      console.log('Generating tech pack with Claude Sonnet...');
      result = await generateWithClaude(body);
      console.log('Claude generation successful');
    } catch (claudeError) {
      console.error('Claude failed, trying Gemini fallback:', claudeError);

      // Fallback: Gemini
      try {
        console.log('Generating tech pack with Gemini fallback...');
        result = await generateWithGemini(body);
        console.log('Gemini fallback successful');
      } catch (geminiError) {
        console.error('Gemini fallback also failed:', geminiError);
        return NextResponse.json(
          { error: 'AI generation failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Validate response shape
    const typedResult = result as Record<string, unknown>;
    if (!typedResult.sketchFrontSvg || !typedResult.sketchBackSvg) {
      return NextResponse.json(
        { error: 'AI generated incomplete response. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tech pack generation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
