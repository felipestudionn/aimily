import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkImageryUsage, usageDeniedResponse } from '@/lib/api-auth';
import { loadFullContext } from '@/lib/ai/load-full-context';

/* ═══════════════════════════════════════════════════════════════
   Brand Visual References — Freepik Mystic (text-to-image)

   Generates 4 FASHION-EDITORIAL reference images that visualize
   the brand mood using FULL CIS context:
     - productCategory (CALZADO/ROPA/ACCESORIOS)
     - consumer (demographics + psychographics + lifestyle)
     - vibe (collection mood narrative)
     - brandDNA (visual identity, voice, keywords, reference brands)
     - moodboard (summary of uploaded references)
     - trends (selected market trends)

   NOT stock photography. NOT Pinterest. NOT coffee/food/kitchen/office.
   Think a spread from Lula, i-D, Dazed, Self Service, Document Journal.

   4 scenes (parallel):
     1. EDITORIAL FIGURE   — styled subject in brand wardrobe, 3:4 portrait
     2. FASHION STILL LIFE — category-native product on editorial surface
     3. MATERIAL MACRO     — single material detail, no props
     4. MOOD ATMOSPHERE    — architectural world that holds the brand

   Async pattern: create task → poll /v1/ai/mystic/{id} until COMPLETED.
   ═══════════════════════════════════════════════════════════════ */

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const MYSTIC_ENDPOINT = 'https://api.freepik.com/v1/ai/mystic';

interface Scene {
  key: string;
  buildDirection: (ctx: EnrichedCtx) => string;
}

interface EnrichedCtx {
  brandName?: string;
  tone?: string;
  style?: string;
  colors?: string[];
  productCategory?: string;
  productType?: string;
  consumer?: string;
  vibe?: string;
  moodboard?: string;
  trends?: string;
  brandDNA?: string;
  referenceBrands?: string;
}

function inferProductType(category?: string): string {
  if (!category) return 'contemporary fashion';
  const c = category.toUpperCase();
  if (c.includes('CALZADO') || c.includes('FOOTWEAR') || c.includes('SHOE')) return 'footwear';
  if (c.includes('ROPA') || c.includes('APPAREL') || c.includes('CLOTH')) return 'apparel';
  if (c.includes('ACCES') || c.includes('BAG')) return 'accessories';
  return 'contemporary fashion';
}

const SCENES: Scene[] = [
  {
    key: 'editorial_figure',
    buildDirection: ({ productType }) => {
      const wardrobe =
        productType === 'footwear'
          ? 'cropped to mid-thigh showing the lower body and footwear, tailored trousers or a long skirt, the shoes are the focal point'
          : productType === 'accessories'
            ? 'mid-shot showing torso and hands holding an accessory (bag or piece of jewelry), minimal clean styling'
            : 'mid-shot in a complete considered outfit, layered garments, textile-rich styling';
      return `FASHION EDITORIAL FIGURE (3:4 portrait): ONE styled subject photographed for a contemporary fashion lookbook. ${wardrobe}. Pose is quiet and considered — NEVER smiling to camera, NEVER posed like a catalog model. Back turned, side profile, cropped head, or face out of focus. Natural window light or soft north-facing daylight. Styled exactly like a spread from i-D Magazine, Self Service, Document Journal, or 032c. The result should look like a scanned magazine page, not a stock photo.`;
    },
  },
  {
    key: 'fashion_still_life',
    buildDirection: ({ productType }) => {
      const subject =
        productType === 'footwear'
          ? 'a single contemporary shoe (loafer, mule, boot, or sneaker depending on the brand language)'
          : productType === 'accessories'
            ? 'a single contemporary bag, belt, or piece of jewelry'
            : 'a single folded garment or draped piece of fabric that represents the brand';
      return `FASHION STILL LIFE (3:4 portrait): ${subject}, photographed editorially on a considered surface (warm travertine, raw linen, pale plaster, aged oak, or matte concrete). Sculptural side light with deliberate shadow. Styled like Hereu / Jacquemus / Khaite / Bottega Veneta e-commerce and lookbook imagery. ABSOLUTELY NOT a product cutout on a flat background. ABSOLUTELY NOT a food still life. The object is a fashion piece, period.`;
    },
  },
  {
    key: 'material_macro',
    buildDirection: ({ productType }) => {
      const material =
        productType === 'footwear'
          ? 'full-grain leather with natural pebbling, suede nap, woven raffia, glossy patent, or rubber sole texture'
          : productType === 'accessories'
            ? 'polished metal hardware, pebbled leather, canvas weave, or satin silk'
            : 'brushed wool melton, raw silk, crisp cotton poplin, ribbed knit, heavy denim, or linen slub';
      return `FASHION MATERIAL MACRO (3:4 portrait): extreme close-up, 100% of the frame is a single fashion-grade material — ${material}. Natural raking light reveals the texture. Shallow depth of field. ONLY the material in frame — no props, no garment, no object, no hands, no food, no organic debris. Think a designer\'s fabric library page, shot for a Lemaire or Jil Sander mood deck.`;
    },
  },
  {
    key: 'mood_atmosphere',
    buildDirection: () => {
      return `FASHION MOOD / ATMOSPHERE (3:4 portrait): an architectural or environmental frame that evokes the brand world — a stone corridor, sun-washed concrete wall, empty modernist interior, quiet stairwell, tiled floor in raking light, or an out-of-focus urban edge. Color palette must echo the brand tones. Optionally one tiny silhouette of a styled figure far in the distance (never featured). Styled like a Our Legacy / Jil Sander / Lemaire / The Row campaign environment shot. NOT a domestic home, NOT a café, NOT a kitchen, NOT an office. Editorial, quiet, lived-in, architectural.`;
    },
  },
];

