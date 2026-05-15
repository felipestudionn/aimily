import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAuthenticatedUser,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { ADMIN_EMAILS } from '@/lib/stripe';
import { persistStudioAsset } from '@/lib/storage';
import { loadStudioContext } from '@/lib/ai/load-studio-context';
import {
  consumeStudioOutput,
  refundStudioOutput,
  studioPoolEmptyResponse,
} from '@/lib/studio/output-checker';
import { removeBackground } from '@/lib/studio/background-removal';
import { generateAllFormats } from '@/lib/studio/multi-format';
import { normalizeAiError } from '@/lib/ai/error-messages';
import { ensureSafeExternalUrl } from '@/lib/url-allowlist';

export const runtime = 'nodejs';
export const maxDuration = 300;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/generate

   The single Studio generation endpoint. Orchestrates:
     1. Auth + rate limit
     2. Atomic output budget decrement (consume_studio_output RPC)
     3. Load studio context (brand + style memory URLs) for prompt overlay
     4. Background removal pre-step (Recraft/Photoroom or passthrough)
     5. Build prompt by type (still_life | editorial | tryon)
     6. Compose reference images array
     7. Call OpenAI gpt-image-1.5 quality=high size=1024x1536 (verbatim
        block adapted from /api/ai/freepik/editorial/route.ts:576-664)
     8. Persist master as studio asset (collection_assets row with
        studio_project_id, collection_plan_id NULL)
     9. Trigger sharp multi-format pipeline (12 derivatives, 0 USD API)
    10. Return master + format URLs + remaining outputs

   Refund-on-failure: any exception after consume_studio_output triggers
   refund_studio_output(purchase_id) so the user doesn't lose an output
   to a transient AI error.

   Reference: business-plan_aimily-studio-2026-05-14.md §6.2
   Reference: .planning/studio/IMPLEMENTATION-PLAN.md Phase 2
   ═══════════════════════════════════════════════════════════════════════════ */

type StudioOutputType = 'still_life' | 'editorial' | 'tryon';

interface ModelDirectives {
  complexion?: string;
  age?: string;
  hair?: string;
}

type Orientation = 'vertical' | 'horizontal' | 'square';
type Framing = 'close' | 'medium' | 'full';
type LightDirection = 'soft' | 'golden' | 'studio' | 'dramatic';

interface StudioGenerateBody {
  studio_project_id: string;
  type: StudioOutputType;
  product_image_url: string;
  product_name?: string;
  category?: 'CALZADO' | 'ROPA' | 'ACCESORIO' | string;
  scene?: string;
  reference_image_url?: string;
  model_id?: string;
  user_prompt?: string;
  model_directives?: ModelDirectives;
  orientation?: Orientation;
  framing?: Framing;
  light?: LightDirection;
}

/* OpenAI gpt-image-1.5 size map. The model accepts these three aspect-ratio
 * buckets at quality=high — we ship one per orientation choice. */
const SIZE_BY_ORIENTATION: Record<Orientation, string> = {
  vertical: '1024x1536',
  horizontal: '1536x1024',
  square: '1024x1024',
};

