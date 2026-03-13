/**
 * Unified LLM Client — Claude Haiku primary, Gemini Flash fallback.
 *
 * Features:
 * - Haiku-first with automatic Gemini failover (timeout, 5xx, rate limit)
 * - System + User prompt pattern (native to both models)
 * - Robust JSON extraction (raw, markdown-wrapped, or embedded)
 * - Temperature per-call configuration
 * - Transparent model logging for debugging
 */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// ─── Types ───

export interface LLMRequest {
  system: string;
  user: string;
  temperature?: number;       // 0-1, default 0.7
  maxTokens?: number;         // default 4096
  jsonMode?: boolean;         // hint to prefer JSON output
}

export interface LLMResponse {
  text: string;
  model: 'haiku' | 'gemini';
  fallback: boolean;          // true if Gemini was used as fallback
}

// ─── Main entry point ───

export async function generateWithAI(req: LLMRequest): Promise<LLMResponse> {
  // Try Haiku first
  if (ANTHROPIC_API_KEY) {
    try {
      const text = await callHaiku(req);
      return { text, model: 'haiku', fallback: false };
    } catch (err) {
      console.warn('[LLM] Haiku failed, falling back to Gemini:', (err as Error).message);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      const text = await callGemini(req);
      return { text, model: 'gemini', fallback: true };
    } catch (err) {
      console.error('[LLM] Gemini fallback also failed:', (err as Error).message);
      throw new Error('Both AI providers failed. Please try again.');
    }
  }

  throw new Error('No AI provider configured (ANTHROPIC_API_KEY or GEMINI_API_KEY required)');
}

/**
 * Generate and parse JSON response. Handles markdown wrapping, embedded JSON, etc.
 */
export async function generateJSON<T = unknown>(req: LLMRequest): Promise<{ data: T; model: 'haiku' | 'gemini'; fallback: boolean }> {
  const response = await generateWithAI({ ...req, jsonMode: true });
  const data = extractJSON<T>(response.text);
  return { data, model: response.model, fallback: response.fallback };
}

/**
 * Generate plain text response (no JSON parsing).
 */
export async function generateText(req: LLMRequest): Promise<{ text: string; model: 'haiku' | 'gemini'; fallback: boolean }> {
  return generateWithAI(req);
}

// ─── Provider implementations ───

async function callHaiku(req: LLMRequest): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: req.maxTokens ?? 4096,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
    temperature: req.temperature ?? 0.7,
  });

  const block = response.content[0];
  if (block.type !== 'text' || !block.text) {
    throw new Error('Empty response from Haiku');
  }
  return block.text;
}

async function callGemini(req: LLMRequest): Promise<string> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
  );
  url.searchParams.set('key', GEMINI_API_KEY!);

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    generationConfig: {
      temperature: req.temperature ?? 0.7,
      maxOutputTokens: req.maxTokens ?? 4096,
      ...(req.jsonMode && { responseMimeType: 'application/json' }),
    },
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

// ─── JSON extraction (robust) ───

export function extractJSON<T = unknown>(text: string): T {
  // 1. Try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // continue
  }

  // 2. Strip markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // 3. Find outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      // continue
    }
  }

  // 4. Find outermost [ ... ] (for array responses)
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1)) as T;
    } catch {
      // continue
    }
  }

  throw new Error(`Failed to extract JSON from response: ${text.slice(0, 300)}`);
}
