/**
 * CIS Prefix helper
 *
 * Formats the flat context returned by `loadFullContext()` into a
 * prepend-friendly string block. Used by endpoints whose prompt builders
 * don't natively accept a CIS context parameter — we prepend this to the
 * user prompt before sending to the LLM.
 *
 * Design:
 * - Opt-in: only adds the block if there's something to add
 * - Human-readable: structured with clear section headers
 * - Directive: ends with an instruction that grounds the model in existing decisions
 */

export function formatCisPrefix(ctx: Record<string, string>): string {
  const parts: string[] = [];
  if (ctx.brandDNA) parts.push(`BRAND DNA:\n${ctx.brandDNA}`);
  if (ctx.consumer) parts.push(`TARGET CONSUMER:\n${ctx.consumer}`);
  if (ctx.vibe) parts.push(`COLLECTION VIBE:\n${ctx.vibe}`);
  if (ctx.moodboard) parts.push(`MOODBOARD SUMMARY:\n${ctx.moodboard}`);
  if (ctx.trends) parts.push(`SELECTED TRENDS:\n${ctx.trends}`);
  // Investigación de Mercado · per-lens cards (S3 lens map). Each lens
  // is opt-in so prompts that don't need a particular lens stay lean.
  if (ctx.market_trends) parts.push(`MARKET TRENDS (Block 1 · Lens 1):\n${ctx.market_trends}`);
  if (ctx.market_deep_dive) parts.push(`MARKET DEEP DIVE (Block 1 · Lens 2):\n${ctx.market_deep_dive}`);
  if (ctx.market_live_signals) parts.push(`MARKET LIVE SIGNALS (Block 1 · Lens 3):\n${ctx.market_live_signals}`);
  if (ctx.market_competitors) parts.push(`MARKET COMPETITORS & REFERENCES (Block 1 · Lens 4):\n${ctx.market_competitors}`);
  if (ctx.productCategory) parts.push(`PRODUCT CATEGORY: ${ctx.productCategory}`);
  if (ctx.collectionName) parts.push(`COLLECTION NAME: ${ctx.collectionName}`);
  if (ctx.season) parts.push(`SEASON: ${ctx.season}`);
  if (ctx.priceRange) parts.push(`PRICE RANGE: ${ctx.priceRange}`);
  if (ctx.salesTarget) parts.push(`SALES TARGET: ${ctx.salesTarget}`);
  if (ctx.existingSkus) parts.push(`EXISTING SKUS:\n${ctx.existingSkus}`);

  if (!parts.length) return '';

  return [
    '',
    '═══ EXISTING COLLECTION CONTEXT (CIS) ═══',
    parts.join('\n\n'),
    '═══ END CIS CONTEXT ═══',
    '',
    'Use this existing context to ground your analysis. The user has already made creative decisions — respect them, build on them, and do not contradict them. If the brief says something that conflicts with CIS, flag it clearly as an alignment question rather than silently overriding the CIS.',
    '',
    '',
  ].join('\n');
}
