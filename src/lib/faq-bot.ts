/**
 * FAQ bot — retrieval augmented generation over aimily docs.
 *
 * Pipeline:
 *   1. embed user question with OpenAI text-embedding-3-small (1536 dim)
 *   2. retrieve top-k relevant chunks from `faq_documents` via cosine similarity
 *   3. if no chunk above threshold → human handoff (Slack alert + canned reply)
 *   4. otherwise Claude Haiku 4.5 generates answer grounded in retrieved chunks
 *   5. log Q+A in `faq_chat_log` for review and continuous improvement
 *
 * The bot only answers from indexed knowledge — it must NOT improvise about
 * pricing, legal, or any user-specific data. The system prompt enforces this.
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase-admin';
import { sendFounderAlert } from './founder-alerts';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const GENERATION_MODEL = 'claude-haiku-4-5-20251001';
const MATCH_COUNT = 5;
const SIMILARITY_THRESHOLD = 0.5;

let _openai: OpenAI | null | undefined;
function getOpenAI(): OpenAI | null {
  if (_openai !== undefined) return _openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('[faq-bot] OPENAI_API_KEY missing');
    _openai = null;
    return null;
  }
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

let _anthropic: Anthropic | null | undefined;
function getAnthropic(): Anthropic | null {
  if (_anthropic !== undefined) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('[faq-bot] ANTHROPIC_API_KEY missing');
    _anthropic = null;
    return null;
  }
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

export interface FaqMatch {
  id: string;
  source: string;
  section: string | null;
  content: string;
  similarity: number;
}

export interface FaqAnswer {
  answer: string;
  fallbackToHuman: boolean;
  matches: FaqMatch[];
}

const SYSTEM_PROMPT = `You are aimily's customer support assistant. aimily is a fashion collection management platform that helps brands plan, design, and launch clothing/footwear collections (Creative & Brand → Merchandising → Design & Development → Marketing & Digital).

Voice: editorial, calm, professional. No emojis. No exclamation marks. Answer in the language of the question (Spanish or English). 1-3 sentences max unless the user explicitly asks for detail.

Rules:
- Answer ONLY from the CONTEXT provided below. Never improvise about pricing, plans, refunds, legal, or any user-specific data.
- If the context does not contain enough information to answer, reply with EXACTLY this token on its own line: <NEED_HUMAN>
- Do not make up URLs, prices, dates, or feature names. If you reference a feature, it must appear in the context.
- For sensitive topics (refund, cancellation, GDPR, billing dispute), always end with: "If this needs a human, write to hello@aimily.app and we'll come back within one business day."
- Never claim to be Felipe or any human at aimily. You are an automated assistant.`;

/**
 * Embed text with OpenAI. Returns a 1536-dim vector.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      dimensions: EMBEDDING_DIM,
    });
    return response.data[0]?.embedding ?? null;
  } catch (e) {
    console.error('[faq-bot] embedding failed', e);
    return null;
  }
}

/**
 * Retrieve top-k FAQ chunks above similarity threshold for a question.
 */
export async function retrieveFaqMatches(question: string): Promise<FaqMatch[]> {
  const embedding = await embedText(question);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_faq_documents', {
    query_embedding: embedding as unknown as string,
    match_count: MATCH_COUNT,
    similarity_threshold: SIMILARITY_THRESHOLD,
  });

  if (error) {
    console.error('[faq-bot] retrieval rpc failed', error);
    return [];
  }
  return (data ?? []) as FaqMatch[];
}

/**
 * End-to-end: question → retrieval → Claude → answer.
 * Logs to faq_chat_log and fires Slack alert on human handoff.
 */
export async function answerQuestion(question: string, sessionId?: string, userId?: string): Promise<FaqAnswer> {
  const matches = await retrieveFaqMatches(question);

  if (matches.length === 0) {
    const answer = humanHandoffMessage(question);
    await logAnswer(question, answer, [], true, sessionId, userId);
    await fireHumanHandoff(question, sessionId);
    return { answer, fallbackToHuman: true, matches: [] };
  }

  const anthropic = getAnthropic();
  if (!anthropic) {
    const answer = 'Estamos teniendo un problema técnico con el asistente. Escríbenos a hello@aimily.app y te respondemos en un día laborable.';
    await logAnswer(question, answer, matches, true, sessionId, userId);
    return { answer, fallbackToHuman: true, matches };
  }

  const contextBlock = matches
    .map((m, i) => `[#${i + 1} · source=${m.source}${m.section ? ` · section=${m.section}` : ''} · similarity=${m.similarity.toFixed(2)}]\n${m.content}`)
    .join('\n\n---\n\n');

  try {
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `CONTEXT:\n${contextBlock}\n\n---\n\nQUESTION:\n${question}`,
        },
      ],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const trimmed = raw.trim();

    if (trimmed.includes('<NEED_HUMAN>')) {
      const answer = humanHandoffMessage(question);
      await logAnswer(question, answer, matches, true, sessionId, userId);
      await fireHumanHandoff(question, sessionId);
      return { answer, fallbackToHuman: true, matches };
    }

    await logAnswer(question, trimmed, matches, false, sessionId, userId);
    return { answer: trimmed, fallbackToHuman: false, matches };
  } catch (e) {
    console.error('[faq-bot] generation failed', e);
    const answer = 'Disculpa, hubo un error procesando tu pregunta. Escríbenos a hello@aimily.app.';
    await logAnswer(question, answer, matches, true, sessionId, userId);
    return { answer, fallbackToHuman: true, matches };
  }
}

function humanHandoffMessage(_question: string): string {
  return 'No tengo información suficiente para responderte con seguridad. He avisado al equipo y te contactaremos por hello@aimily.app en un día laborable. Si es urgente, escríbenos directamente.';
}

async function logAnswer(
  question: string,
  answer: string,
  matches: FaqMatch[],
  fallback: boolean,
  sessionId?: string,
  userId?: string,
) {
  try {
    await supabaseAdmin.from('faq_chat_log').insert({
      question: question.slice(0, 2000),
      answer: answer.slice(0, 4000),
      matched_doc_ids: matches.map((m) => m.id),
      similarities: matches.map((m) => m.similarity),
      fallback_to_human: fallback,
      session_id: sessionId ?? null,
      user_id: userId ?? null,
    });
  } catch (e) {
    console.error('[faq-bot] log insert failed', e);
  }
}

async function fireHumanHandoff(question: string, sessionId?: string) {
  try {
    await sendFounderAlert({
      type: 'audit_high_severity',
      subject: `FAQ bot needs human — "${question.slice(0, 60)}${question.length > 60 ? '…' : ''}"`,
      body: `User asked something the bot could not answer. Reply via hello@aimily.app or check the chat log.\n\nFull question:\n${question}`,
      data: { session_id: sessionId ?? null, source: 'faq_bot_handoff' },
      link: 'https://www.aimily.app/admin/faq-log',
    });
  } catch (e) {
    console.error('[faq-bot] handoff alert failed', e);
  }
}
