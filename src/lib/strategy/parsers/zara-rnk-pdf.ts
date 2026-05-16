/**
 * Zara RNK TOTAL PDF parser.
 *
 * Uses Anthropic Claude Sonnet to extract structured records from the
 * Inditex internal ranking PDF. Each page of the PDF lists 8-10 SKU rows
 * with identity, pricing, multi-location stock, 4 velocity windows, and
 * pipeline efficiency.
 *
 * Why Claude vs raw PDF.js: the Zara internal layout is dense and
 * position-dependent. Claude's vision-aware document handling is more
 * robust against minor format drift across snapshots than brittle
 * coordinate-based extraction. The trade-off is cost (~$0.30 per 13-page
 * PDF) and latency (~30-60s). For enterprise pilots this is acceptable.
 *
 * The extraction prompt is rigid: schema-conformant JSON only, with
 * `null` for missing values and a confidence per row. Claude is
 * explicitly told NOT to interpret, only to extract.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ParserResult, ParsedRecord } from './types';

const PARSER_VERSION = '1.0.0';
const MODEL_ID = 'claude-sonnet-4-5';

const EXTRACTION_PROMPT = `You are an extraction engine. Extract every SKU row from this Zara internal ranking PDF (RNK TOTAL) as NDJSON (newline-delimited JSON).

OUTPUT FORMAT:
- One complete JSON object per line.
- ONE row per line. NO outer wrapping array. NO comma between lines.
- NO prose, NO markdown fences, NO commentary.
- After the LAST row, emit exactly one line: {"_end":true}
- Lines look like:
{"row_index":1,"page":1,"model_ref":"4786 166 401","product_name":"…","family_code":"…","season_tag":"…","pvp":29.95,…}
{"row_index":2,"page":1,…}
…
{"_end":true}

ROW SCHEMA (use null for missing values):
    {
      "row_index": 1,
      "page": 1,
      "model_ref": "4786 166 401",
      "product_name": "ZW - GRANDAD COLLAR SHIRT WITH KNOT",
      "family_code": "W.A FLUIDOS LARGO - 1500",
      "section_code": "WOMAN",
      "season_tag": "I26+V26",
      "activation_date": "2026-05-08",
      "cluster_size": 303,
      "pvp": 29.95,
      "pvp_compare": 35.95,
      "markup_pct": 178.0,
      "on_promo": false,
      "stock_store": 12866,
      "stock_warehouse": 10157,
      "stock_available": 0,
      "stock_in_transit": 4073,
      "stock_pending": 65647,
      "stock_pending_date": "2026-06-18",
      "stock_adjusted": 9922,
      "stock_blocked": 176,
      "stock_fabric": 0,
      "days_in_store": 6,
      "stores_with_stock": 1042,
      "stores_active": 931,
      "pipeline_total": 92743,
      "cd2_available": 1309,
      "blocked_per_store": 38,
      "windows": [
        { "window": "d1", "units": 2801, "gross_commission": 540, "share_net_sales": 0.167, "importe": 101308 },
        { "window": "d2", "units": 2995, "gross_commission": 713, "share_net_sales": 0.230, "importe": 105927 },
        { "window": "7d", "units": 12647, "gross_commission": 3712, "share_net_sales": 0.285, "importe": 449387 },
        { "window": "8_14d", "units": 0, "gross_commission": 0, "share_net_sales": 0, "importe": 0 }
      ],
      "max_sale_promo": 11598,
      "max_sale_no_promo": 11640,
      "stores_with_sale": 744,
      "rotation_td_tr_aj_7d": 0.7,
      "rotation_td_tr_7d": 0.5,
      "emptying_rate": 0.3,
      "emptying_rate_available": 0.2,
      "total_bought": 105291,
      "total_sold": 12648,
      "total_shipped": 29587,
      "sell_through_shipped_pct": 0.427,
      "sell_through_bought_pct": 0.120,
      "returns_pct": 0.030,
      "extraction_confidence": 0.95,
      "parser_warnings": []
    }

RULES:
1. Extract EVERY SKU row visible in the PDF (typically 8-10 per page).
2. NEVER invent values. Use null for any field not present in the row.
3. Convert percentages to decimal: "12.0%" -> 0.120.
4. Convert European number formats: "29,95 €" -> 29.95. "12.866" -> 12866 (thousands separator).
5. Dates in PDF appear as "F.(08/05)" or "18/06/2026" — use current year if only DD/MM. Output as ISO YYYY-MM-DD.
6. season_tag values: "V26", "I26+V26", "V26 F.(01/05)" -> normalize to "V26" or "I26+V26".
7. model_ref is the top-line code like "4786 166 401" (model.color.subcolor). Preserve spaces.
8. family_code is the line like "WOMAN - W.A FLUIDOS LARGO - 1500" -> store as "W.A FLUIDOS LARGO - 1500".
9. on_promo = true ONLY if the row explicitly shows a "Promo" tag or markdown indicator.
10. Per-window units: yesterday=d1, day-before=d2, last-7d=7d, days -8 to -14=8_14d.
11. confidence: 1.0 if every visible field extracted cleanly; lower if rows were partially obscured.
12. row_index is global across pages (1, 2, 3... not per page).
13. Skip empty/total/header rows.

Begin output NOW with the first row JSON object. Do not say anything before it.`;

/**
 * Parse a Zara RNK TOTAL PDF using Claude vision-aware document extraction.
 *
 * @param pdfBytes the raw bytes of the PDF
 * @param apiKey override the API key (defaults to env)
 */
