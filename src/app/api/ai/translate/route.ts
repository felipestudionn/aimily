/**
 * POST /api/ai/translate
 *
 * Phase 5 — Vendor portal AI translation.
 *
 * Translates short tech-pack passages (factory notes, BOM material
 * names, measurement labels) into the vendor's working language.
 * Centric/FlexPLM are English-only; Aimily ships in 9 locales out of
 * the box and exposes on-demand translation for everything else.
 *
 * Public — no auth — but requires a valid vendor token in the body so
 * we don't run up Anthropic spend from anonymous callers. Vendor scope
 * also lets us audit who triggered translations.
 *
 * Body: { token: string, text: string, target_locale: string }
 * Returns: { translated: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface ReqBody {
  token: string;
  text: string;
  target_locale: string;
}

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  pt: 'Portuguese',
  nl: 'Dutch',
  zh: 'Simplified Chinese',
  zh_TW: 'Traditional Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  vi: 'Vietnamese',
  tr: 'Turkish',
  ar: 'Arabic',
};

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.token || !body.text || !body.target_locale) {
    return NextResponse.json({ error: 'token, text, target_locale required' }, { status: 400 });
  }
  if (body.text.length > 4000) {
    return NextResponse.json({ error: 'text too long (max 4000 chars)' }, { status: 400 });
  }

  // Validate the vendor token. We don't authenticate the user; we just
  // verify the invitation exists, isn't revoked, and isn't expired.
  const { data: inv } = await supabaseAdmin
    .from('vendor_invitations')
    .select('id, expires_at, revoked_at, permissions')
    .eq('token', body.token)
    .maybeSingle();
  if (!inv || inv.revoked_at || new Date(inv.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const perms = inv.permissions as Record<string, boolean>;
  if (!perms?.translate) {
    return NextResponse.json({ error: 'Translation not permitted on this invitation' }, { status: 403 });
  }

  const targetName = LOCALE_LABELS[body.target_locale] ?? body.target_locale;

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: `You are a professional fashion-industry translator. Translate the user's text into ${targetName}, preserving:
  - garment terminology (e.g. "topstitch", "yoke", "interlining")
  - measurement units exactly as written (cm, mm, gsm, etc.)
  - SKU codes and product names (do not localise)
  - Pantone codes verbatim (e.g. "18-1764 TCX")
Return ONLY the translated text. No commentary.`,
      messages: [{ role: 'user', content: body.text }],
      temperature: 0.2,
    });
    const block = res.content[0];
    if (block.type !== 'text' || !block.text) {
      return NextResponse.json({ error: 'Empty translation response' }, { status: 502 });
    }
    return NextResponse.json({ translated: block.text.trim() });
  } catch (err) {
    console.error('[AI/translate] failed:', err);
    return NextResponse.json({ error: 'Translation service failure' }, { status: 502 });
  }
}