interface AimilyModel {
  id: string;
  name: string;
  headshot_url: string;
  description?: string;
  gender?: string;
  complexion?: string;
  hair_style?: string;
  hair_color?: string;
}

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  let purchaseId: string | undefined;
  let consumed = false;

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user!.id;

    const rateLimited = enforceAiUserRateLimit(userId, 'image');
    if (rateLimited) return rateLimited;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // ── 2. Parse + validate body ─────────────────────────────────────────
    const body = (await req.json()) as StudioGenerateBody;

    if (!body.studio_project_id) {
      return NextResponse.json(
        { error: 'studio_project_id is required' },
        { status: 400 }
      );
    }
    if (!body.product_image_url) {
      return NextResponse.json(
        { error: 'product_image_url is required' },
        { status: 400 }
      );
    }
    if (!['still_life', 'editorial', 'tryon'].includes(body.type)) {
      return NextResponse.json(
        { error: 'type must be one of still_life | editorial | tryon' },
        { status: 400 }
      );
    }
    if ((body.type === 'editorial' || body.type === 'tryon') && !body.model_id) {
      return NextResponse.json(
        { error: `${body.type} requires model_id (select a model from the casting bank)` },
        { status: 400 }
      );
    }

    // ── 3. Verify project ownership (RLS already enforces, but explicit) ──
    const { data: project, error: projectError } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id, brand_name')
      .eq('id', body.studio_project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'studio_project not found' },
        { status: 404 }
      );
    }
    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'studio_project ownership check failed' },
        { status: 403 }
      );
    }

    // ── 4. Consume output budget atomically (admin bypass) ───────────────
    // Admin emails (per src/lib/stripe.ts ADMIN_EMAILS) and users with
    // subscriptions.is_admin=true bypass the budget entirely. They can
    // generate without owning a pack — pure testing privilege.
    const isAdmin = ADMIN_EMAILS.includes(user!.email || '');
    let isAdminFromDb = false;
    if (!isAdmin) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle();
      isAdminFromDb = !!sub?.is_admin;
    }
    const adminBypass = isAdmin || isAdminFromDb;

    let outputsRemaining = -1; // -1 sentinel = unlimited (admin)
    if (!adminBypass) {
      const budget = await consumeStudioOutput(userId, body.studio_project_id);
      if (!budget.allowed) {
        return studioPoolEmptyResponse(body.studio_project_id);
      }
      purchaseId = budget.purchaseId;
      consumed = true;
      outputsRemaining = Math.max(budget.outputsRemaining - 1, 0);
    }

    // ── 5. Look up aimily model if provided ──────────────────────────────
    let aiModel: AimilyModel | null = null;
    if (body.model_id) {
      const { data } = await supabaseAdmin
        .from('aimily_models')
        .select('id, name, headshot_url, description, gender, complexion, hair_style, hair_color')
        .eq('id', body.model_id)
        .eq('is_active', true)
        .single();
      aiModel = data as AimilyModel | null;
      if (!aiModel) {
        if (purchaseId) await refundStudioOutput(userId, purchaseId);
        return NextResponse.json(
          { error: 'Selected model not found or inactive' },
          { status: 400 }
        );
      }
    }

    // ── 6. Load Studio context (brand + style memory URLs) ────────────────
    const studioCtx = await loadStudioContext(body.studio_project_id);

    // ── 7. Background removal pre-step ────────────────────────────────────
    let cleanedProductUrl = body.product_image_url;
    let bgRemoval: { provider: string; passthrough: boolean } = {
      provider: 'none',
      passthrough: true,
    };
    try {
      const removal = await removeBackground(body.product_image_url);
      cleanedProductUrl = removal.cleanedUrl;
      bgRemoval = { provider: removal.provider, passthrough: removal.passthrough };
    } catch (e) {
      console.error('[Studio generate] Background removal threw, passing through:', e);
    }

    // ── 8. Build GPT prompt by type ───────────────────────────────────────
    const orientation = body.orientation || 'vertical';
    const framing = body.framing;
    const light = body.light;
    const gptPrompt = buildStudioPrompt({
      type: body.type,
      productName: body.product_name || 'fashion product',
      category: body.category,
      scene: body.scene,
      userPrompt: body.user_prompt,
      modelDirectives: aiModel
        ? {
            complexion: aiModel.complexion,
            age: '20s',
            hair: aiModel.hair_style,
          }
        : body.model_directives,
      brandName: studioCtx.brand_name || project.brand_name,
      brandPalette: studioCtx.brand_palette,
      hasModel: !!aiModel,
      hasStyleReference: !!body.reference_image_url,
      hasStyleMemory: (studioCtx.style_memory_urls?.length || 0) > 0,
      orientation,
      framing,
      light,
    });

    // ── 9. Fetch + downsize all reference images to PNG ──────────────────
    const fetchAsPng = async (url: string): Promise<Buffer> => {
      await ensureSafeExternalUrl(url);
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return await sharp(buf)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
    };

    // ── 10. Compose image[] FormData for gpt-image-1.5 ────────────────────
    const formData = new FormData();
    formData.append('model', 'gpt-image-1.5');

    // Always include the product (index 0 by convention)
    const productPng = await fetchAsPng(cleanedProductUrl);
    formData.append('image[]', new Blob([productPng], { type: 'image/png' }), 'product.png');

    // Model headshot (when applicable — editorial/tryon)
    if (aiModel) {
      const headshotPng = await fetchAsPng(aiModel.headshot_url);
      formData.append('image[]', new Blob([headshotPng], { type: 'image/png' }), 'model.png');
    }

    // Style reference (composition/mood)
    if (body.reference_image_url) {
      try {
        const stylePng = await fetchAsPng(body.reference_image_url);
        formData.append('image[]', new Blob([stylePng], { type: 'image/png' }), 'style.png');
      } catch (e) {
        console.error('[Studio generate] style reference fetch failed, skipping:', e);
      }
    }

    // Style memory references (up to first 2 to avoid prompt overload)
    if (studioCtx.style_memory_urls?.length) {
      const memUrls = studioCtx.style_memory_urls.slice(0, 2);
      for (let i = 0; i < memUrls.length; i++) {
        try {
          const memPng = await fetchAsPng(memUrls[i]);
          formData.append('image[]', new Blob([memPng], { type: 'image/png' }), `brand-ref-${i + 1}.png`);
        } catch (e) {
          console.error(`[Studio generate] style_memory ref ${i} fetch failed:`, e);
        }
      }
    }

    formData.append('prompt', gptPrompt);
    formData.append('n', '1');
    formData.append('size', SIZE_BY_ORIENTATION[orientation]);
    formData.append('quality', 'high');
    formData.append('input_fidelity', 'high');

    // ── 11. Call gpt-image-1.5 ────────────────────────────────────────────
    const gptRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    if (!gptRes.ok) {
      const errText = await gptRes.text();
      console.error('[Studio generate] OpenAI error:', gptRes.status, errText.slice(0, 500));
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        { error: 'AI generation failed', details: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const gptJson: { data?: Array<{ b64_json?: string; url?: string }> } = await gptRes.json();
    const masterB64 = gptJson.data?.[0]?.b64_json;
    if (!masterB64) {
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        { error: 'AI returned no image data' },
        { status: 502 }
      );
    }

    // ── 12. Persist master to Supabase + collection_assets row ────────────
    const persisted = await persistStudioAsset({
      studioProjectId: body.studio_project_id,
      assetType: body.type === 'still_life' ? 'still_life' : body.type === 'tryon' ? 'tryon' : 'editorial',
      name: `${labelForType(body.type)} — ${body.product_name || 'studio'}`,
      base64: masterB64,
      mimeType: 'image/png',
      phase: 'studio',
      metadata: {
        provider: 'openai-gpt-image-1.5',
        type: body.type,
        scene: body.scene,
        category: body.category,
        model_id: body.model_id,
        model_name: aiModel?.name,
        background_removal: bgRemoval,
        style_memory_count: studioCtx.style_memory_urls?.length || 0,
        purchase_id: purchaseId,
      },
      uploadedBy: userId,
    });

    // ── 13. Trigger multi-format pipeline ─────────────────────────────────
    let formats: Awaited<ReturnType<typeof generateAllFormats>> = [];
    try {
      formats = await generateAllFormats({
        masterUrl: persisted.publicUrl,
        assetId: persisted.assetId,
        studioProjectId: body.studio_project_id,
      });
    } catch (e) {
      console.error('[Studio generate] multi-format pipeline error (master is saved):', e);
      // We do NOT fail the whole request — the master image is saved, formats
      // can be regenerated. The client gallery will retry.
    }

    // ── 14. Final response ────────────────────────────────────────────────
    return NextResponse.json({
      asset_id: persisted.assetId,
      master_url: persisted.publicUrl,
      formats,
      outputs_remaining: outputsRemaining, // -1 = unlimited (admin)
      provider: 'openai-gpt-image-1.5',
      background_removal: bgRemoval,
      type: body.type,
      admin_bypass: adminBypass || undefined,
    });
  } catch (error) {
    // Catch-all refund path
    if (consumed && userId && purchaseId) {
      try {
        await refundStudioOutput(userId, purchaseId);
      } catch (refundErr) {
        console.error('[Studio generate] refund failed in catch:', refundErr);
      }
    }
    console.error('[Studio generate] fatal:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Prompt builder for Studio. The contract mirrors the existing
// editorial/route.ts:576-664 GPT prompt: terse, references "Image 1" /
// "Image 2" / "Image 3" by index, hard-codes anatomy rules and product
// preservation. We localise it to the 3 Studio output types.
// ─────────────────────────────────────────────────────────────────────────

/* Hard-coded prompt fragments per creative-control value. Lines are
 * appended to the prompt in `buildStudioPrompt` when the user passes the
 * corresponding field. Phrasing is intentionally specific (a fashion
 * creative director would phrase it the same way). */
const FRAMING_PROMPT: Record<Framing, string> = {
  close: 'FRAMING: tight close-up, product fills the frame, detail-focused crop emphasising materials and construction.',
  medium: 'FRAMING: medium shot, product and immediate context visible, balanced negative space.',
  full: 'FRAMING: full wide shot, full body or full scene visible, generous environment around the subject.',
};

const LIGHT_PROMPT: Record<LightDirection, string> = {
  soft: 'LIGHTING: soft diffused natural daylight, even shadow tones, north-facing window quality.',
  golden: 'LIGHTING: golden hour warm low-angle sunlight, long natural shadows, amber highlights.',
  studio: 'LIGHTING: clean studio strobe lighting, controlled fill, neutral colour temperature, crisp definition.',
  dramatic: 'LIGHTING: high-contrast directional key light, deep shadows, single-source mood, low-key tonal range.',
};

const ORIENTATION_PROMPT: Record<Orientation, string> = {
  vertical: 'COMPOSITION: vertical (portrait) aspect ratio composition.',
  horizontal: 'COMPOSITION: horizontal (landscape) aspect ratio composition.',
  square: 'COMPOSITION: square 1:1 aspect ratio composition.',
};

function buildStudioPrompt(p: {
  type: StudioOutputType;
  productName: string;
  category?: string;
  scene?: string;
  userPrompt?: string;
  modelDirectives?: ModelDirectives;
  brandName?: string;
  brandPalette?: string[];
  hasModel: boolean;
  hasStyleReference: boolean;
  hasStyleMemory: boolean;
  orientation?: Orientation;
  framing?: Framing;
  light?: LightDirection;
}): string {
  const productType =
    p.category === 'CALZADO'
      ? 'footwear (shoe)'
      : p.category === 'ROPA'
      ? 'apparel garment'
      : 'fashion product';

  const lines: string[] = [];

  // Frame by type
  if (p.type === 'still_life') {
    lines.push(`HIGH-END EDITORIAL FASHION STILL-LIFE PHOTOGRAPH (object photography, ZERO humans).`);
    lines.push(`Image 1 shows the EXACT ${productType} ("${p.productName}"). The product in the final photo MUST be pixel-perfect identical to Image 1 — same shape, same colors, same materials, same details. Place it on a curated surface with intentional light and shadow, magazine editorial quality (Hereu, Khaite, Bottega, Jacquemus references).`);
    if (p.scene) lines.push(`SCENE: ${p.scene}.`);
    lines.push(`ABSOLUTE NO-HUMAN RULE: no model, no face, no hands, no feet, no limbs. Zero humans.`);
  } else if (p.type === 'editorial') {
    lines.push(`HIGH-END EDITORIAL FASHION PHOTOGRAPH (on-model, single human model).`);
    lines.push(`Image 1 shows the EXACT ${productType} ("${p.productName}"). The product in the final photo MUST be pixel-perfect identical to Image 1.`);
    if (p.hasModel) {
      lines.push(`Image 2 shows the EXACT model who must appear. Her face, facial features, hair color, hair length, hair style, skin tone, and overall appearance MUST be identical to Image 2. Do NOT change her face or hair in any way. This is non-negotiable.`);
    }
    if (p.hasStyleReference) {
      lines.push(`Image 3 shows the composition, pose, lighting, mood, and wardrobe to follow. Match its scene setup but use the face/hair from Image 2 and the product from Image 1.`);
    }
    if (p.scene) lines.push(`SCENE: ${p.scene}.`);
    if (p.category === 'CALZADO') {
      lines.push(`The product is footwear — it MUST be worn on the model's feet, visible and recognizable. NEVER held in hands.`);
    }
    lines.push(`ANATOMY: exactly 2 arms, 2 legs, 2 feet, 10 fingers, 10 toes. No extra/merged/missing limbs.`);
    lines.push(`HUMAN MODEL RULES: exactly ONE model, realistic human anatomy, realistic skin texture, natural confident pose. No CGI plastic skin.`);
  } else {
    // tryon
    lines.push(`Editorial fashion try-on photograph, full-body shot.`);
    lines.push(`The model shown in Image 2 is wearing/carrying the ${productType} ("${p.productName}") shown in Image 1.`);
    lines.push(`CRITICAL: preserve the model identity (face, body, hair, proportions) from Image 2 exactly.`);
    lines.push(`CRITICAL: preserve the ${productType} exactly as shown in Image 1 — silhouette, colorway, materials, stitching, construction. Do not redesign, do not add logos, do not alter proportions.`);
    lines.push(`Natural fit, realistic draping, appropriate shadows where the product meets the body. Editorial studio setting, soft professional lighting.`);
  }

  // Model casting directives
  if (p.hasModel && p.modelDirectives) {
    const md: string[] = [];
    if (p.modelDirectives.complexion) md.push(p.modelDirectives.complexion);
    if (p.modelDirectives.age) md.push(`approximately ${p.modelDirectives.age}`);
    if (p.modelDirectives.hair) md.push(p.modelDirectives.hair);
    if (md.length) lines.push(`MODEL CASTING BRIEF: ${md.join(', ')}.`);
  }

  // Product preservation contract (universal)
  lines.push(
    `CRITICAL PRODUCT PRESERVATION (non-negotiable): same silhouette, same proportions, same colorway, same materials, same stitching, same construction, same closures, same hardware as the product reference. DO NOT redesign, reinterpret, simplify, or substitute. DO NOT add logos, straps, laces, prints, or trims not present. DO NOT alter intrinsic colors.`
  );

  // Brand context (lite from Studio project)
  if (p.brandName) {
    lines.push(`BRAND CONTEXT: "${p.brandName}". Style cues should align with this brand's aesthetic.`);
  }
  if (p.brandPalette?.length) {
    lines.push(`BRAND PALETTE (may inform the scene / props, NEVER the product colorway): ${p.brandPalette.join(', ')}.`);
  }

  // Style Memory hint (user-marked outputs)
  if (p.hasStyleMemory) {
    lines.push(`STYLE MEMORY: the last reference images are previously-approved outputs from this brand. Align composition, lighting mood, and overall feel with those — they encode the brand's preferred visual vocabulary.`);
  }

  // Creative controls (orientation / framing / light) — appended before
  // the user prompt so the user's free-text always wins on conflicts.
  if (p.orientation) lines.push(ORIENTATION_PROMPT[p.orientation]);
  if (p.framing) lines.push(FRAMING_PROMPT[p.framing]);
  if (p.light) lines.push(LIGHT_PROMPT[p.light]);

  // User art direction
  if (p.userPrompt) lines.push(`ADDITIONAL ART DIRECTION: ${p.userPrompt}.`);

  // Universal reject list
  lines.push(
    `REJECT: no text, no captions, no watermarks, no brand logos, no multiple copies of the product, no CGI/plastic textures, no over-processed HDR, no cutout-on-flat-background default.`
  );
  lines.push(`Style: magazine editorial quality, natural lighting, realistic skin and fabric textures.`);

  return lines.join(' ');
}

function labelForType(type: StudioOutputType): string {
  if (type === 'still_life') return 'Still Life';
  if (type === 'editorial') return 'Editorial';
  return 'Try-On';
}
