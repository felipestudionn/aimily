/**
 * Run the moodboard AI analysis on SLAIZ from the command line.
 *
 * Why: the UI has the analyze-moodboard endpoint wired but no button
 * to trigger it stand-alone — analysis runs as a side-effect of other
 * flows that SLAIZ never went through. The CIS prompt context for
 * SLAIZ therefore ships with `moodboard_summary` empty, which our
 * placeholder coverage test (test-prompt-placeholders.ts) catches.
 *
 * This script:
 *   1. Reads SLAIZ moodboard image URLs from collection_workspace_data
 *   2. Downloads each through its signed URL (the bucket is private)
 *   3. Calls Claude Sonnet vision with the same system prompt the API
 *      route uses
 *   4. Persists the analysis text + keywords back to workspace_data
 *   5. Re-runs the CIS backfill so compilePromptContext picks it up
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/analyze-slaiz-moodboard.ts
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SLAIZ = '60652ef7-1b06-4be4-9a61-31357be0be65';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SONNET = 'claude-sonnet-4-20250514';
const BATCH_SIZE = 8; // matches the API route to keep prompt budget identical

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface AnalysisResult {
  collectionName?: string;
  keyColors: string[];
  keyTrends: string[];
  keyBrands: string[];
  keyItems: string[];
  keyStyles: string[];
  keyMaterials: string[];
  seasonalFit: string;
  moodDescription: string;
  targetAudience: string;
}

const SYSTEM = `You are a senior creative director and trend analyst who has led collection development at Balenciaga, Celine, and The Row. Decode visual signals into actionable collection intelligence.

Return ONLY valid JSON.`;

const USER_PROMPT = `Analyze these moodboard images. Return JSON:
{
  "collectionName": "Evocative editorial name",
  "keyColors": ["Color (#hex) — where seen"],
  "keyTrends": ["Trend: specific runway/cultural reference"],
  "keyBrands": ["Brand — why it connects"],
  "keyItems": ["Item — precise construction + material"],
  "keyStyles": ["Style category: sub-description"],
  "keyMaterials": ["Material — weight/hand"],
  "seasonalFit": "Season — reasoning",
  "moodDescription": "Cinematic 3-4 sentence paragraph",
  "targetAudience": "Demographics + psychographics + shopping behavior"
}

Base on what you ACTUALLY SEE. Specific over generic. Pantone-style color names.`;

function extractJSON(text: string): unknown {
  /* Trim ```json fences if Sonnet adds them despite the system prompt */
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

async function fetchAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url.slice(0, 80)}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return { base64: buf.toString('base64'), mimeType };
}

async function analyzeBatch(images: { base64: string; mimeType: string }[]): Promise<AnalysisResult> {
  const content: Anthropic.MessageParam['content'] = [
    ...images.map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: img.base64 },
    })),
    { type: 'text' as const, text: USER_PROMPT },
  ];
  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Sonnet returned no text');
  return extractJSON(textBlock.text) as AnalysisResult;
}

function mergeBatchResults(batches: AnalysisResult[]): AnalysisResult {
  const merged: AnalysisResult = {
    collectionName: batches[0]?.collectionName,
    keyColors: [],
    keyTrends: [],
    keyBrands: [],
    keyItems: [],
    keyStyles: [],
    keyMaterials: [],
    seasonalFit: batches[0]?.seasonalFit ?? '',
    moodDescription: batches.map((b) => b.moodDescription).filter(Boolean).join(' '),
    targetAudience: batches[0]?.targetAudience ?? '',
  };
  for (const b of batches) {
    merged.keyColors.push(...(b.keyColors || []));
    merged.keyTrends.push(...(b.keyTrends || []));
    merged.keyBrands.push(...(b.keyBrands || []));
    merged.keyItems.push(...(b.keyItems || []));
    merged.keyStyles.push(...(b.keyStyles || []));
    merged.keyMaterials.push(...(b.keyMaterials || []));
  }
  /* Dedupe each list — case-insensitive, first occurrence wins */
  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      const k = x.toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };
  merged.keyColors = dedupe(merged.keyColors).slice(0, 8);
  merged.keyTrends = dedupe(merged.keyTrends).slice(0, 6);
  merged.keyBrands = dedupe(merged.keyBrands).slice(0, 8);
  merged.keyItems = dedupe(merged.keyItems).slice(0, 10);
  merged.keyStyles = dedupe(merged.keyStyles).slice(0, 5);
  merged.keyMaterials = dedupe(merged.keyMaterials).slice(0, 6);
  return merged;
}

