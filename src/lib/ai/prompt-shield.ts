/**
 * Prompt Shield — Pseudonymization layer for AI prompts.
 *
 * Replaces sensitive business identifiers (brand names, competitor names,
 * URLs, social handles) with typed placeholders before sending to AI providers.
 * Re-identifies placeholders in AI responses with original values.
 *
 * Design principle: ZERO quality loss. Only replace identifiers that the LLM
 * doesn't need literally. Never touch prices, margins, or product descriptions
 * — those are essential for AI output quality.
 */

export interface ShieldContext {
  brandName?: string;
  brandWebsite?: string;
  brandInstagram?: string;
  competitorNames?: string[];
}

export interface RedactionEntry {
  original: string;
  placeholder: string;
}

export interface ShieldResult {
  shieldedText: string;
  redactionMap: RedactionEntry[];
}

/**
 * Pseudonymize sensitive identifiers in a prompt string.
 * Returns the shielded text + a map to reverse the operation.
 */
export function shieldPrompt(text: string, ctx: ShieldContext): ShieldResult {
  const redactionMap: RedactionEntry[] = [];

  let result = text;

  // 1. Brand name → [BRAND]
  if (ctx.brandName && ctx.brandName.length > 1) {
    const escaped = escapeRegex(ctx.brandName);
    // Case-insensitive replacement preserving context
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, '[BRAND]');
      redactionMap.push({ original: ctx.brandName, placeholder: '[BRAND]' });
    }
  }

  // 2. Brand website → [BRAND_URL]
  if (ctx.brandWebsite) {
    const escaped = escapeRegex(ctx.brandWebsite);
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, '[BRAND_URL]');
      redactionMap.push({ original: ctx.brandWebsite, placeholder: '[BRAND_URL]' });
    }
  }

  // 3. Instagram handle → [BRAND_IG]
  if (ctx.brandInstagram) {
    const handle = ctx.brandInstagram.replace(/^@/, '');
    const escaped = escapeRegex(handle);
    const regex = new RegExp(`@?${escaped}`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, '[BRAND_IG]');
      redactionMap.push({ original: ctx.brandInstagram, placeholder: '[BRAND_IG]' });
    }
  }

  // 4. Competitor names → [REF_BRAND_1], [REF_BRAND_2], etc.
  if (ctx.competitorNames?.length) {
    ctx.competitorNames.forEach((name, i) => {
      if (!name || name.length < 2) return;
      const escaped = escapeRegex(name.trim());
      const regex = new RegExp(escaped, 'gi');
      const placeholder = `[REF_BRAND_${i + 1}]`;
      if (regex.test(result)) {
        result = result.replace(regex, placeholder);
        redactionMap.push({ original: name.trim(), placeholder });
      }
    });
  }

  // 5. Generic URL patterns (https://...) that aren't already redacted
  result = result.replace(
    /https?:\/\/(?:www\.)?[^\s,)"']+/gi,
    (match) => {
      // Skip if already a placeholder
      if (match.startsWith('[')) return match;
      // Skip known safe URLs (API endpoints, CDN)
      if (match.includes('supabase.co') || match.includes('fal.ai') || match.includes('googleapis.com')) return match;
      const placeholder = '[URL_REDACTED]';
      redactionMap.push({ original: match, placeholder });
      return placeholder;
    }
  );

  // 6. Email patterns
  result = result.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    (match) => {
      redactionMap.push({ original: match, placeholder: '[EMAIL_REDACTED]' });
      return '[EMAIL_REDACTED]';
    }
  );

  return { shieldedText: result, redactionMap };
}

/**
 * Re-identify placeholders in AI response with original values.
 */
export function unshieldResponse(text: string, redactionMap: RedactionEntry[]): string {
  let result = text;

  // Reverse in order (longest first to avoid partial replacements)
  const sorted = [...redactionMap].sort((a, b) => b.placeholder.length - a.placeholder.length);

  for (const entry of sorted) {
    // Replace all occurrences of the placeholder
    result = result.split(entry.placeholder).join(entry.original);
  }

  return result;
}

/**
 * Quick check: does this prompt contain shieldable content?
 */
export function needsShielding(ctx: ShieldContext): boolean {
  return !!(ctx.brandName || ctx.brandWebsite || ctx.brandInstagram || ctx.competitorNames?.length);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
