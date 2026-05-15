import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAuthenticatedUser,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { ADMIN_EMAILS } from '@/lib/stripe';
import { persistStudioAsset } from '@/lib/storage';
import {
  consumeStudioOutput,
  refundStudioOutput,
  studioPoolEmptyResponse,
} from '@/lib/studio/output-checker';
import { compositeModelOntoStyleRef } from '@/lib/face-blur';
import { normalizeAiError } from '@/lib/ai/error-messages';

export const runtime = 'nodejs';
export const maxDuration = 300;

/* ═══════════════════════════════════════════════════════════════════════════
   Aimily Studio · /api/studio/variation

   Iterate on an already-generated, client-confirmed image. Instead of
   regenerating from the original product/model/reference, this endpoint
   uses the EXISTING output as the new input and asks GPT-Image-1.5 to
   modify ONE specific aspect — color, background, or the model's face —
   while preserving everything else.

   Three variation types:

     1. color — change the color of the product/garment, keep everything
        else identical.
     2. background — swap the scene/background while keeping the model,
        pose, product, and lighting direction intact.
     3. model — swap the face only (uses compositeModelOntoStyleRef with
        the new model headshot composited onto the generated image so the
        existing HEAD ANGLE directive does its job).

   Same auth + Studio budget + admin bypass + refund-on-failure pattern
   as /api/studio/generate. Each variation costs the same as a fresh
   generation ($0.25 OpenAI + ~$0.008 Claude for model swap, $0.25 for
   color/bg). One output deducted per call.
   ═══════════════════════════════════════════════════════════════════════════ */

type VariationType = 'color' | 'background' | 'model';

