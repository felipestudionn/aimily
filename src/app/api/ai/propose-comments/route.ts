import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  COMMENT_PROPOSAL_PROMPT,
  buildCommentUserPrompt,
} from '@/lib/prompts/sketch-generation';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned);
  }
}

interface RequestBody {
  garmentType: string;
  conceptDescription: string;
  fabric: string;
  additionalNotes: string;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: RequestBody = await req.json();

    if (!body.conceptDescription) {
      return NextResponse.json(
        { error: 'Se necesita la descripción del concepto' },
        { status: 400 }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY no configurada' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: COMMENT_PROPOSAL_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildCommentUserPrompt(body),
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const result = parseJsonFromText(textContent.text) as {
      notes: Array<{ text: string; position: string; x: number; y: number }>;
      suggestedMeasurements: Record<string, string>;
    };

    if (!result.notes || !Array.isArray(result.notes)) {
      throw new Error('Invalid notes response');
    }

    return NextResponse.json({
      proposedNotes: result.notes.map((n) => ({ ...n, selected: false })),
      suggestedMeasurements: result.suggestedMeasurements || {
        bust: '',
        waist: '',
        seat: '',
        totalLength: '',
        sleeveLength: '',
      },
    });
  } catch (error) {
    console.error('Comment proposal error:', error);
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
