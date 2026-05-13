import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse, verifyCollectionOwnership, enforceAiUserRateLimit } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';
import { buildDesignPrompt } from '@/lib/ai/design-prompts';
import { loadFullContext, mergeContextWithInput } from '@/lib/ai/load-full-context';
import { extractImagePalette } from '@/lib/ai/extract-image-palette';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ═══════════════════════════════════════════════════════════
   Design & Dev Block — AI Generation Endpoint
   4 prompt types · Claude Haiku primary, Gemini fallback
   ═══════════════════════════════════════════════════════════ */

type GenerationType =
  | 'sketch-suggest'
  | 'color-suggest'
  | 'color-rename'
  | 'materials-suggest'
  | 'catalog-description'
  | 'sourcing-suggest';

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  if (!body?.type) {
    return NextResponse.json({ error: 'Missing "type" in request body' }, { status: 400 });
  }

  const type = body.type as GenerationType;
  const input = (body.input || {}) as Record<string, string>;
  const language = body.language as 'en' | 'es' | undefined;
  const collectionPlanId = body.collectionPlanId as string | undefined;

  // SERVER-SIDE: Load FULL context from CIS + Creative + Brief
  if (collectionPlanId) {
    const ownership = await verifyCollectionOwnership(user.id, collectionPlanId);
    if (!ownership.authorized) return ownership.error;
    const serverCtx = await loadFullContext(collectionPlanId);
    mergeContextWithInput(serverCtx, input);
  }

  /* Reference-photo palette injection (color-suggest only).
   *
   * Felipe's rule: the FIRST colorway proposal must read back the actual
   * colors of the SKU's reference photo. We extract them with sharp +
   * bucket clustering once, cache them on collection_skus.reference_palette,
   * and pass them to the prompt as `referencePalette`. Re-extraction
   * happens automatically when the cache is empty or stale.
   */
  if (type === 'color-suggest' && body.skuId) {
    try {
      const { data: skuRow } = await supabaseAdmin
        .from('collection_skus')
        .select('reference_image_url, reference_palette')
        .eq('id', body.skuId)
        .single();
      let palette = (skuRow?.reference_palette as { hex: string; share?: number }[] | null) ?? null;
      if (!palette && skuRow?.reference_image_url) {
        const extracted = await extractImagePalette(skuRow.reference_image_url, 6);
        if (extracted.length > 0) {
          palette = extracted;
          // Fire-and-forget cache — failure is non-blocking (next call retries).
          supabaseAdmin
            .from('collection_skus')
            .update({ reference_palette: palette })
            .eq('id', body.skuId)
            .then(({ error }) => {
              if (error) console.error('[design-generate] cache reference_palette failed', error);
            });
        }
      }
      if (palette && palette.length > 0) {
        input.referencePalette = JSON.stringify(palette);
      }
    } catch (err) {
      // Non-blocking: the prompt falls back to brand/Wada when no palette.
      console.error('[design-generate] reference palette extraction failed', err);
    }
  }

  const prompt = buildDesignPrompt(type, input);
  if (!prompt) {
    return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
  }

  try {
    const { data, model, fallback } = await generateJSON({
      system: prompt.system,
      user: prompt.user,
      temperature: prompt.temperature,
      language,
    });
    return NextResponse.json({ result: data, model, fallback });
  } catch (error) {
    console.error('Design generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
