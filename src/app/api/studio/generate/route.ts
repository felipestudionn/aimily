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
   Aimily Studio · /api/studio/generate

   This route is a STRUCTURAL TRANSPLANT of the GPT-Image-1.5 branch from
   /api/ai/freepik/editorial/route.ts (lines 576-663). That branch is what
   the main Aimily app uses today and what Felipe has been refining for
   months — face fidelity, product preservation, the composite trick when
   both model + style ref are present. We copy it letter-by-letter.

   What we DO have at Studio level (Studio-specific, not in editorial):
     • Auth (same hook)
     • Per-project output budget (consumeStudioOutput RPC + refund-on-fail)
     • Admin bypass for felipe.studionn@gmail.com
     • persistStudioAsset (writes to studio-outputs bucket + collection_assets row)

   What we DO NOT have at Studio level (editorial had CIS, we don't yet):
     • collectionPlanId → undefined (no plan)
     • story_context → undefined (no CIS load)
     • loadFullContext() → not called
     • Brand DNA / palette / consumer / trends enrichment → skipped
     These are kept as VARIABLES in the prompt builder so we can wire them
     up later when Studio gets its own brand context.

   What we DROP from earlier Studio versions:
     • Background removal pre-step (was passthrough — added latency without value)
     • Style Memory image injection (bloated the image[] array → identity confusion)
     • BRAND CONTEXT / PALETTE / FRAMING / LIGHT / REJECT prompt directives
       (departed from the editorial parity Felipe asked for)
     • Multi-format pipeline (generateAllFormats) — Felipe: "olvídate de los
       formatos. Entrégame una foto en calidad increíble."

   Reference: src/app/api/ai/freepik/editorial/route.ts lines 576-663
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

/* Story context — kept as an optional variable for future CIS wiring.
 * Currently always undefined for Studio. Mirrors the editorial route's
 * StoryContext shape so we can drop in CIS data later without changing the
 * prompt builder. */
interface StoryContext {
  name?: string;
  narrative?: string;
  mood?: string[];
  tone?: string;
  color_palette?: string[];
  brand_personality?: string;
}

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
  /* CIS-equivalent free-text fields filled by the user via the form.
   * Each is optional; combined into a single BRAND CONTEXT line. */
  brand_mood?: string;
  brand_palette?: string;
  target_consumer?: string;
}

