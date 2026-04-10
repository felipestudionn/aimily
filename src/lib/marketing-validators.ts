/**
 * Marketing Validators — platform character limits + content quality checks.
 *
 * Post-processes AI-generated marketing content to enforce platform-specific
 * constraints and quality rules (hook diversity, character counts, etc.).
 *
 * Sources: ad-creative SKILL.md (platform limits), social-content SKILL.md
 * (hook diversity rule).
 */

// ═══════════════════════════════════════════════════════════════
// Platform character limits
// ═══════════════════════════════════════════════════════════════

export interface CharLimit {
  recommended: number;
  max: number;
}

export interface PlatformLimits {
  instagram: {
    caption: CharLimit;
    hashtags_max: number;
    story_char: number;
  };
  tiktok: {
    caption: CharLimit;
    hashtags_max: number;
  };
  pinterest: {
    title: number;
    description: number;
  };
  facebook: {
    primary_text: CharLimit;
    headline: CharLimit;
  };
  meta_ads: {
    primary_text: CharLimit;
    headline: number;
    description: number;
  };
  google_ads: {
    headline: number;
    description: number;
    display_url_path: number;
  };
  linkedin_ads: {
    intro_text: CharLimit;
    headline: CharLimit;
    description: CharLimit;
  };
  email: {
    subject_line: CharLimit;
    preview_text: CharLimit;
  };
}

export const PLATFORM_LIMITS: PlatformLimits = {
  instagram: {
    caption: { recommended: 125, max: 2200 },
    hashtags_max: 30,
    story_char: 250,
  },
  tiktok: {
    caption: { recommended: 80, max: 2200 },
    hashtags_max: 100,
  },
  pinterest: {
    title: 100,
    description: 500,
  },
  facebook: {
    primary_text: { recommended: 125, max: 63206 },
    headline: { recommended: 27, max: 255 },
  },
  meta_ads: {
    primary_text: { recommended: 125, max: 2200 },
    headline: 40,
    description: 30,
  },
  google_ads: {
    headline: 30,
    description: 90,
    display_url_path: 15,
  },
  linkedin_ads: {
    intro_text: { recommended: 150, max: 600 },
    headline: { recommended: 70, max: 200 },
    description: { recommended: 100, max: 300 },
  },
  email: {
    subject_line: { recommended: 50, max: 78 },
    preview_text: { recommended: 90, max: 140 },
  },
};

// ═══════════════════════════════════════════════════════════════
// Hook diversity enforcement
// ═══════════════════════════════════════════════════════════════

export type HookType = 'curiosity' | 'story' | 'value' | 'contrarian';

export const VALID_HOOK_TYPES: readonly HookType[] = [
  'curiosity',
  'story',
  'value',
  'contrarian',
] as const;

export interface HookDiversityResult {
  passed: boolean;
  distinctTypes: number;
  required: number;
  distribution: Record<HookType, number>;
  dominantType: HookType | null;
  reason?: string;
}

/**
 * Verifies that a set of content pieces spans at least ceil(n * 0.6) distinct
 * hook types, with a hard minimum of 3 distinct types for sets of 4 or more.
 *
 * Items must have a `hook_type` field matching one of the 4 valid hook types.
 * Items with missing or invalid hook_type count as "unknown" and are rejected.
 */
export function enforceHookDiversity<T extends { hook_type?: string }>(
  items: T[]
): HookDiversityResult {
  const distribution: Record<HookType, number> = {
    curiosity: 0,
    story: 0,
    value: 0,
    contrarian: 0,
  };
  let unknown = 0;

  for (const item of items) {
    const h = item.hook_type as HookType | undefined;
    if (h && VALID_HOOK_TYPES.includes(h)) {
      distribution[h] += 1;
    } else {
      unknown += 1;
    }
  }

  const distinctTypes = (Object.keys(distribution) as HookType[]).filter(
    (k) => distribution[k] > 0
  ).length;

  // Required distinct types: 1 for singleton sets, 3 for 4+, ceil(n*0.6)
  // for small sets in between.
  const n = items.length;
  const required = n >= 4 ? Math.max(3, Math.ceil(n * 0.6)) : Math.min(n, 2);

  // Find the dominant type
  const dominantType =
    (Object.keys(distribution) as HookType[]).reduce<HookType | null>(
      (top, k) =>
        distribution[k] > 0 &&
        (!top || distribution[k] > distribution[top])
          ? k
          : top,
      null
    ) ?? null;

  const passed = distinctTypes >= required && unknown === 0;

  const reason = !passed
    ? unknown > 0
      ? `${unknown} items missing or have invalid hook_type`
      : `only ${distinctTypes} distinct hook types, need ${required}`
    : undefined;

  return { passed, distinctTypes, required, distribution, dominantType, reason };
}

// ═══════════════════════════════════════════════════════════════
// Character limit validation
// ═══════════════════════════════════════════════════════════════

export interface FieldValidation {
  field: string;
  length: number;
  limit: number;
  recommended?: number;
  status: 'ok' | 'over-recommended' | 'over-max';
}

export interface ValidationResult {
  ok: boolean;
  fields: FieldValidation[];
  warnings: string[];
  errors: string[];
}