interface VariationBody {
  source_asset_id: string;
  variation_type: VariationType;
  /* Value depends on variation_type:
   *   color      → "burnt orange linen", "forest green silk", etc.
   *   background → "warm beige plaster wall, soft afternoon light", etc.
   *   model      → string is ignored; new_model_id is what matters. */
  target_value?: string;
  /* Only used when variation_type === 'model'. The new aimily_models.id. */
  new_model_id?: string;
}

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
    const body = (await req.json()) as VariationBody;

    if (!body.source_asset_id) {
      return NextResponse.json(
        { error: 'source_asset_id is required' },
        { status: 400 }
      );
    }
    if (!['color', 'background', 'model'].includes(body.variation_type)) {
      return NextResponse.json(
        { error: 'variation_type must be color | background | model' },
        { status: 400 }
      );
    }
    if (body.variation_type === 'model' && !body.new_model_id) {
      return NextResponse.json(
        { error: 'model variation requires new_model_id' },
        { status: 400 }
      );
    }
    if (body.variation_type !== 'model' && !body.target_value?.trim()) {
      return NextResponse.json(
        { error: `${body.variation_type} variation requires target_value` },
        { status: 400 }
      );
    }

    // ── 3. Load source asset + verify ownership ──────────────────────────
    const { data: sourceAsset, error: assetError } = await supabaseAdmin
      .from('collection_assets')
      .select('id, studio_project_id, url, name, asset_type, metadata')
      .eq('id', body.source_asset_id)
      .single();

    if (assetError || !sourceAsset || !sourceAsset.studio_project_id) {
      return NextResponse.json({ error: 'source asset not found' }, { status: 404 });
    }

    const { data: project } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id, brand_name')
      .eq('id', sourceAsset.studio_project_id)
      .single();

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ error: 'source asset not found' }, { status: 404 });
    }

    // ── 4. Admin bypass + budget ─────────────────────────────────────────
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

    let outputsRemaining = -1;
    if (!adminBypass) {
      const budget = await consumeStudioOutput(userId, sourceAsset.studio_project_id);
      if (!budget.allowed) {
        return studioPoolEmptyResponse(sourceAsset.studio_project_id);
      }
      purchaseId = budget.purchaseId;
      consumed = true;
      outputsRemaining = Math.max(budget.outputsRemaining - 1, 0);
    }

    // ── 5. For model swap, load the new aimily model ─────────────────────
    let newModel: AimilyModel | null = null;
    if (body.variation_type === 'model') {
      const { data } = await supabaseAdmin
        .from('aimily_models')
        .select('id, name, headshot_url, description, gender, complexion, hair_style, hair_color')
        .eq('id', body.new_model_id!)
        .eq('is_active', true)
        .single();
      newModel = data as AimilyModel | null;
      if (!newModel) {
        if (purchaseId) await refundStudioOutput(userId, purchaseId);
        return NextResponse.json({ error: 'New model not found or inactive' }, { status: 400 });
      }
    }

    // ── 6. Fetch the source image as PNG buffer ──────────────────────────
    const fetchAsPng = async (url: string): Promise<Buffer> => {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      return await sharp(buf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    };

    const sourcePng = await fetchAsPng(sourceAsset.url);

    // ── 7. Build FormData for GPT-Image-1.5 ──────────────────────────────
    const formData = new FormData();
    formData.append('model', 'gpt-image-1.5');

    /* Image composition strategy by variation type:
     *
     *   color / background → 1 image (the source). GPT modifies the
     *     target element while keeping everything else identical.
     *
     *   model → 2 images: composited(source + new headshot) as Image 1,
     *     new model headshot as Image 2. Same compositeModelOntoStyleRef
     *     helper that the editorial path uses for face fidelity. The
     *     HEAD ANGLE directive (see prompt below) handles the head pose. */
    if (body.variation_type === 'model' && newModel) {
      let compositedPng: Buffer;
      try {
        const compositedBuf = await compositeModelOntoStyleRef(sourceAsset.url, newModel.headshot_url);
        compositedPng = await sharp(compositedBuf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      } catch (e) {
        console.error('[Studio variation] composite failed, falling back to raw source:', e);
        compositedPng = sourcePng;
      }
      const headshotPng = await fetchAsPng(newModel.headshot_url);
      formData.append('image[]', new Blob([compositedPng], { type: 'image/png' }), 'source.png');
      formData.append('image[]', new Blob([headshotPng], { type: 'image/png' }), 'model.png');
    } else {
      formData.append('image[]', new Blob([sourcePng], { type: 'image/png' }), 'source.png');
    }

    // ── 8. Build variation-specific prompt ───────────────────────────────
    const prompt = buildVariationPrompt(body, newModel);

    formData.append('prompt', prompt);
    formData.append('n', '1');
    /* Match the source's original size when possible. Defaults to 1024x1536
     * (the typical vertical editorial format). */
    const sourceMeta = sourceAsset.metadata as Record<string, unknown> | null;
    const sourceOrientation = (sourceMeta?.orientation as string) || 'vertical';
    const size = sourceOrientation === 'horizontal' ? '1536x1024'
      : sourceOrientation === 'square' ? '1024x1024'
      : '1024x1536';
    formData.append('size', size);
    formData.append('quality', 'high');
    formData.append('input_fidelity', 'high');

    // ── 9. Call OpenAI ────────────────────────────────────────────────────
    const gptRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    if (!gptRes.ok) {
      const errText = await gptRes.text();
      console.error('[Studio variation] OpenAI error:', gptRes.status, errText.slice(0, 500));
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json(
        { error: 'AI generation failed', details: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const gptData = await gptRes.json();
    const masterB64: string | undefined = gptData.data?.[0]?.b64_json;
    if (!masterB64) {
      if (purchaseId) await refundStudioOutput(userId, purchaseId);
      return NextResponse.json({ error: 'AI returned no image data' }, { status: 502 });
    }

    // ── 10. Persist new asset ─────────────────────────────────────────────
    const variationLabel =
      body.variation_type === 'color' ? `Color variation` :
      body.variation_type === 'background' ? `Background variation` :
      `Model variation`;
    const persisted = await persistStudioAsset({
      studioProjectId: sourceAsset.studio_project_id,
      assetType: (sourceAsset.asset_type as 'still_life' | 'editorial' | 'tryon') || 'editorial',
      name: `${variationLabel} — ${sourceAsset.name}`,
      base64: masterB64,
      mimeType: 'image/png',
      phase: 'studio',
      metadata: {
        provider: 'openai-gpt-image-1.5',
        variation_type: body.variation_type,
        target_value: body.target_value || undefined,
        new_model_id: body.new_model_id || undefined,
        new_model_name: newModel?.name,
        parent_asset_id: sourceAsset.id,
        purchase_id: purchaseId,
        /* Carry forward all regen-relevant fields from the parent so
         * subsequent variations on THIS asset still work. */
        ...(sourceMeta ? {
          product_image_url: sourceMeta.product_image_url,
          reference_image_url: sourceAsset.url, // the new "reference" IS this image's parent
          model_id: body.new_model_id || sourceMeta.model_id,
          product_name: sourceMeta.product_name,
          category: sourceMeta.category,
          orientation: sourceMeta.orientation,
          framing: sourceMeta.framing,
          light: sourceMeta.light,
          type: sourceMeta.type,
        } : {}),
      },
      uploadedBy: userId,
    });

    return NextResponse.json({
      asset_id: persisted.assetId,
      master_url: persisted.publicUrl,
      formats: [],
      outputs_remaining: outputsRemaining,
      provider: 'openai-gpt-image-1.5',
      variation_type: body.variation_type,
      parent_asset_id: sourceAsset.id,
      admin_bypass: adminBypass || undefined,
    });
  } catch (error) {
    if (consumed && userId && purchaseId) {
      try {
        await refundStudioOutput(userId, purchaseId);
      } catch (refundErr) {
        console.error('[Studio variation] refund failed in catch:', refundErr);
      }
    }
    console.error('[Studio variation] fatal:', error);
    const norm = normalizeAiError(error);
    return NextResponse.json(
      { error: norm.userMessage, code: norm.internalCode },
      { status: norm.httpStatus }
    );
  }
}

/* Prompt builder by variation type. Each variant emphasises
 * "keep everything else identical" as forcefully as possible — the failure
 * mode of GPT-Image-1.5 image editing is over-editing. */
function buildVariationPrompt(body: VariationBody, newModel: AimilyModel | null): string {
  if (body.variation_type === 'color') {
    return [
      `Editorial fashion photograph variation. Image 1 is the source photo to modify.`,
      `KEEP IDENTICAL to Image 1: the model (face, hair, body, pose, expression), the background, the lighting direction and quality, the camera angle, the framing, the composition, all accessories, all props. Every pixel that is not the target garment/product must stay the same.`,
      `ONLY CHANGE the color and material of the main garment/product in the image to: ${body.target_value!.trim()}.`,
      `The garment's silhouette, drape, cut, fit, length, and construction must remain identical — only the colorway and material finish change. Lighting on the garment should adapt naturally to the new color.`,
      `Style: magazine editorial quality, natural lighting, realistic textures. Do not add text, watermarks, or extra elements.`,
    ].join(' ');
  }

  if (body.variation_type === 'background') {
    return [
      `Editorial fashion photograph variation. Image 1 is the source photo to modify.`,
      `KEEP IDENTICAL to Image 1: the model (face, hair, body, pose, expression), the garment/product (color, silhouette, material, every detail), all accessories, the lighting direction and shadow placement on the model. Every element that is not the background must stay the same.`,
      `ONLY CHANGE the background/scene to: ${body.target_value!.trim()}.`,
      `Match the lighting of the new background naturally to the existing lighting on the model so shadows and colour bounce read coherent. The model and product stay anchored exactly as in the source.`,
      `Style: magazine editorial quality, natural lighting, realistic textures. Do not add text, watermarks, or extra elements.`,
    ].join(' ');
  }

  // model swap
  return [
    `Editorial fashion photograph variation. Image 1 is the source photo (with the new model's face already composited onto the original body for placement reference). Image 2 is the EXACT model who must appear in the final photograph.`,
    `KEEP IDENTICAL to Image 1: the body, the pose, the garment/product (color, silhouette, material), all accessories, the background, the lighting, the camera angle, the framing. Every element except the face and hair must stay the same.`,
    `MODEL IDENTITY (non-negotiable): use the face, facial features, hair color, hair length, hair style, hair texture, skin tone, and overall appearance from Image 2 — not from Image 1. The composited face in Image 1 is only a placement hint; render the real face from Image 2 exactly.`,
    `HEAD ANGLE (critical): the body in Image 1 already implies a natural head angle, tilt, neck rotation, and gaze direction — replicate that EXACT head orientation with the new model's face. The new head must continue the line of the shoulders and neck as if the new model herself had taken the pose. Do not render the head locked-frontal when the body's posture asks for a turn or tilt. The head is part of a continuous body, not a portrait on top of it.`,
    `PHYSICAL CONTINUITY: the neck-shoulder anatomy must read as one coherent body. The jaw line follows the neck's rotation. The collarbones and shoulder blades remain in the same plane as Image 1.`,
    newModel?.complexion ? `Model directives: ${newModel.complexion} complexion, ${newModel.hair_color || ''} ${newModel.hair_style || 'hair'}.` : '',
    `Style: magazine editorial quality, natural lighting, realistic skin texture. Do not add text, watermarks, or extra elements.`,
  ].filter(Boolean).join(' ');
}