/* OpenAI gpt-image-1.5 size map. The model accepts these three aspect-ratio
 * buckets at quality=high. The editorial route hardcodes 1024x1536 — Studio
 * keeps the option to switch via the orientation pill in the UI. */
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
  let userEmail: string | undefined;
  let planConsumed = 0;
  let packConsumed = 0;
  let consumed = false;

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    userId = user!.id;
    userEmail = user!.email!;

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
    // Felipe directive: la foto de referencia es OBLIGATORIA en editorial —
    // es la referencia visual que el prompt debe seguir todo el rato.
    if (body.type === 'editorial' && !body.reference_image_url) {
      return NextResponse.json(
        { error: 'reference_image_url is required for editorial type' },
        { status: 400 }
      );
    }

    // ── 3. Verify project ownership ──────────────────────────────────────
    const { data: project, error: projectError } = await supabaseAdmin
      .from('studio_projects')
      .select('id, user_id, brand_name')
      .eq('id', body.studio_project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'studio_project not found' }, { status: 404 });
    }
    if (project.user_id !== userId) {
      return NextResponse.json({ error: 'studio_project ownership check failed' }, { status: 403 });
    }

    // ── 4. Consume output budget atomically (admin bypass) ───────────────
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
      // Pick the action based on the output type the caller is generating —
      // still_life and tryon are cheaper than editorial (no model casting).
      const generateAction: 'editorial' | 'still_life' | 'tryon' =
        body.type === 'still_life'
          ? 'still_life'
          : body.type === 'tryon'
            ? 'tryon'
            : 'editorial';
      const budget = await consumeStudioOutput(userId, userEmail, generateAction);
      if (!budget.allowed) {
        return studioPoolEmptyResponse(body.studio_project_id);
      }
      planConsumed = budget.planConsumed;
      packConsumed = budget.packConsumed;
      consumed = true;
      outputsRemaining = budget.packBalanceAfter;
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
        if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
        return NextResponse.json({ error: 'Selected model not found or inactive' }, { status: 400 });
      }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       FROM HERE DOWN: copy of the editorial route's GPT-Image-1.5 branch.
       Variable names match the editorial route so the diff is obvious.
       ═══════════════════════════════════════════════════════════════════════ */

    const product_image_url = body.product_image_url;
    const style_reference_url = body.reference_image_url; // alias for parity
    const product_name = body.product_name;
    const category = body.category;
    const scene = body.scene;
    const user_prompt = body.user_prompt;

    // Story context: Studio doesn't load CIS today → undefined. Kept as a
    // declared variable so future CIS wiring is a single-line change.
    const story_context: StoryContext | undefined = undefined;
    void story_context; // referenced for future use

    // Orientation pill drives the OpenAI size param; editorial route uses
    // 1024x1536 hardcoded. We keep that as default.
    const orientation = body.orientation || 'vertical';

    // ── GPT IMAGE 1.5 PATH (verbatim from editorial.ts:576-663) ──────────

    let generatedUrl: string | null = null;
    const providerUsed = 'openai-gpt-image-1.5';

    if (aiModel?.headshot_url) {
      // Fetch all images as PNG buffers (editorial.ts:584-588)
      const fetchAsPng = async (url: string): Promise<Buffer> => {
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        return await sharp(buf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      };

      const productPng = await fetchAsPng(product_image_url);
      const headshotPng = await fetchAsPng(aiModel.headshot_url);

      const formData = new FormData();
      formData.append('model', 'gpt-image-1.5');
      formData.append('image[]', new Blob([productPng], { type: 'image/png' }), 'product.png');
      formData.append('image[]', new Blob([headshotPng], { type: 'image/png' }), 'model.png');

      // If we have a style reference, add it too (face composited or blurred)
      // — editorial.ts:599-610 VERBATIM
      if (style_reference_url) {
        try {
          const compositedBuffer = await compositeModelOntoStyleRef(style_reference_url, aiModel.headshot_url);
          const compositedPng = await sharp(compositedBuffer).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
          formData.append('image[]', new Blob([compositedPng], { type: 'image/png' }), 'style.png');
        } catch {
          const styleRes = await fetch(style_reference_url);
          const styleBuf = Buffer.from(await styleRes.arrayBuffer());
          const stylePng = await sharp(styleBuf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
          formData.append('image[]', new Blob([stylePng], { type: 'image/png' }), 'style.png');
        }
      }

      // Build a GPT-specific prompt that references images by index
      // — editorial.ts:613-626 VERBATIM (editorial type)
      // Tryon + still_life types use the same structure with type-appropriate
      // framing — kept terse on purpose; bloating this with brand/palette/
      // framing/light directives was what caused quality regressions earlier.
      const gptPrompt = buildStudioGptPrompt({
        type: body.type,
        product_name,
        category,
        scene,
        style_reference_url,
        user_prompt,
        brand_mood: body.brand_mood,
        brand_palette: body.brand_palette,
        target_consumer: body.target_consumer,
      });

      formData.append('prompt', gptPrompt);
      formData.append('n', '1');
      formData.append('size', SIZE_BY_ORIENTATION[orientation]);
      formData.append('quality', 'high');
      formData.append('input_fidelity', 'high');

      const gptRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      });

      if (!gptRes.ok) {
        const errText = await gptRes.text();
        console.error('[Studio GPT] OpenAI error:', gptRes.status, errText.slice(0, 500));
        if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
        return NextResponse.json(
          { error: 'AI generation failed', details: errText.slice(0, 200) },
          { status: 502 }
        );
      }

      const gptData = await gptRes.json();
      const masterB64: string | undefined = gptData.data?.[0]?.b64_json;
      const masterUrlReturned: string | undefined = gptData.data?.[0]?.url;

      if (!masterB64 && !masterUrlReturned) {
        if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
        return NextResponse.json({ error: 'AI returned no image data' }, { status: 502 });
      }

      // ── Persist master to Supabase (Studio-specific) ────────────────────
      if (masterB64) {
        const persisted = await persistStudioAsset({
          studioProjectId: body.studio_project_id,
          assetType:
            body.type === 'still_life' ? 'still_life' :
            body.type === 'tryon' ? 'tryon' : 'editorial',
          name: `${labelForType(body.type)} — ${product_name || 'studio'}`,
          base64: masterB64,
          mimeType: 'image/png',
          phase: 'studio',
          metadata: {
            provider: providerUsed,
            type: body.type,
            scene,
            category,
            model_id: body.model_id,
            model_name: aiModel.name,
            plan_consumed: planConsumed,
            pack_consumed: packConsumed,
            // Regen-relevant inputs (for the lightbox variation pills)
            product_image_url,
            reference_image_url: style_reference_url,
            product_name,
            orientation,
            framing: body.framing,
            light: body.light,
            user_prompt,
          },
          uploadedBy: userId,
        });
        generatedUrl = persisted.publicUrl;

        return NextResponse.json({
          asset_id: persisted.assetId,
          master_url: persisted.publicUrl,
          formats: [], // Felipe directive: skip multi-format for now
          outputs_remaining: outputsRemaining,
          provider: providerUsed,
          type: body.type,
          admin_bypass: adminBypass || undefined,
        });
      }

      // Fallback: external URL returned (rare for gpt-image-1.5)
      generatedUrl = masterUrlReturned!;
    } else {
      // ═══ NO-MODEL PATH (still_life) ═══
      // Studio doesn't use Freepik/Nano Banana. Use GPT-Image-1.5 directly
      // with just the product (+ optional style reference).
      const fetchAsPng = async (url: string): Promise<Buffer> => {
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        return await sharp(buf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      };

      const productPng = await fetchAsPng(product_image_url);
      const formData = new FormData();
      formData.append('model', 'gpt-image-1.5');
      formData.append('image[]', new Blob([productPng], { type: 'image/png' }), 'product.png');

      if (style_reference_url) {
        const styleRes = await fetch(style_reference_url);
        const styleBuf = Buffer.from(await styleRes.arrayBuffer());
        const stylePng = await sharp(styleBuf).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
        formData.append('image[]', new Blob([stylePng], { type: 'image/png' }), 'style.png');
      }

      const gptPrompt = buildStudioGptPrompt({
        type: body.type,
        product_name,
        category,
        scene,
        style_reference_url,
        user_prompt,
        brand_mood: body.brand_mood,
        brand_palette: body.brand_palette,
        target_consumer: body.target_consumer,
      });

      formData.append('prompt', gptPrompt);
      formData.append('n', '1');
      formData.append('size', SIZE_BY_ORIENTATION[orientation]);
      formData.append('quality', 'high');
      formData.append('input_fidelity', 'high');

      const gptRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      });

      if (!gptRes.ok) {
        const errText = await gptRes.text();
        console.error('[Studio GPT no-model] OpenAI error:', gptRes.status, errText.slice(0, 500));
        if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
        return NextResponse.json(
          { error: 'AI generation failed', details: errText.slice(0, 200) },
          { status: 502 }
        );
      }

      const gptData = await gptRes.json();
      const masterB64: string | undefined = gptData.data?.[0]?.b64_json;
      if (!masterB64) {
        if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
        return NextResponse.json({ error: 'AI returned no image data' }, { status: 502 });
      }

      const persisted = await persistStudioAsset({
        studioProjectId: body.studio_project_id,
        assetType: 'still_life',
        name: `Still Life — ${product_name || 'studio'}`,
        base64: masterB64,
        mimeType: 'image/png',
        phase: 'studio',
        metadata: {
          provider: providerUsed,
          type: body.type,
          scene,
          category,
          plan_consumed: planConsumed,
          pack_consumed: packConsumed,
          product_image_url,
          reference_image_url: style_reference_url,
          product_name,
          orientation,
          user_prompt,
        },
        uploadedBy: userId,
      });

      return NextResponse.json({
        asset_id: persisted.assetId,
        master_url: persisted.publicUrl,
        formats: [],
        outputs_remaining: outputsRemaining,
        provider: providerUsed,
        type: body.type,
        admin_bypass: adminBypass || undefined,
      });
    }

    // Should never reach here; left as a defensive fallback.
    if (consumed) await refundStudioOutput(userId, planConsumed, packConsumed);
    return NextResponse.json(
      { error: 'Unexpected end of generate flow', details: String(generatedUrl) },
      { status: 500 }
    );
  } catch (error) {
    // Catch-all refund path
    if (consumed && userId) {
      try {
        await refundStudioOutput(userId, planConsumed, packConsumed);
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

/* ───────────────────────────────────────────────────────────────────────────
   GPT prompt builder per Studio output type.

   The editorial branch is COPIED VERBATIM from /api/ai/freepik/editorial/
   route.ts:613-626 — the exact 7-line prompt Felipe has refined over months.
   Same words, same image-index refs, same conditionals.

   The tryon and still_life variants follow the same structural pattern with
   minimal type-specific tweaks.

   We deliberately do NOT add: BRAND CONTEXT, PALETTE, STYLE MEMORY, FRAMING,
   LIGHT, REJECT lists. Those bloated the prompt earlier and Felipe asked for
   strict parity with what works.
   ─────────────────────────────────────────────────────────────────────────── */
function buildStudioGptPrompt(p: {
  type: StudioOutputType;
  product_name: string | undefined;
  category: string | undefined;
  scene: string | undefined;
  style_reference_url: string | undefined;
  user_prompt: string | undefined;
  brand_mood?: string;
  brand_palette?: string;
  target_consumer?: string;
}): string {
  const { type, product_name, category, scene, style_reference_url, user_prompt } = p;

  /* User-provided brand context — only injected when at least one field
   * is non-empty. Single line so the prompt stays terse. Goes BEFORE
   * user_prompt so the free-text "additional direction" can still
   * override on conflicts. */
  const ctxBits: string[] = [];
  if (p.brand_mood?.trim()) ctxBits.push(`mood — ${p.brand_mood.trim()}`);
  if (p.brand_palette?.trim()) ctxBits.push(`palette references — ${p.brand_palette.trim()}`);
  if (p.target_consumer?.trim()) ctxBits.push(`target consumer — ${p.target_consumer.trim()}`);
  const brandContextLine = ctxBits.length
    ? `BRAND CONTEXT (informs scene, mood, environment — NEVER the product itself): ${ctxBits.join('; ')}.`
    : '';

  if (type === 'editorial') {
    // VERBATIM from editorial.ts:613-626
    return [
      `HIGH-END EDITORIAL FASHION PHOTOGRAPH.`,
      `Image 1 shows the EXACT product (${product_name || 'fashion product'}). The product in the final photo MUST be pixel-perfect identical to Image 1 — same shape, same colors, same materials, same details.`,
      `Image 2 shows the EXACT model who must appear. Her face, facial features, hair color, hair length, hair style, skin tone, and overall appearance MUST be identical to Image 2. Do NOT change her face or hair in any way. This is non-negotiable.`,
      style_reference_url
        ? `Image 3 shows the composition, pose, lighting, and wardrobe to follow. Match the scene setup from Image 3 but use the face/hair from Image 2 and the product from Image 1.`
        : `Create a high-end editorial fashion scene. The model from Image 2 wears/carries the product from Image 1.`,
      // HEAD ANGLE — softer wording. Tells the model to keep face identity
      // but let the head tilt/gaze follow the body's natural movement.
      style_reference_url
        ? `HEAD ANGLE: keep the facial features, hair, and skin tone identical to Image 2 (this is the identity). The head's angle, tilt, and gaze should flow naturally with the body's pose in Image 3 — if the shoulders twist or the arms reach, the head turns or tilts organically with them. The head must read as part of the body's movement, not as a frontal portrait sitting on top of a moving body.`
        : '',
      category === 'CALZADO'
        ? `The product is footwear — it MUST be worn on the model's feet, visible and recognizable. NEVER held in hands.`
        : '',
      scene ? `Scene: ${scene}.` : '',
      `ANATOMY: exactly 2 arms, 2 legs, 2 feet, 10 fingers. No extra limbs.`,
      `Style: magazine editorial quality, natural lighting, realistic skin texture.`,
      brandContextLine,
      user_prompt ? `Additional direction: ${user_prompt}` : '',
    ].filter(Boolean).join(' ');
  }

  if (type === 'tryon') {
    // Same skeleton as editorial — model wearing/carrying explicit.
    return [
      `EDITORIAL FASHION TRY-ON PHOTOGRAPH (full-body, on-model).`,
      `Image 1 shows the EXACT product (${product_name || 'fashion product'}). The product in the final photo MUST be pixel-perfect identical to Image 1 — same shape, same colors, same materials, same details.`,
      `Image 2 shows the EXACT model who must appear. Her face, facial features, hair color, hair length, hair style, skin tone, and overall appearance MUST be identical to Image 2. Do NOT change her face or hair in any way. This is non-negotiable.`,
      style_reference_url
        ? `Image 3 shows the composition, pose, lighting, and wardrobe to follow. Match the scene setup from Image 3 but use the face/hair from Image 2 and the product from Image 1.`
        : `Clean editorial studio setting with soft professional lighting.`,
      // HEAD ANGLE — same softer wording as editorial.
      style_reference_url
        ? `HEAD ANGLE: keep the facial features, hair, and skin tone identical to Image 2 (this is the identity). The head's angle, tilt, and gaze should flow naturally with the body's pose in Image 3 — if the shoulders twist or the arms reach, the head turns or tilts organically with them. The head must read as part of the body's movement, not as a frontal portrait sitting on top of a moving body.`
        : '',
      `The model is wearing or carrying the product from Image 1. Natural fit, realistic draping, appropriate shadows where the product meets the body.`,
      category === 'CALZADO'
        ? `The product is footwear — it MUST be worn on the model's feet, visible and recognizable. NEVER held in hands.`
        : '',
      `ANATOMY: exactly 2 arms, 2 legs, 2 feet, 10 fingers. No extra limbs.`,
      `Style: editorial fashion quality, realistic skin texture.`,
      brandContextLine,
      user_prompt ? `Additional direction: ${user_prompt}` : '',
    ].filter(Boolean).join(' ');
  }

  // still_life
  return [
    `HIGH-END EDITORIAL FASHION STILL-LIFE PHOTOGRAPH (object photography, ZERO humans).`,
    `Image 1 shows the EXACT product (${product_name || 'fashion product'}). The product in the final photo MUST be pixel-perfect identical to Image 1 — same shape, same colors, same materials, same details.`,
    style_reference_url
      ? `Image 2 shows the composition, lighting, and surface to follow. Match its scene setup but keep the product from Image 1 pixel-perfect.`
      : `Place the product on a curated surface with intentional light and shadow, magazine editorial quality (Hereu, Khaite, Bottega, Jacquemus references).`,
    scene ? `Scene: ${scene}.` : '',
    `ABSOLUTE NO-HUMAN RULE: no model, no face, no hands, no feet, no limbs. Zero humans.`,
    `Style: magazine editorial quality, natural lighting, realistic textures.`,
    brandContextLine,
    user_prompt ? `Additional direction: ${user_prompt}` : '',
  ].filter(Boolean).join(' ');
}

function labelForType(type: StudioOutputType): string {
  if (type === 'still_life') return 'Still Life';
  if (type === 'editorial') return 'Editorial';
  return 'Try-On';
}
