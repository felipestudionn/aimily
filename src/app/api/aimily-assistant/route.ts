/**
 * POST /api/aimily-assistant
 *
 * The streaming chat endpoint for the in-product Aimily Assistant.
 *
 * Flow per request:
 *   1. Auth (getAuthenticatedUser) → user.id required.
 *   2. Soft rate limit (existing AI rate limit, 30/min/user).
 *   3. Hard daily kill switch — `aimily_assistant_user_usage.paused`.
 *      If TRUE, return 429 with a polite message.
 *   4. Resume or create the conversation row.
 *   5. Build the prompt:
 *        - system[0]: STATIC prompt (cached, 1h TTL)
 *        - system[1]: dynamic page context envelope (NOT cached)
 *        - messages: prior turns + the new user message
 *   6. streamText → toUIMessageStreamResponse.
 *   7. onFinish: persist user + assistant messages, record usage,
 *      auto-pause if user breaches the $5/day cost cap (DB-level).
 *
 * Caching gotcha respected: page context is in system[1] (uncached),
 * never interpolated into system[0]. system[0] is identical for every
 * user, every request → 1h Anthropic prompt cache hits.
 */

import { NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type ModelMessage,
  type SystemModelMessage,
} from 'ai';

import { getAuthenticatedUser, enforceAiUserRateLimit } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

import {
  buildStaticSystemPrompt,
  formatPageContext,
  type PageContext,
} from '@/lib/aimily-assistant/system-prompt';
import { aimilyAssistantTools } from '@/lib/aimily-assistant/tools';
import { estimateCostUsd } from '@/lib/aimily-assistant/cost';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* The static prompt is built ONCE per warm worker. Same string forever
   means Anthropic's prompt cache stays warm for as long as the worker
   lives. */
const STATIC_SYSTEM_PROMPT = buildStaticSystemPrompt();

/* Daily soft cap on assistant messages per user. The kill switch in the
   DB (server-side, $5/day cost) is the hard cap. This is the polite
   one-screen-of-explaining-AI cap, not anti-abuse. */
const DAILY_SOFT_CAP = 200;

/* Per-conversation history budget. Send the last N user/assistant turns
   to keep input tokens predictable and avoid runaway context. */
const HISTORY_TURN_BUDGET = 12;

/* ──────────────────────────────────────────────────────────────────
   Body schema (loose — we trust the client only enough to shape it)
   ────────────────────────────────────────────────────────────────── */

interface RequestBody {
  messages: UIMessage[];
  conversationId?: string;
  pageContext?: Partial<PageContext>;
  locale?: string;
}