export async function parseZaraRnkPdf(
  pdfBytes: Uint8Array,
  apiKey?: string
): Promise<ParserResult> {
  const client = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });

  const base64 = Buffer.from(pdfBytes).toString('base64');

  // Claude Sonnet 4.5 supports up to 64K output tokens. A Zara RNK PDF
  // with ~120 SKUs needs ~80K output chars (~20K tokens), so we run at
  // 32K and fall back to a continuation call if the first response hits
  // the cap (`stop_reason === 'max_tokens'`).
  const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        },
        { type: 'text', text: EXTRACTION_PROMPT },
      ],
    },
  ];

  let accumulated = '';
  const log = (msg: string) => {
    // Surface progress on stderr without polluting structured stdout.
    if (process.env.STRATEGY_PARSER_VERBOSE) {
      process.stderr.write(`[zara-pdf-parser] ${msg}\n`);
    }
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    log(`stream attempt ${attempt + 1} starting (max_tokens=16000)`);
    // Use a tighter cap to keep each stream under the SDK's 10-min ceiling
    // and rely on continuation when Claude wants more room.
    const stream = client.messages.stream({
      model: MODEL_ID,
      max_tokens: 16000,
      messages,
    });
    let chunkText = '';
    let stopReason: string | null = null;
    let tokensReceived = 0;
    const t0 = Date.now();
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        chunkText += event.delta.text;
        tokensReceived += 1;
        if (tokensReceived % 200 === 0) {
          log(
            `  +200 deltas (total ${tokensReceived}, ${(chunkText.length / 1024).toFixed(1)}KB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`
          );
        }
      } else if (event.type === 'message_delta' && (event as any).delta?.stop_reason) {
        stopReason = (event as any).delta.stop_reason as string;
      }
    }
    log(
      `stream done: stop_reason=${stopReason}, ${(chunkText.length / 1024).toFixed(1)}KB in ${((Date.now() - t0) / 1000).toFixed(0)}s`
    );
    accumulated += chunkText;
    // NDJSON: stop when we see the end marker, even if Claude hits max_tokens
    // on an unrelated continuation. Always stop when end_turn arrives.
    if (accumulated.includes('"_end":true') || accumulated.includes('"_end": true')) break;
    if (stopReason !== 'max_tokens') break;
    messages.push({ role: 'assistant', content: chunkText });
    messages.push({
      role: 'user',
      content:
        'Continue emitting more NDJSON rows. Start a NEW line. Do NOT repeat any row already emitted. Each line is a complete JSON object. End with {"_end":true} on its own line.',
    });
  }
  log(`accumulated ${(accumulated.length / 1024).toFixed(1)}KB total`);

  const text = accumulated.trim();

  // NDJSON parsing — each line is a complete JSON object. Robust to:
  //   - markdown fences (lines that don't start with `{` are skipped)
  //   - mid-stream truncation (a partial last line is dropped)
  //   - continuation seams (no merging across line breaks)
  //   - prose interjections from Claude
  const rows: any[] = [];
  const parserWarnings: string[] = [];
  let skippedLines = 0;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/,$/, ''); // strip trailing comma if Claude added one
    if (!line || !line.startsWith('{')) continue;
    if (!line.endsWith('}')) continue; // partial / truncated line — drop
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === 'object') {
        if (obj._end === true) continue;
        if (typeof obj.model_ref === 'string' && obj.model_ref.length > 0) {
          rows.push(obj);
        } else {
          parserWarnings.push(`Skipped row without model_ref: ${line.slice(0, 80)}`);
        }
      }
    } catch {
      skippedLines += 1;
    }
  }
  if (skippedLines > 0) {
    parserWarnings.push(`Skipped ${skippedLines} unparseable line(s) during NDJSON extraction`);
  }
  if (rows.length === 0) {
    throw new Error(
      `NDJSON extraction yielded zero rows (length ${text.length}, first 400 / last 400 chars):\n${text.slice(0, 400)}\n…\n${text.slice(-400)}`
    );
  }
  // Backfill the shape expected by the rest of this function.
  const json = { rows, parser_warnings: parserWarnings };

  const records: ParsedRecord[] = json.rows.map((r: any, i: number) => ({
    row_index: r.row_index ?? i + 1,
    page_coord: r.page ? { page: r.page } : null,
    model_ref: String(r.model_ref || '').trim(),
    color_ref: extractColorRef(r.model_ref),
    variant_ref: null,
    product_name: r.product_name ?? null,
    family_code: r.family_code ?? null,
    subfamily_code: null,
    section_code: r.section_code ?? null,
    season_tag: String(r.season_tag || 'unknown').trim(),
    activation_date: r.activation_date ?? null,
    cluster_size: numOrNull(r.cluster_size),
    description_raw: r.product_name ?? null,
    pvp: numOrNull(r.pvp),
    pvp_compare: numOrNull(r.pvp_compare),
    markup_pct: normalizeMarkupPct(r.markup_pct),
    on_promo: Boolean(r.on_promo),
    cost_estimate: derivedCost(r.pvp, normalizeMarkupPct(r.markup_pct)),
    margin_pct_list: derivedMargin(normalizeMarkupPct(r.markup_pct)),
    stock_store: numOrNull(r.stock_store),
    stock_warehouse: numOrNull(r.stock_warehouse),
    stock_available: numOrNull(r.stock_available),
    stock_in_transit: numOrNull(r.stock_in_transit),
    stock_pending: numOrNull(r.stock_pending),
    stock_pending_date: r.stock_pending_date ?? null,
    stock_adjusted: numOrNull(r.stock_adjusted),
    stock_blocked: numOrNull(r.stock_blocked),
    stock_fabric: numOrNull(r.stock_fabric),
    days_in_store: numOrNull(r.days_in_store),
    stores_with_stock: numOrNull(r.stores_with_stock),
    stores_active: numOrNull(r.stores_active),
    stores_total: null,
    pipeline_total: numOrNull(r.pipeline_total),
    cd2_available: numOrNull(r.cd2_available),
    blocked_per_store: numOrNull(r.blocked_per_store),
    windows: Array.isArray(r.windows)
      ? r.windows.map((w: any) => ({
          window: w.window,
          units: numOrNull(w.units),
          gross_commission: numOrNull(w.gross_commission),
          share_net_sales: numOrNull(w.share_net_sales),
          importe: numOrNull(w.importe),
          max_sale_promo: numOrNull(r.max_sale_promo),
          max_sale_no_promo: numOrNull(r.max_sale_no_promo),
          stores_with_sale: numOrNull(r.stores_with_sale),
          rotation_td_tr_aj_7d: numOrNull(r.rotation_td_tr_aj_7d),
          rotation_td_tr_7d: numOrNull(r.rotation_td_tr_7d),
          emptying_rate: numOrNull(r.emptying_rate),
          emptying_rate_available: numOrNull(r.emptying_rate_available),
        }))
      : [],
    total_bought: numOrNull(r.total_bought),
    total_sold: numOrNull(r.total_sold),
    total_shipped: numOrNull(r.total_shipped),
    sell_through_shipped_pct: numOrNull(r.sell_through_shipped_pct),
    sell_through_bought_pct: numOrNull(r.sell_through_bought_pct),
    returns_pct: numOrNull(r.returns_pct),
    raw: r,
    original_labels: r.family_code ? { family_code: r.family_code } : undefined,
    extraction_confidence: typeof r.extraction_confidence === 'number' ? r.extraction_confidence : 0.85,
    parser_warnings: Array.isArray(r.parser_warnings) ? r.parser_warnings : [],
  }));

  // Aggregate coverage across all rows.
  const has = (sel: (r: ParsedRecord) => unknown) => records.some((r) => sel(r) != null);
  const hasWindow = (w: string) =>
    records.some((r) => r.windows.some((win) => win.window === w && win.units != null));

  const coverage = {
    identity: records.length > 0,
    pricing: has((r) => r.pvp),
    inventory: has((r) => r.stock_store) || has((r) => r.stock_warehouse),
    velocity_d1: hasWindow('d1'),
    velocity_7d: hasWindow('7d'),
    velocity_8_14d: hasWindow('8_14d'),
    efficiency: has((r) => r.sell_through_bought_pct),
    returns: has((r) => r.returns_pct),
    distribution: has((r) => r.stores_active),
    geographic: false,
    channel: false,
    size_curve: false,
    weather: false,
    marketing_exposure: false,
    page_traffic: false,
    return_reasons: false,
    markdown_date: has((r) => r.pvp_compare),
    stockout_days: false,
    supplier_lead_time: false,
    margin_after_returns: false,
  };

  const avgConfidence =
    records.length > 0
      ? records.reduce((a, r) => a + r.extraction_confidence, 0) / records.length
      : 0;

  return {
    parser_version: PARSER_VERSION,
    records,
    coverage_dimensions: coverage,
    parser_warnings: Array.isArray(json.parser_warnings) ? json.parser_warnings : [],
    parse_confidence: avgConfidence,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function derivedCost(pvp: unknown, markup: unknown): number | null {
  const p = numOrNull(pvp);
  const m = numOrNull(markup);
  if (p == null || m == null || m <= -100) return null;
  return Math.round((p / (1 + m / 100)) * 100) / 100;
}

function derivedMargin(markup: unknown): number | null {
  const m = numOrNull(markup);
  if (m == null) return null;
  return Math.round((m / (100 + m)) * 10000) / 10000;
}

/**
 * Normalize markup to percentage form (e.g. 178.0 for 178%).
 *
 * Claude tends to apply the prompt's "percentages to decimal" rule to
 * the `Mk 178%` value too, returning 1.78. Downstream classifier math
 * expects the percent-form value (178.0), so we coerce.
 *
 * Markups under 10% would not appear in fashion retail; the threshold
 * is a safe disambiguator between ratio and percent forms.
 */
function normalizeMarkupPct(raw: unknown): number | null {
  const n = numOrNull(raw);
  if (n == null) return null;
  return n < 10 ? n * 100 : n;
}

function extractColorRef(modelRef: unknown): string | null {
  if (typeof modelRef !== 'string') return null;
  // Zara format `MODEL FABRIC COLOR`: e.g. "4786 166 401"
  //   parts[0] = model       → canonical lineage
  //   parts[1] = fabric/sub  → variant within lineage
  //   parts[2] = color code  → the actual color (mapped via color taxonomy)
  // Color winner detection ranks parts[2] within the parts[0] lineage.
  const parts = modelRef.trim().split(/\s+/);
  if (parts.length >= 3) return parts[2];
  if (parts.length === 2) return parts[1];
  return null;
}
