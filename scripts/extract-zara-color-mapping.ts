/**
 * Extract the actual Zara color-code → color mapping by running Claude
 * Vision over the V26 RNK PDF photos.
 *
 * Context (2026-05-18): Felipe verified that color code 401 in our
 * taxonomy is NOT "blanco" as the seed in migration 059d claims — the
 * PDF photo of SKU 4786 166 401 shows azul noche. The seed taxonomy
 * was an educated guess; we need to validate it against actual data.
 *
 * Felipe's hypothesis: there's an internal Zara logic to the color codes
 * (maybe a range bucketing — 100s = X family, 200s = Y family — or maybe
 * a hex-like scheme). We process ALL the PDF photos to find the pattern.
 *
 * Pipeline:
 *   1. Download the V26 RNK PDF from Supabase storage.
 *   2. Send it to Claude Sonnet 4.5 with a structured-output prompt
 *      asking for: for each SKU on the page, the model_ref, the last
 *      3 digits (= the color code), and the dominant color of the photo
 *      expressed as both a Spanish color name + a hex approximation.
 *   3. Parse the structured response, aggregate observations per code.
 *   4. Detect divergences vs the current seed taxonomy.
 *   5. Look for patterns: range bucketing (do 100s cluster as blues?
 *      200s as blacks? etc.), or other structure.
 *   6. Output:
 *        memory/zara-color-taxonomy-observations.json — raw per-SKU data
 *        memory/zara-color-taxonomy-proposed.json    — proposed mapping
 *        memory/zara-color-taxonomy-report.md        — divergences + patterns
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/extract-zara-color-mapping.ts
 *
 * Default tenant = aimily-internal (V26 corpus). Default run derives
 * the source automatically.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const TENANT_ID = '60105796-ea66-4355-b904-e10296436ff9';
const PDF_BUCKET = 'strategy-uploads';
const MODEL_ID = 'claude-sonnet-4-5';

interface SkuColorObservation {
  model_ref: string;
  /** Last 3 digits of model_ref (the color code per Felipe). */
  color_code: string;
  /** Dominant color name the model sees in the photo. */
  observed_color_name_es: string;
  /** Approximate hex (model's best estimate of the dominant tone). */
  observed_hex: string;
  /** Confidence the model has in the color identification (0-1). */
  confidence: number;
  /** Notes / caveats (e.g., "pattern with white background — chose
   *  primary garment colour"). */
  notes: string | null;
}

interface VisionResponse {
  skus: SkuColorObservation[];
}

const EXTRACTION_PROMPT = `Eres un parser de visión especializado en catálogos de moda. Estás viendo el PDF interno de Zara llamado "RNK TOTAL" — un listado de SKUs con foto del producto, código model_ref, familia, métricas operativas.

Por cada SKU visible en CUALQUIER página del PDF, extrae:

1. **model_ref** — el código completo del SKU (e.g., "4786 166 401"). Está debajo o al lado de la foto del producto. Tiene típicamente 3 grupos de dígitos separados por espacios.

2. **color_code** — los ÚLTIMOS 3 dígitos del model_ref (e.g., "401" del ejemplo). Esto es lo que el sistema interno de Zara usa como código de color.

3. **observed_color_name_es** — el COLOR DOMINANTE del producto visible en la foto, en español. Usa nombres operativos del oficio: blanco, negro, beige, crudo, marrón, marrón claro, marrón oscuro, camel, tostado, cuero, cognac, chocolate, tabaco, caqui, oliva, kaki, verde, verde botella, verde militar, verde menta, azul, azul marino, azul noche, azul claro, celeste, turquesa, petróleo, morado, violeta, lila, malva, rojo, granate, burdeos, vino, coral, rosa, rosa palo, rosa empolvado, fucsia, salmón, naranja, mostaza, ocre, amarillo, dorado, gris, gris claro, gris oscuro, gris perla, plata, denim claro, denim medio, denim oscuro. Si es un estampado, elige el color dominante de la prenda (no el fondo, no la silueta de modelo).

4. **observed_hex** — hex aproximado del color dominante (e.g., "#1a3162" para azul noche).

5. **confidence** — entre 0 y 1, qué tan seguro estás de tu identificación. 0.95+ = colour sólido y claro · 0.7-0.9 = colour predominante pero con sombras · 0.5-0.7 = ambiguo (e.g., estampado complejo, foto pequeña).

6. **notes** — cualquier caveat (e.g., "estampado floral sobre fondo blanco — predomina el azul de las flores", "foto en penumbra", null si no aplica).

Procesa TODAS las páginas del PDF y devuelve TODOS los SKUs visibles, no solo los primeros. Si hay 100 SKUs en el PDF, quiero los 100.

Devuelve ÚNICAMENTE JSON válido con la siguiente estructura, sin texto adicional, sin code fences:

{
  "skus": [
    {
      "model_ref": "4786 166 401",
      "color_code": "401",
      "observed_color_name_es": "azul noche",
      "observed_hex": "#1a3162",
      "confidence": 0.92,
      "notes": null
    }
  ]
}`;

