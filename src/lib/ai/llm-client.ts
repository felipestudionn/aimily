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
import { shieldPrompt, unshieldResponse, needsShielding, type ShieldContext, type RedactionEntry } from './prompt-shield';

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
  language?: string;          // output language code (default: 'en')
  shield?: ShieldContext;     // optional: pseudonymize brand/competitor data
}

export interface LLMResponse {
  text: string;
  model: 'haiku' | 'gemini';
  fallback: boolean;          // true if Gemini was used as fallback
}

// ─── Main entry point ───

export async function generateWithAI(req: LLMRequest): Promise<LLMResponse> {
  // ── Prompt Shield: pseudonymize sensitive identifiers ──
  let redactionMap: RedactionEntry[] = [];
  if (req.shield && needsShielding(req.shield)) {
    const sSystem = shieldPrompt(req.system, req.shield);
    const sUser = shieldPrompt(req.user, req.shield);
    redactionMap = [...sSystem.redactionMap, ...sUser.redactionMap];
    req = { ...req, system: sSystem.shieldedText, user: sUser.shieldedText };
  }

  // Inject language instruction into system prompt
  const LANG_NAMES: Record<string, string> = {
    es: 'Spanish (Castilian)', fr: 'French', it: 'Italian', de: 'German',
    pt: 'Portuguese (Brazilian)', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian (Bokmål)',
  };
  if (req.language && req.language !== 'en' && LANG_NAMES[req.language]) {
    const langName = LANG_NAMES[req.language];
    req = {
      ...req,
      system: req.system + `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${langName}. ALL text content, descriptions, labels, names, recommendations, and explanations must be written in ${langName}. Do NOT mix English into your response. Technical fashion terms that are universally used in English (e.g., "mood board", "drop", "SKU") may remain in English only if they are standard industry terminology.`,
    };
  }

  let responseText = '';
  let model: 'haiku' | 'gemini' = 'haiku';
  let fallback = false;

  // Track the first failure so we can surface a useful error if BOTH
  // providers end up failing. Previously these errors were swallowed and
  // the caller received only the opaque "Both AI providers failed" message.
  let haikuError: unknown = null;
  let geminiError: unknown = null;

  // Try Haiku first
  if (ANTHROPIC_API_KEY) {
    try {
      responseText = await callHaiku(req);
    } catch (err) {
      haikuError = err;
      console.warn('[llm-client] Haiku failed, will fallback to Gemini:', err instanceof Error ? err.message : err);
    }
  }

  // Fallback to Gemini
  if (!responseText && GEMINI_API_KEY) {
    try {
      responseText = await callGemini(req);
      model = 'gemini';
      fallback = true;
    } catch (err) {
      geminiError = err;
      const haikuMsg = haikuError instanceof Error ? haikuError.message : String(haikuError ?? 'no primary');
      const geminiMsg = err instanceof Error ? err.message : String(err);
      console.error('[llm-client] BOTH providers failed:', { haiku: haikuMsg, gemini: geminiMsg });
      throw new Error(`AI providers failed — Haiku: ${haikuMsg.slice(0, 120)} | Gemini: ${geminiMsg.slice(0, 120)}`);
    }
  }

  if (!responseText) {
    const detail = haikuError instanceof Error ? ` (last error: ${haikuError.message})` : '';
    throw new Error(`No AI provider configured (ANTHROPIC_API_KEY or GEMINI_API_KEY required)${detail}`);
  }

  // Prevent unused-var lint when both providers succeed immediately.
  void geminiError;

  // ── Prompt Shield: re-identify placeholders in response ──
  if (redactionMap.length > 0) {
    responseText = unshieldResponse(responseText, redactionMap);
  }

  return { text: responseText, model, fallback };
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

/** Remove trailing commas before } or ] — common LLM mistake */
function fixTrailingCommas(str: string): string {
  return str.replace(/,\s*([}\]])/g, '$1');
}

function tryParse<T>(str: string): T | undefined {
  try {
    return JSON.parse(str) as T;
  } catch {
    // Try fixing trailing commas
    try {
      return JSON.parse(fixTrailingCommas(str)) as T;
    } catch {
      return undefined;
    }
  }
}

/**
 * Attempt to repair a JSON string that was truncated mid-value. Walks
 * back from the end until we hit a structural character that can legally
 * terminate the current depth, then closes any still-open braces/brackets.
 * Used as a last-ditch effort when maxTokens cut the model mid-output.
 */
function repairTruncatedJSON(text: string): string | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  let body = text.slice(firstBrace);

  // Strip any trailing partial token that definitely can't be valid.
  // Walk back to the last ',' '}' ']' or '"' that isn't inside a broken token.
  // Simpler heuristic: cut at the last complete value terminator.
  const lastCompleteIdx = Math.max(
    body.lastIndexOf('}'),
    body.lastIndexOf(']'),
    body.lastIndexOf('"')
  );
  if (lastCompleteIdx === -1) return null;
  body = body.slice(0, lastCompleteIdx + 1);

  // Count unbalanced braces and brackets so we can close them.
  let inString = false;
  let escape = false;
  let braces = 0;
  let brackets = 0;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') braces += 1;
    else if (c === '}') braces -= 1;
    else if (c === '[') brackets += 1;
    else if (c === ']') brackets -= 1;
  }
  // If we're inside a string or the last char is a comma, we can't repair safely.
  if (inString) return null;
  body = body.replace(/,\s*$/, '');
  return body + ']'.repeat(Math.max(brackets, 0)) + '}'.repeat(Math.max(braces, 0));
}

export function extractJSON<T = unknown>(text: string): T {
  // 1. Try direct parse
  const direct = tryParse<T>(text);
  if (direct !== undefined) return direct;

  // 2. Strip markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const parsed = tryParse<T>(codeBlockMatch[1].trim());
    if (parsed !== undefined) return parsed;
  }

  // 3. Find outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const parsed = tryParse<T>(text.slice(firstBrace, lastBrace + 1));
    if (parsed !== undefined) return parsed;
  }

  // 4. Find outermost [ ... ] (for array responses)
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const parsed = tryParse<T>(text.slice(firstBracket, lastBracket + 1));
    if (parsed !== undefined) return parsed;
  }

  // 5. Last-ditch: try to repair a truncated JSON (maxTokens cut output).
  const repaired = repairTruncatedJSON(text);
  if (repaired) {
    const parsed = tryParse<T>(repaired);
    if (parsed !== undefined) {
      console.warn('[llm-client] Parsed AI response after truncation repair');
      return parsed;
    }
  }

  // Check if the model refused the task
  const lower = text.toLowerCase();
  if (lower.includes('i cannot') || lower.includes("i can't") || lower.includes('i don\'t have') || lower.includes('i need to be transparent') || lower.includes('unable to access')
    || lower.includes('no puedo') || lower.includes('no es posible') || lower.includes('lo siento')) {
    throw new Error('AI was unable to complete the request. Please try again or adjust your input.');
  }

  // Log the raw text so Vercel logs show exactly what the model returned
  // when parsing failed. Truncate to avoid blowing up the log lines.
  const preview = text.length > 800 ? `${text.slice(0, 400)} … ${text.slice(-400)}` : text;
  console.error('[llm-client] JSON parse failed. Raw response preview:', preview);

  throw new Error(
    `Failed to parse AI response (length ${text.length}). First 200 chars: ${text.slice(0, 200)}`
  );
}