/* ──────────────────────────────────────────────────────────────────
   POST handler
   ────────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  /* 1. Auth */
  const auth = await getAuthenticatedUser();
  if (!auth.user) return auth.error;
  const userId = auth.user.id;

  /* 2. Per-user rate limit (30/min, in-memory) */
  const rateLimitResp = enforceAiUserRateLimit(userId, 'text');
  if (rateLimitResp) return rateLimitResp;

  /* 3. Daily kill switch + soft cap */
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await supabaseAdmin
    .from('aimily_assistant_user_usage')
    .select('messages_count, paused, paused_reason')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (usageRow?.paused) {
    return NextResponse.json(
      {
        error:
          'Aimily Assistant is paused for today on your account — we hit the safety cap. It resets at 00:00 UTC. If this looks wrong, email hello@aimily.app.',
        reason: 'paused',
      },
      { status: 429 },
    );
  }
  if ((usageRow?.messages_count ?? 0) >= DAILY_SOFT_CAP) {
    return NextResponse.json(
      {
        error:
          'You have reached today\'s message limit for Aimily Assistant. It resets at 00:00 UTC.',
        reason: 'daily_soft_cap',
      },
      { status: 429 },
    );
  }

  /* 4. Body */
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  /* 5. Conversation row — resume or create */
  let conversationId = body.conversationId;
  if (conversationId) {
    const { data: conv } = await supabaseAdmin
      .from('aimily_assistant_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv || conv.user_id !== userId) {
      // Either id doesn't exist or it isn't this user's conversation — fall
      // through to creating a new one rather than 403 (kinder UX).
      conversationId = undefined;
    }
  }

  if (!conversationId) {
    const { data: newConv, error: newConvErr } = await supabaseAdmin
      .from('aimily_assistant_conversations')
      .insert({
        user_id: userId,
        started_pathname: body.pageContext?.pathname ?? null,
        started_collection_id: body.pageContext?.collectionId ?? null,
      })
      .select('id')
      .single();

    if (newConvErr || !newConv) {
      return NextResponse.json(
        { error: 'Could not start conversation' },
        { status: 500 },
      );
    }
    conversationId = newConv.id;
  }

  /* 6. Build prompt
        - system[0]: STATIC, cached 1h
        - system[1]: dynamic page context, uncached
        - messages: budget-trimmed history */
  const pageContextStr = formatPageContext(
    {
      pathname: body.pageContext?.pathname || 'unknown',
      collectionId: body.pageContext?.collectionId,
      miniBlockId: body.pageContext?.miniBlockId,
      miniBlockTitle: body.pageContext?.miniBlockTitle,
      blockCoord: body.pageContext?.blockCoord,
    },
    body.locale || 'en',
  );

  const systemMessages: Array<SystemModelMessage> = [
    {
      role: 'system',
      content: STATIC_SYSTEM_PROMPT,
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral', ttl: '1h' },
        },
      },
    },
    {
      role: 'system',
      content: pageContextStr,
    },
  ];

  /* Trim history: keep the first user message + the last (HISTORY_TURN_BUDGET-1)
     messages. The first turn is usually the most context-laden; the rest
     of the recent turns carry the immediate flow. */
  let modelMessages: ModelMessage[];
  if (messages.length <= HISTORY_TURN_BUDGET) {
    modelMessages = await convertToModelMessages(messages);
  } else {
    const first = messages[0]!;
    const tail = messages.slice(-HISTORY_TURN_BUDGET + 1);
    modelMessages = await convertToModelMessages([first, ...tail]);
  }

  /* 7. Stream */
  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: systemMessages,
    messages: modelMessages,
    tools: aimilyAssistantTools,
    stopWhen: stepCountIs(3),
    temperature: 0.4,
    maxOutputTokens: 1024,

    onFinish: async ({ usage, response }) => {
      try {
        /* Persist the new user message + the assistant response.
           We persist parts (UI-friendly) so we can restore conversations
           at refresh without losing tool calls. */
        const newUserMessage = messages[messages.length - 1];
        const rowsToInsert: Array<{
          conversation_id: string;
          role: 'user' | 'assistant' | 'system' | 'tool';
          parts: unknown;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cache_read_tokens?: number | null;
          cache_write_tokens?: number | null;
        }> = [];

        if (newUserMessage && newUserMessage.role === 'user') {
          rowsToInsert.push({
            conversation_id: conversationId!,
            role: 'user',
            parts: newUserMessage.parts,
          });
        }

        /* response.messages are the new model output messages (UI/Model
           normalisation handled by AI SDK). We persist each as one row. */
        for (const m of response.messages) {
          rowsToInsert.push({
            conversation_id: conversationId!,
            role: m.role as 'assistant' | 'tool',
            parts: m.content as unknown,
          });
        }

        if (rowsToInsert.length > 0) {
          await supabaseAdmin.from('aimily_assistant_messages').insert(rowsToInsert);
        }

        await supabaseAdmin
          .from('aimily_assistant_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId!);

        /* Record usage + cost. Triggers DB-side kill switch if cumulative
           daily spend > $5 for this user.
           AI SDK v6 LanguageModelUsage shape (verified against
           node_modules/ai/dist/index.d.ts):
             inputTokens: number             // total (includes cached)
             inputTokenDetails: {
               noCacheTokens, cacheReadTokens, cacheWriteTokens
             }
             outputTokens: number */
        const u = usage as {
          inputTokens?: number;
          inputTokenDetails?: {
            noCacheTokens?: number;
            cacheReadTokens?: number;
            cacheWriteTokens?: number;
          };
          outputTokens?: number;
        };
        const inputTotal = u.inputTokens ?? 0;
        const cacheRead = u.inputTokenDetails?.cacheReadTokens ?? 0;
        const cacheWrite = u.inputTokenDetails?.cacheWriteTokens ?? 0;
        const noCacheInput =
          u.inputTokenDetails?.noCacheTokens ??
          Math.max(0, inputTotal - cacheRead - cacheWrite);
        const outputTokens = u.outputTokens ?? 0;

        const costUsd = estimateCostUsd({
          inputTokens: noCacheInput,
          outputTokens,
          cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite,
          cacheWriteTtl: '1h',
        });

        await supabaseAdmin.rpc('aimily_assistant_record_usage', {
          p_user_id: userId,
          p_input_tokens: noCacheInput,
          p_output_tokens: outputTokens,
          p_cache_read_tokens: cacheRead,
          p_cache_write_tokens: cacheWrite,
          p_cost_usd: costUsd,
        });
      } catch (err) {
        // Persistence failures must not break the stream — log and continue.
        // eslint-disable-next-line no-console
        console.error('[aimily-assistant] onFinish persistence error:', err);
      }
    },
  });

  /* The conversation id needs to reach the client so subsequent turns
     can resume the same row. We send it via response header. */
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation init failed' }, { status: 500 });
  }
  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: {
      'x-aimily-conversation-id': conversationId,
    },
  });
}
