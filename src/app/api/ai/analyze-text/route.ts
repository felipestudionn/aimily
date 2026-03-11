import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

if (!GEMINI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('GEMINI_API_KEY is not set; /api/ai/analyze-text will fail at runtime');
}

const SYSTEM_PROMPT = `You are a fashion trend analysis assistant.
You receive text from Reddit, YouTube, Pinterest and similar sources.
Your job is to extract structured information in JSON.

Return ONLY valid JSON, no markdown, no extra text.

The JSON schema must be:
{
  "locations": [
    { "name": string, "type": "neighborhood" | "city" | "country" | "unknown", "confidence": "low" | "medium" | "high" }
  ],
  "fashion_items": string[],
  "brands": string[],
  "style_descriptors": string[],
  "sentiment": "positive" | "neutral" | "negative",
  "location_confidence": number
}

- Focus on fashion / style / garments / aesthetics.
- If you are unsure about locations, keep the array empty and set location_confidence to 0.
- If sentiment is unclear, use "neutral".
`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);

  const text: string | undefined = body?.text;
  const locationHint: string | undefined = body?.locationHint;

  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'Missing "text" in request body' },
      { status: 400 },
    );
  }

  const userPromptParts = [
    'Analyze the following text about fashion and extract structured data.',
  ];

  if (locationHint) {
    userPromptParts.push(
      `Location hint (neighborhood or city the user cares about): ${locationHint}. Use this only if the text supports it.`,
    );
  }

  userPromptParts.push('\nText to analyze:\n');
  userPromptParts.push(text);

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`,
    );
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { text: userPromptParts.join('\n') },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Gemini API error',
          status: response.status,
          details: errorText,
        },
        { status: 500 },
      );
    }

    const data = await response.json();

    const textResponse: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n');

    if (!textResponse) {
      return NextResponse.json(
        { error: 'Empty response from Gemini' },
        { status: 500 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(textResponse);
    } catch (err) {
      // Intento adicional: extraer el bloque JSON entre la primera '{' y la última '}'
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const possibleJson = textResponse.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(possibleJson);
        } catch (err2) {
          // eslint-disable-next-line no-console
          console.error('Failed to parse JSON from Gemini (second attempt):', err2, textResponse);
          return NextResponse.json(
            { error: 'Failed to parse JSON from Gemini' },
            { status: 500 },
          );
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to parse JSON from Gemini:', err, textResponse);
        return NextResponse.json(
          { error: 'Failed to parse JSON from Gemini' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error calling Gemini', error);
    return NextResponse.json(
      { error: 'Unexpected error calling Gemini' },
      { status: 500 },
    );
  }
}
