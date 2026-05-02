/**
 * Aimily Assistant — cost estimation
 *
 * Anthropic Haiku 4.5 pricing as of 2026-05-02:
 * - Input:  $1.00 / 1M tokens
 * - Output: $5.00 / 1M tokens
 * - Cache write 5m TTL: 1.25x input = $1.25 / 1M
 * - Cache write 1h TTL: 2.00x input = $2.00 / 1M
 * - Cache read: 0.10x input = $0.10 / 1M
 *
 * Source: https://platform.claude.com/docs/en/about-claude/pricing
 *
 * NOTE: cache write tokens reported by the provider are AT THE BASE rate;
 * we apply the 1h multiplier here. If the assistant ever switches to 5m
 * TTL, change the constant.
 */

export const HAIKU_4_5_PRICING = {
  input_per_mtok: 1.0,
  output_per_mtok: 5.0,
  cache_write_1h_per_mtok: 2.0,
  cache_write_5m_per_mtok: 1.25,
  cache_read_per_mtok: 0.1,
} as const;

export interface UsageDelta {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cacheWriteTtl?: '5m' | '1h';
}

export function estimateCostUsd(u: UsageDelta): number {
  const writePricePerMtok =
    u.cacheWriteTtl === '5m'
      ? HAIKU_4_5_PRICING.cache_write_5m_per_mtok
      : HAIKU_4_5_PRICING.cache_write_1h_per_mtok;

  const cost =
    (u.inputTokens / 1_000_000) * HAIKU_4_5_PRICING.input_per_mtok +
    (u.outputTokens / 1_000_000) * HAIKU_4_5_PRICING.output_per_mtok +
    (u.cacheReadTokens / 1_000_000) * HAIKU_4_5_PRICING.cache_read_per_mtok +
    (u.cacheWriteTokens / 1_000_000) * writePricePerMtok;

  // Round to 4 decimals (matches NUMERIC(10,4) in DB)
  return Math.round(cost * 10_000) / 10_000;
}
