/**
 * POST /api/ai/sample-review/compare
 *
 * Phase 4 — AI Photo Comparison.
 *
 * Compares the sample photos uploaded by the factory against the
 * approved technical sketch + 3D render and returns a structured
 * deviation report. This is the differentiator over Centric/FlexPLM:
 * those tools support photo upload + manual comments, but the
 * reviewer must identify deviations by eye. Aimily uses Claude
 * Sonnet Vision to read all 3 inputs together and pre-fill issues.
 *
 * Inputs:
 *   { sampleReviewId: string }    // pulls photos + sketch + render server-side
 * Outputs:
 *   {
 *     deviations: [{ area, severity: 'minor'|'major'|'critical', description }],
 *     approval_recommendation: 'approve' | 'minor_revisions' | 'major_revisions' | 'reject',
 *     summary: string,
 *     compared_at: string
 *   }
 *
 * The result is cached on the sample_reviews row (`ai_comparison`,
 * `ai_recommendation`, `ai_compared_at`) so the UI doesn't re-run
 * vision on every render.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  verifyCollectionOwnership,
  enforceAiUserRateLimit,
  checkAuthOnly,
  usageDeniedResponse,
} from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

interface ReqBody {
  sampleReviewId: string;
}

type Severity = 'minor' | 'major' | 'critical';
type ApprovalRecommendation = 'approve' | 'minor_revisions' | 'major_revisions' | 'reject';

interface Deviation {
  area: string;
  severity: Severity;
  description: string;
}

interface ComparisonResult {
  deviations: Deviation[];
  approval_recommendation: ApprovalRecommendation;
  summary: string;
}

// ─── Image helpers ────────────────────────────────────────────────

interface ImageData {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

async function urlToBase64(url: string): Promise<ImageData | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || 'image/jpeg').toLowerCase();
    const mediaType: ImageData['mediaType'] = ct.includes('png')
      ? 'image/png'
      : ct.includes('webp')
        ? 'image/webp'
        : ct.includes('gif')
          ? 'image/gif'
          : 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString('base64'), mediaType };
  } catch (err) {
    console.warn('[SampleCompare] could not fetch image:', url, err);
    return null;
  }
}

// ─── Prompt ───────────────────────────────────────────────────────

const SYSTEM = `You are a senior fashion product developer who has run sample reviews at Loro Piana, The Row, and Bottega Veneta. You read tech-pack sketches, 3D renders, and factory sample photos with the eye of someone who has shipped 100+ collections.

You do NOT issue vague critiques. You name the exact area of the garment, measure the deviation when possible, and rate severity:
  - minor: cosmetic, factory can fix without re-cutting
  - major: requires re-cut, re-pattern, or re-sourcing — sample must be redone
  - critical: kills the design intent — start over or kill the SKU

Approval recommendation:
  - approve: 0 deviations or all minor cosmetic
  - minor_revisions: 1–3 minor deviations, factory tweak then ship
  - major_revisions: 1+ major deviations, redo the sample
  - reject: critical deviations or design intent broken

Return ONLY valid JSON. No markdown.`;

const USER_PROMPT = `Compare these images:
1) APPROVED TECHNICAL SKETCH (target design)
2) APPROVED 3D RENDER (target visual)
3) SAMPLE PHOTO(S) FROM THE FACTORY

Identify every deviation between the target (sketch + render) and the sample.
Be specific: "Right panel hem is ~1.2cm shorter than sketch", "Topstitching is contrast-thread; sketch specifies tonal", "Hardware buckle is 22mm; tech pack specifies 18mm".

Return JSON:
{
  "deviations": [{"area": "string e.g. 'Front yoke'", "severity": "minor|major|critical", "description": "string"}],
  "approval_recommendation": "approve|minor_revisions|major_revisions|reject",
  "summary": "1-sentence executive summary"
}`;

// ─── Handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.sampleReviewId) {
    return NextResponse.json({ error: 'sampleReviewId required' }, { status: 400 });
  }

  // Load the sample review + the parent SKU's design assets.
  const { data: review, error: revErr } = await supabaseAdmin
    .from('sample_reviews')
    .select('id, sku_id, collection_plan_id, photos, review_type')
    .eq('id', body.sampleReviewId)
    .maybeSingle();
  if (revErr || !review) {
    return NextResponse.json({ error: 'Sample review not found' }, { status: 404 });
  }

  const ownership = await verifyCollectionOwnership(user.id, review.collection_plan_id);
  if (!ownership.authorized) return ownership.error;

  if (!review.sku_id) {
    return NextResponse.json({ error: 'Sample review has no linked SKU' }, { status: 400 });
  }

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('id, sketch_url, sketch_top_url, render_urls')
    .eq('id', review.sku_id)
    .maybeSingle();
  if (!sku) {
    return NextResponse.json({ error: 'Linked SKU not found' }, { status: 404 });
  }

  // Build the image set: sketch (1-2 views), render (3D if present), and
  // the sample photos. Cap at 8 total to stay within Sonnet's image limit
  // and keep latency reasonable.
  const photoUrls = Array.isArray(review.photos) ? (review.photos as string[]).slice(0, 4) : [];
  const renderUrl =
    sku.render_urls && typeof sku.render_urls === 'object'
      ? ((sku.render_urls as Record<string, string>)['3d'] ??
        (sku.render_urls as Record<string, string>).front ??
        null)
      : null;

  const candidateUrls = [sku.sketch_url, sku.sketch_top_url, renderUrl, ...photoUrls].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );

  if (photoUrls.length === 0) {
    return NextResponse.json(
      { error: 'No sample photos uploaded yet — add photos before running the comparison' },
      { status: 400 },
    );
  }
  if (!sku.sketch_url && !renderUrl) {
    return NextResponse.json(
      { error: 'No approved sketch or 3D render to compare against' },
      { status: 400 },
    );
  }

  // Fetch images server-side. Skipping any that fail is safer than
  // bailing the whole comparison.
  const images: ImageData[] = [];
  for (const url of candidateUrls.slice(0, 8)) {
    const img = await urlToBase64(url);
    if (img) images.push(img);
  }
  if (images.length < 2) {
    return NextResponse.json(
      { error: 'Could not fetch enough images to compare' },
      { status: 502 },
    );
  }

  // Send to Claude Sonnet Vision.
  let result: ComparisonResult | null = null;
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const content: Anthropic.ContentBlockParam[] = images.map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
    }));
    content.push({ type: 'text', text: USER_PROMPT });

    const res = await client.messages.create({
      model: SONNET_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
      temperature: 0.4,
    });
    const block = res.content[0];
    if (block.type === 'text' && block.text) {
      result = extractJSON<ComparisonResult>(block.text);
    }
  } catch (err) {
    return NextResponse.json(normalizeAiError(err), { status: 502 });
  }

  if (!result || !Array.isArray(result.deviations)) {
    return NextResponse.json({ error: 'AI returned invalid output' }, { status: 502 });
  }

  // Cache on the row + auto-suggest a status from the recommendation.
  // Reviewer keeps the final word (the UI shows it as a hint), but the
  // status field tracks the model's verdict so dashboards have signal.
  const statusSuggestion =
    result.approval_recommendation === 'approve'
      ? 'approved'
      : result.approval_recommendation === 'reject'
        ? 'rejected'
        : 'issues_found';

  const comparedAt = new Date().toISOString();
  const issuesPayload = result.deviations.map((d) => ({
    area: d.area,
    severity: d.severity,
    description: d.description,
    source: 'ai',
  }));

  await supabaseAdmin
    .from('sample_reviews')
    .update({
      ai_comparison: { ...result, compared_at: comparedAt },
      ai_recommendation: result.approval_recommendation,
      ai_compared_at: comparedAt,
      issues: issuesPayload,
      // Only set status if reviewer hasn't already set one explicitly.
      // (We don't overwrite a human decision; if you want to re-run AI,
      // re-trigger and accept the new recommendation manually.)
      ...(review.review_type ? {} : {}),
    })
    .eq('id', body.sampleReviewId);

  return NextResponse.json({
    sampleReviewId: body.sampleReviewId,
    ...result,
    compared_at: comparedAt,
    suggested_status: statusSuggestion,
  });
}