function checkField(
  field: string,
  value: string | undefined,
  limit: number | CharLimit
): FieldValidation {
  const length = value?.length ?? 0;
  if (typeof limit === 'number') {
    return {
      field,
      length,
      limit,
      status: length > limit ? 'over-max' : 'ok',
    };
  }
  if (length > limit.max) {
    return {
      field,
      length,
      limit: limit.max,
      recommended: limit.recommended,
      status: 'over-max',
    };
  }
  if (length > limit.recommended) {
    return {
      field,
      length,
      limit: limit.max,
      recommended: limit.recommended,
      status: 'over-recommended',
    };
  }
  return {
    field,
    length,
    limit: limit.max,
    recommended: limit.recommended,
    status: 'ok',
  };
}

function resultFromFields(fields: FieldValidation[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const f of fields) {
    if (f.status === 'over-max') {
      errors.push(`${f.field}: ${f.length} chars > max ${f.limit}`);
    } else if (f.status === 'over-recommended' && f.recommended) {
      warnings.push(
        `${f.field}: ${f.length} chars > recommended ${f.recommended} (max ${f.limit})`
      );
    }
  }

  return {
    ok: errors.length === 0,
    fields,
    warnings,
    errors,
  };
}

/**
 * Validate character limits for a social media post output.
 * Supports instagram, tiktok, pinterest, facebook.
 */
export function validateSocialPost(
  platform: keyof PlatformLimits,
  output: { caption?: string; hashtags?: string[] }
): ValidationResult {
  const fields: FieldValidation[] = [];

  if (platform === 'instagram') {
    fields.push(
      checkField('caption', output.caption, PLATFORM_LIMITS.instagram.caption)
    );
    fields.push({
      field: 'hashtags_count',
      length: output.hashtags?.length ?? 0,
      limit: PLATFORM_LIMITS.instagram.hashtags_max,
      status:
        (output.hashtags?.length ?? 0) > PLATFORM_LIMITS.instagram.hashtags_max
          ? 'over-max'
          : 'ok',
    });
  } else if (platform === 'tiktok') {
    fields.push(checkField('caption', output.caption, PLATFORM_LIMITS.tiktok.caption));
  } else if (platform === 'pinterest') {
    fields.push(
      checkField('caption', output.caption, PLATFORM_LIMITS.pinterest.description)
    );
  }

  return resultFromFields(fields);
}

/**
 * Validate character limits for an email output.
 */
export function validateEmailFields(output: {
  subject_line?: string;
  preview_text?: string;
}): ValidationResult {
  const fields: FieldValidation[] = [];
  fields.push(
    checkField('subject_line', output.subject_line, PLATFORM_LIMITS.email.subject_line)
  );
  fields.push(
    checkField('preview_text', output.preview_text, PLATFORM_LIMITS.email.preview_text)
  );
  return resultFromFields(fields);
}

/**
 * Validate character limits for a paid-ads creative (Meta / Google / LinkedIn).
 */
export function validatePaidCreative(
  platform: 'meta_ads' | 'google_ads' | 'linkedin_ads',
  output: {
    primary_text?: string;
    headline?: string;
    description?: string;
    intro_text?: string;
  }
): ValidationResult {
  const fields: FieldValidation[] = [];

  if (platform === 'meta_ads') {
    fields.push(
      checkField('primary_text', output.primary_text, PLATFORM_LIMITS.meta_ads.primary_text)
    );
    fields.push(
      checkField('headline', output.headline, PLATFORM_LIMITS.meta_ads.headline)
    );
    if (output.description !== undefined) {
      fields.push(
        checkField('description', output.description, PLATFORM_LIMITS.meta_ads.description)
      );
    }
  } else if (platform === 'google_ads') {
    fields.push(
      checkField('headline', output.headline, PLATFORM_LIMITS.google_ads.headline)
    );
    fields.push(
      checkField('description', output.description, PLATFORM_LIMITS.google_ads.description)
    );
  } else if (platform === 'linkedin_ads') {
    fields.push(
      checkField('intro_text', output.intro_text, PLATFORM_LIMITS.linkedin_ads.intro_text)
    );
    fields.push(
      checkField('headline', output.headline, PLATFORM_LIMITS.linkedin_ads.headline)
    );
    fields.push(
      checkField('description', output.description, PLATFORM_LIMITS.linkedin_ads.description)
    );
  }

  return resultFromFields(fields);
}

// ═══════════════════════════════════════════════════════════════
// Intelligent text trimming
// ═══════════════════════════════════════════════════════════════

/**
 * Trim text to a maximum character count, cutting at the last complete word
 * boundary. Appends an ellipsis if the text was actually trimmed.
 *
 * Used for post-processing AI outputs that overflow platform limits.
 */
export function trimIntelligent(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Reserve space for the ellipsis character
  const limit = Math.max(1, maxChars - 1);
  const slice = text.slice(0, limit);

  // Find the last word boundary (space, newline, punctuation)
  const lastBoundary = Math.max(
    slice.lastIndexOf(' '),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('\t')
  );

  if (lastBoundary > limit * 0.5) {
    // We found a reasonable boundary — cut there
    return slice.slice(0, lastBoundary).trimEnd() + '…';
  }

  // No good boundary (e.g. a single very long word) — hard cut
  return slice.trimEnd() + '…';
}
