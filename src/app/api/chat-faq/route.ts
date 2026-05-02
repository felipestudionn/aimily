/**
 * POST /api/chat-faq
 *
 * Public endpoint for the FAQ widget. Anyone can ask a question without
 * authentication — the bot only answers from indexed public knowledge
 * (privacy policy, terms, pricing, marketing copy) and never user data.
 *
 * Request:  { question: string, sessionId?: string }
 * Response: { answer: string, fallbackToHuman: boolean }
 *
 * Rate limit: 20 questions/hour per IP to keep token spend bounded.
 */
import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/faq-bot';

export const runtime = 'nodejs';
export const maxDuration = 30;

// In-memory rate limit (sliding 1h window). Best-effort — not durable
// across function instances, but enough to stop accidental loops.
const RATE_LIMIT_PER_IP = 20;
const WINDOW_MS = 60 * 60 * 1000;
const ipHits = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const arr = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (arr.length >= RATE_LIMIT_PER_IP) return false;
  arr.push(now);
  ipHits.set(ip, arr);
  return true;
}

export async function POST(req: NextRequest) {
  let body: { question?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

  if (!question || question.length < 2) {
    return NextResponse.json({ error: 'question_too_short' }, { status: 400 });
  }
  if (question.length > 1500) {
    return NextResponse.json({ error: 'question_too_long' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
  }

  const result = await answerQuestion(question, sessionId);
  return NextResponse.json({
    answer: result.answer,
    fallbackToHuman: result.fallbackToHuman,
  });
}
