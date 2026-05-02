import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  COMMENT_PROPOSAL_PROMPT,
  buildCommentUserPrompt,
} from '@/lib/prompts/sketch-generation';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, enforceAiUserRateLimit } from '@/lib/api-auth';
import { extractJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

    const rateLimited = enforceAiUserRateLimit(user.id, 'heavy-text');
    if (rateLimited) return rateLimited;

    const usage = await checkAuthOnly(user.id, user.email!);
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

    const result = extractJSON<{
      notes: Array<{ text: string; position: string; x: number; y: number }>;
      suggestedMeasurements: Record<string, string>;
    }>(textContent.text) as {
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
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus },
    );
  }
}