function buildAnalysisText(a: AnalysisResult): string {
  return [
    a.moodDescription,
    a.seasonalFit ? `Seasonal fit: ${a.seasonalFit}.` : '',
    a.targetAudience ? `Target audience: ${a.targetAudience}` : '',
    a.keyTrends.length ? `Trends: ${a.keyTrends.join(' · ')}.` : '',
    a.keyStyles.length ? `Styles: ${a.keyStyles.join(' · ')}.` : '',
    a.keyMaterials.length ? `Materials: ${a.keyMaterials.join(' · ')}.` : '',
  ].filter(Boolean).join(' ');
}

async function main() {
  console.log(`Loading SLAIZ moodboard images…`);
  const { data: row, error: readErr } = await supabase
    .from('collection_workspace_data')
    .select('id, data')
    .eq('collection_plan_id', SLAIZ)
    .eq('workspace', 'creative')
    .single();
  if (readErr || !row) {
    console.error('Could not load SLAIZ creative workspace:', readErr);
    process.exit(1);
  }
  const data = row.data as { blockData?: { moodboard?: { data?: { images?: string[]; analysis?: string; keywords?: string[] } } } };
  const urls = data?.blockData?.moodboard?.data?.images ?? [];
  if (urls.length === 0) {
    console.error('SLAIZ has no moodboard images');
    process.exit(1);
  }
  console.log(`Found ${urls.length} images. Downloading…`);

  const downloaded: { base64: string; mimeType: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const img = await fetchAsBase64(urls[i]);
      downloaded.push(img);
      if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${urls.length}…`);
    } catch (err) {
      console.warn(`  ⚠ skip image ${i}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Downloaded ${downloaded.length}/${urls.length} images.\n`);

  /* Batch the calls so we don't blow the Anthropic token budget */
  const batches: AnalysisResult[] = [];
  for (let i = 0; i < downloaded.length; i += BATCH_SIZE) {
    const slice = downloaded.slice(i, i + BATCH_SIZE);
    console.log(`Calling Sonnet vision on batch ${batches.length + 1} (${slice.length} images)…`);
    const result = await analyzeBatch(slice);
    batches.push(result);
  }

  const merged = mergeBatchResults(batches);
  const analysisText = buildAnalysisText(merged);
  const keywords = [
    ...merged.keyTrends.map((t) => t.split(':')[0]?.trim() || t).slice(0, 3),
    ...merged.keyStyles.map((s) => s.split(':')[0]?.trim() || s).slice(0, 2),
    ...merged.keyMaterials.slice(0, 3).map((m) => m.split('—')[0]?.trim() || m),
  ].filter(Boolean).slice(0, 8);

  console.log('\n──────── ANALYSIS PREVIEW ────────');
  console.log(`Collection: ${merged.collectionName || 'n/a'}`);
  console.log(`Mood: ${merged.moodDescription.slice(0, 200)}…`);
  console.log(`Keywords: ${keywords.join(', ')}`);
  console.log('──────────────────────────────────\n');

  /* Persist analysis + keywords inside the existing moodboard.data
     blob, leaving images and any other field untouched. */
  const newData = {
    ...data,
    blockData: {
      ...(data.blockData || {}),
      moodboard: {
        ...(data.blockData?.moodboard || {}),
        data: {
          ...(data.blockData?.moodboard?.data || {}),
          analysis: analysisText,
          keywords,
          fullAnalysis: merged,
        },
      },
    },
  };

  const { error: writeErr } = await supabase
    .from('collection_workspace_data')
    .update({ data: newData })
    .eq('id', row.id);
  if (writeErr) {
    console.error('Failed to persist analysis:', writeErr);
    process.exit(1);
  }
  console.log('Persisted to workspace_data. Re-run scripts/backfill-cis-from-workspace.ts to push into CIS.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