async function main() {
  console.log('=== Zara color taxonomy extraction ===\n');

  // 1) Find the V26 RNK PDF source.
  const { data: sources, error: sourcesErr } = await supabaseAdmin
    .from('strategy_sources')
    .select('id, storage_path, source_format, season, observation_date, uploaded_at')
    .eq('tenant_id', TENANT_ID)
    .eq('source_format', 'zara_rnk_pdf')
    .order('uploaded_at', { ascending: false })
    .limit(1);
  if (sourcesErr || !sources || sources.length === 0) {
    console.error('No Zara RNK source found for tenant', TENANT_ID, sourcesErr?.message);
    process.exit(1);
  }
  const source = sources[0] as { id: string; storage_path: string; season: string; observation_date: string };
  console.log(`Source: ${source.season} (${source.observation_date})`);
  console.log(`Path:   ${source.storage_path}\n`);

  // 2) Download the PDF from Supabase storage.
  console.log('Downloading PDF from storage...');
  const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
    .from(PDF_BUCKET)
    .download(source.storage_path);
  if (dlErr || !pdfBlob) {
    console.error('Download failed:', dlErr?.message);
    process.exit(1);
  }
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  console.log(`Downloaded: ${(pdfBytes.length / 1024).toFixed(0)} KB\n`);

  // 3) Send to Claude Vision with the structured-output prompt.
  console.log(`Running Claude Vision (${MODEL_ID}) over the entire PDF...`);
  console.log('(this can take 1-3 minutes for a multi-page PDF)\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = Buffer.from(pdfBytes).toString('base64');

  const t0 = Date.now();
  // Long requests (>10 min) require streaming per Anthropic SDK. PDFs
  // with 30+ pages need streaming. Use the stream API and accumulate.
  let visionText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  const stream = client.messages.stream({
    model: MODEL_ID,
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });
  let lastTick = Date.now();
  let charsAccumulated = 0;
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      visionText += event.delta.text;
      charsAccumulated += event.delta.text.length;
      const now = Date.now();
      if (now - lastTick > 5000) {
        const elapsedSec = ((now - t0) / 1000).toFixed(0);
        console.log(`  streaming... ${(charsAccumulated / 1024).toFixed(1)}KB (${elapsedSec}s)`);
        lastTick = now;
      }
    } else if (event.type === 'message_start' && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    } else if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
  }

  const elapsedMs = Date.now() - t0;
  console.log(`\nVision stream complete in ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Tokens: input=${inputTokens}, output=${outputTokens}\n`);

  // Strip code fences if Claude added them despite the instruction.
  const cleaned = visionText
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '');

  let parsed: VisionResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse vision JSON. First 500 chars:');
    console.error(cleaned.slice(0, 500));
    console.error('\nSaving raw response for inspection.');
    await writeFile('/tmp/zara-vision-raw.txt', visionText);
    process.exit(1);
  }

  if (!Array.isArray(parsed.skus)) {
    console.error('Response missing skus array. Got:', Object.keys(parsed));
    process.exit(1);
  }

  console.log(`Extracted ${parsed.skus.length} SKU observations.\n`);

  // 5) Aggregate observations per color_code.
  const byCode = new Map<string, SkuColorObservation[]>();
  for (const obs of parsed.skus) {
    if (!obs.color_code) continue;
    const list = byCode.get(obs.color_code) ?? [];
    list.push(obs);
    byCode.set(obs.color_code, list);
  }

  // For each code, pick the most-confident observation as the canonical
  // proposed name. Track all observations so we can see disagreement.
  interface CodeProposal {
    color_code: string;
    n_observations: number;
    proposed_name_es: string;
    proposed_hex: string;
    confidence_avg: number;
    confidence_max: number;
    all_observed_names: Array<{ name: string; count: number }>;
    consensus: 'unanimous' | 'majority' | 'split' | 'single';
    sample_model_refs: string[];
  }
  const proposals: CodeProposal[] = [];
  for (const [code, obsList] of Array.from(byCode.entries())) {
    const nameCounts = new Map<string, number>();
    for (const o of obsList) {
      nameCounts.set(o.observed_color_name_es, (nameCounts.get(o.observed_color_name_es) ?? 0) + 1);
    }
    const ranked = Array.from(nameCounts.entries()).sort((a, b) => b[1] - a[1]);
    const topName = ranked[0]?.[0] ?? '';
    const topCount = ranked[0]?.[1] ?? 0;
    const total = obsList.length;

    let consensus: CodeProposal['consensus'] = 'single';
    if (total === 1) consensus = 'single';
    else if (topCount === total) consensus = 'unanimous';
    else if (topCount / total >= 0.6) consensus = 'majority';
    else consensus = 'split';

    // Pick the hex of the highest-confidence observation matching the top name.
    const topByName = obsList
      .filter((o) => o.observed_color_name_es === topName)
      .sort((a, b) => b.confidence - a.confidence);
    const propHex = topByName[0]?.observed_hex ?? obsList[0]?.observed_hex ?? '#cfcfcf';

    proposals.push({
      color_code: code,
      n_observations: total,
      proposed_name_es: topName,
      proposed_hex: propHex,
      confidence_avg: obsList.reduce((s, o) => s + o.confidence, 0) / total,
      confidence_max: Math.max(...obsList.map((o) => o.confidence)),
      all_observed_names: ranked.map(([name, count]) => ({ name, count })),
      consensus,
      sample_model_refs: obsList.slice(0, 5).map((o) => o.model_ref),
    });
  }
  proposals.sort((a, b) => a.color_code.localeCompare(b.color_code));

  // 6) Compare to current seed taxonomy.
  const { data: tax } = await supabaseAdmin
    .from('strategy_taxonomies')
    .select('mapping')
    .eq('tenant_id', TENANT_ID)
    .eq('taxonomy_kind', 'color')
    .eq('is_active', true)
    .maybeSingle();
  const seedMap = (
    (tax as { mapping?: { code_to_name?: Record<string, string> } } | null)?.mapping
      ?.code_to_name ?? {}
  ) as Record<string, string>;

  interface Divergence {
    color_code: string;
    seed_name: string | null;
    observed_name: string;
    n_observations: number;
    consensus: CodeProposal['consensus'];
    confidence_avg: number;
  }
  const divergences: Divergence[] = [];
  for (const p of proposals) {
    const seedName = seedMap[p.color_code] ?? null;
    const seedNorm = (seedName ?? '').replace(/_/g, ' ').toLowerCase().trim();
    const obsNorm = p.proposed_name_es.toLowerCase().trim();
    if (seedName == null || seedNorm !== obsNorm) {
      divergences.push({
        color_code: p.color_code,
        seed_name: seedName,
        observed_name: p.proposed_name_es,
        n_observations: p.n_observations,
        consensus: p.consensus,
        confidence_avg: p.confidence_avg,
      });
    }
  }

  // 7) Pattern detection — look for range bucketing (do codes cluster by
  //    color family?).
  interface RangeBucket {
    range: string;
    n_codes: number;
    dominant_family: string;
    coverage_pct: number;
    sample: Array<{ code: string; name: string }>;
  }
  const buckets: RangeBucket[] = [];
  const families = [
    { name: 'blanco/crudo', regex: /(blanco|crudo|hueso|marfil|crema|arena)/i },
    { name: 'negro/gris', regex: /(negro|gris|plata|carbon)/i },
    { name: 'azul', regex: /(azul|denim|celeste|turquesa|petr[oó]leo|noche)/i },
    { name: 'verde', regex: /(verde|caqui|oliva|kaki|menta|militar|bot[eé]lla)/i },
    { name: 'rojo/rosa', regex: /(rojo|rosa|coral|fucsia|salmon|granate|burdeos|vino)/i },
    { name: 'marrón/beige', regex: /(marr[oó]n|beige|camel|tostado|cuero|cognac|chocolate|tabaco|ocre)/i },
    { name: 'amarillo/naranja', regex: /(amarillo|naranja|mostaza|dorado)/i },
    { name: 'morado/lila', regex: /(morado|violeta|lila|malva)/i },
  ];
  // Group codes by first digit (rough hundreds bucket).
  const byHundreds = new Map<string, CodeProposal[]>();
  for (const p of proposals) {
    if (!/^\d+$/.test(p.color_code)) continue;
    const hundreds = p.color_code.padStart(3, '0').slice(0, 1);
    const list = byHundreds.get(hundreds) ?? [];
    list.push(p);
    byHundreds.set(hundreds, list);
  }
  for (const [hundreds, codeList] of Array.from(byHundreds.entries())) {
    const counts = new Map<string, number>();
    for (const p of codeList) {
      const fam = families.find((f) => f.regex.test(p.proposed_name_es));
      const key = fam ? fam.name : 'otro';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const dominant = ranked[0];
    if (!dominant) continue;
    buckets.push({
      range: `${hundreds}00-${hundreds}99`,
      n_codes: codeList.length,
      dominant_family: dominant[0],
      coverage_pct: Math.round((dominant[1] / codeList.length) * 100),
      sample: codeList
        .slice(0, 5)
        .map((p) => ({ code: p.color_code, name: p.proposed_name_es })),
    });
  }
  buckets.sort((a, b) => a.range.localeCompare(b.range));

  // 8) Write outputs.
  const memoryDir = path.resolve(__dirname, '..', 'memory');
  const obsPath = path.join(memoryDir, 'zara-color-taxonomy-observations.json');
  const propPath = path.join(memoryDir, 'zara-color-taxonomy-proposed.json');
  const reportPath = path.join(memoryDir, 'zara-color-taxonomy-report.md');

  await writeFile(
    obsPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_id: source.id,
        source_filename: source.original_filename,
        tenant_id: TENANT_ID,
        model_used: MODEL_ID,
        observations: parsed.skus,
      },
      null,
      2
    )
  );

  // Proposed taxonomy in the same shape as the seed (code_to_name +
  // code_to_hex), ready for direct merge into strategy_taxonomies.
  const proposedCodeToName: Record<string, string> = {};
  const proposedCodeToHex: Record<string, string> = {};
  for (const p of proposals) {
    proposedCodeToName[p.color_code] = p.proposed_name_es.replace(/\s+/g, '_');
    proposedCodeToHex[p.color_code] = p.proposed_hex;
  }
  await writeFile(
    propPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_id: source.id,
        tenant_id: TENANT_ID,
        n_codes: proposals.length,
        consensus_stats: {
          unanimous: proposals.filter((p) => p.consensus === 'unanimous').length,
          majority: proposals.filter((p) => p.consensus === 'majority').length,
          split: proposals.filter((p) => p.consensus === 'split').length,
          single: proposals.filter((p) => p.consensus === 'single').length,
        },
        code_to_name: proposedCodeToName,
        code_to_hex: proposedCodeToHex,
        per_code_details: proposals,
      },
      null,
      2
    )
  );

  // Human-readable divergence + pattern report.
  const lines: string[] = [];
  lines.push(`# Zara color taxonomy validation report\n`);
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Source**: ${source.original_filename} (source_id ${source.id})`);
  lines.push(`**Model**: ${MODEL_ID}`);
  lines.push(`**SKU observations**: ${parsed.skus.length}`);
  lines.push(`**Unique color codes**: ${proposals.length}`);
  lines.push(`**Divergences vs seed taxonomy**: ${divergences.length}\n`);

  lines.push(`## Consensus stats`);
  lines.push(`- Unanimous (all observations agree): ${proposals.filter((p) => p.consensus === 'unanimous').length}`);
  lines.push(`- Majority (≥60% agree): ${proposals.filter((p) => p.consensus === 'majority').length}`);
  lines.push(`- Split (<60% agree, disagreement): ${proposals.filter((p) => p.consensus === 'split').length}`);
  lines.push(`- Single (only one observation): ${proposals.filter((p) => p.consensus === 'single').length}\n`);

  lines.push(`## Pattern analysis — codes grouped by hundreds`);
  lines.push('| Range | # codes | Dominant family | Coverage | Sample |');
  lines.push('|-------|---------|-----------------|----------|--------|');
  for (const b of buckets) {
    const sample = b.sample.map((s) => `${s.code}=${s.name}`).join(', ');
    lines.push(`| ${b.range} | ${b.n_codes} | ${b.dominant_family} | ${b.coverage_pct}% | ${sample} |`);
  }
  lines.push('');

  lines.push(`## Divergences vs seed taxonomy (${divergences.length} of ${proposals.length})\n`);
  lines.push('Codes where the Claude Vision observation disagrees with the seed mapping in `supabase/migrations/059d_strategy_storage_and_seed.sql`. The seed was an unvalidated starter; these are the entries that need correction.\n');
  lines.push('| Code | Seed says | Observed | Observations | Consensus | Avg confidence |');
  lines.push('|------|-----------|----------|--------------|-----------|----------------|');
  for (const d of divergences) {
    lines.push(
      `| ${d.color_code} | ${d.seed_name ?? '(missing)'} | **${d.observed_name}** | ${d.n_observations} | ${d.consensus} | ${(d.confidence_avg * 100).toFixed(0)}% |`
    );
  }
  lines.push('');

  lines.push(`## Full proposed taxonomy (${proposals.length} codes)\n`);
  lines.push('Sorted by code. Use the JSON file for programmatic merging.\n');
  lines.push('| Code | Proposed name | Hex | Observations | Consensus | Sample model_refs |');
  lines.push('|------|---------------|-----|--------------|-----------|-------------------|');
  for (const p of proposals) {
    lines.push(
      `| ${p.color_code} | ${p.proposed_name_es} | \`${p.proposed_hex}\` | ${p.n_observations} | ${p.consensus} | ${p.sample_model_refs.slice(0, 2).join(', ')} |`
    );
  }
  lines.push('');

  await writeFile(reportPath, lines.join('\n'));

  console.log(`Wrote:`);
  console.log(`  ${obsPath}`);
  console.log(`  ${propPath}`);
  console.log(`  ${reportPath}`);
  console.log(`\nDivergences vs seed: ${divergences.length} / ${proposals.length} codes`);
  console.log(`Consensus: ${proposals.filter((p) => p.consensus === 'unanimous').length} unanimous, ${proposals.filter((p) => p.consensus === 'split').length} split\n`);
  console.log(`Top patterns by hundreds bucket:`);
  for (const b of buckets) {
    console.log(`  ${b.range}: ${b.n_codes} codes · ${b.dominant_family} ${b.coverage_pct}%`);
  }
  console.log(`\n=== Done ===\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