const UNIVERSAL_REJECT = [
  'NO food of any kind',
  'NO beverages, coffee cups, tea, wine, glasses, bottles',
  'NO kitchen items, plates, cutlery, utensils',
  'NO office supplies, electronics, phones, laptops, screens',
  'NO pets, animals, bugs',
  'NO text, captions, watermarks, brand names on any surface',
  'NO logos of any real brand',
  'NO recognizable identifiable faces or direct eye contact with camera',
  'NO cheesy stock photography lighting, NO Pinterest mood',
  'NO CGI plastic textures, NO AI-uncanny skin',
  'NO collage, NO multiple panels, NO borders, NO text overlay',
  'NO wedding photography, NO lifestyle blog imagery, NO Instagram influencer shots',
].join('. ');

async function createAndPoll(prompt: string): Promise<string | null> {
  const createRes = await fetch(MYSTIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY!,
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: 'traditional_3_4',
      resolution: '1k',
      model: 'fluid',
      creative_detailing: 75,
      engine: 'magnific_illusio',
      num_images: 1,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('[Visual Refs] Mystic create error:', createRes.status, errText.slice(0, 300));
    return null;
  }

  const json = await createRes.json();
  const taskId = json?.data?.task_id;
  if (!taskId) return null;

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${MYSTIC_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY! },
    });
    if (!statusRes.ok) continue;
    const sd = await statusRes.json();
    const status: string | undefined = sd.data?.status;
    if (status === 'COMPLETED') return sd.data?.generated?.[0] || null;
    if (status === 'FAILED') return null;
  }
  return null;
}

function buildPrompt(ctx: EnrichedCtx, scene: Scene): string {
  const colorStr = Array.isArray(ctx.colors) ? ctx.colors.slice(0, 5).join(', ') : '';
  const parts: string[] = [];

  parts.push('CONTEMPORARY FASHION BRAND VISUAL REFERENCE — editorial magazine spread (i-D, Self Service, Document Journal, Dazed, 032c). Not stock, not Pinterest.');
  parts.push(
    ctx.brandName
      ? `Brand: "${ctx.brandName}". Category: ${ctx.productType}.`
      : `Contemporary ${ctx.productType} brand.`,
  );
  if (ctx.vibe) parts.push(`Collection vibe: ${ctx.vibe}.`);
  if (ctx.tone) parts.push(`Voice and tone: ${ctx.tone}.`);
  if (ctx.style) parts.push(`Visual identity direction: ${ctx.style}.`);
  if (ctx.consumer) parts.push(`Target consumer: ${ctx.consumer}.`);
  if (ctx.moodboard) parts.push(`Moodboard reference: ${ctx.moodboard}.`);
  if (ctx.trends) parts.push(`Active trends: ${ctx.trends}.`);
  if (ctx.referenceBrands) parts.push(`Aesthetic inspiration brands (never to copy): ${ctx.referenceBrands}.`);
  if (colorStr) parts.push(`Color palette (the image MUST live in these tones, NO competing colors): ${colorStr}.`);

  parts.push(`SCENE DIRECTION: ${scene.buildDirection(ctx)}`);

  parts.push('AESTHETIC: 35mm film grain, natural grading, intentional composition, quiet luxury, contemporary. The result should FEEL like a page scanned from a fashion magazine, not a product photo, not a blog illustration, not a Pinterest pin.');

  parts.push(`ABSOLUTE REJECT LIST: ${UNIVERSAL_REJECT}.`);

  return parts.join(' ');
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    if (!FREEPIK_API_KEY) {
      return NextResponse.json({ error: 'FREEPIK_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { brandName, tone, style, colors, collectionPlanId } = body as {
      brandName?: string;
      tone?: string;
      style?: string;
      colors?: string[];
      collectionPlanId?: string;
    };

    // 4× Freepik Mystic per call → counts as 4 imagery units
    const usage = await checkImageryUsage(user!.id, user!.email!, 4);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const ctx: EnrichedCtx = {
      brandName,
      tone,
      style,
      colors,
      productType: 'contemporary fashion',
    };

    if (collectionPlanId) {
      try {
        const full = await loadFullContext(collectionPlanId);
        ctx.productCategory = full.productCategory || undefined;
        ctx.productType = inferProductType(full.productCategory);
        ctx.consumer = full.consumer || undefined;
        ctx.vibe = full.vibe || undefined;
        ctx.moodboard = full.moodboard || undefined;
        ctx.trends = full.trends || undefined;
        ctx.brandDNA = full.brandDNA || undefined;
        // Extract reference brands line from brandDNA if present
        const refMatch = ctx.brandDNA?.match(/Reference brands:\s*([^\n]+)/);
        if (refMatch) ctx.referenceBrands = refMatch[1];
        // Fallback tone/style from CIS
        if (!ctx.tone && ctx.brandDNA) {
          const toneMatch = ctx.brandDNA.match(/Tone:\s*([^\n]+)/);
          if (toneMatch) ctx.tone = toneMatch[1];
        }
        if (!ctx.style && ctx.brandDNA) {
          const styleMatch = ctx.brandDNA.match(/Visual Identity:\s*([^\n]+)/);
          if (styleMatch) ctx.style = styleMatch[1];
        }
      } catch (err) {
        console.warn('[Visual Refs] loadFullContext failed, using body only:', err);
      }
    }

    const results = await Promise.allSettled(
      SCENES.map((scene) => createAndPoll(buildPrompt(ctx, scene))),
    );

    const images = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((u): u is string => !!u);

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'All visual reference generations failed' },
        { status: 502 },
      );
    }

    return NextResponse.json({ images, provider: 'freepik-mystic' });
  } catch (error) {
    console.error('[Visual Refs] Error:', error);
    const message = error instanceof Error ? error.message : 'Visual references generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
