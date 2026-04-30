import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAuthOnly, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

/* ═══════════════════════════════════════════════════════════
   Zones Detect — adaptive zone list per product

   Replaces the hardcoded 3-template fallback (sneaker / apparel
   / accessory) with a per-SKU semantic zone list. The list is
   editable in the UI; this endpoint just gives a smart default.
   ═══════════════════════════════════════════════════════════ */

interface DetectedZone {
  id: string;
  name: string;
  defaultHex: string;
  semanticRole: 'identity' | 'structural' | 'accent' | 'neutral' | 'hardware';
  description: string;
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const productName = (body.productName as string) || '';
  const family = (body.family as string) || '';
  const category = (body.category as string) || '';
  const subcategory = (body.subcategory as string) || '';

  if (!productName && !family && !subcategory) {
    return NextResponse.json({ error: 'productName, family, or subcategory required' }, { status: 400 });
  }

  const system = `You are a senior product developer with 20 years of experience across footwear, apparel, and accessories. You know the anatomical zones of every product type — the parts a designer cares about when colorizing or specifying materials. You think like a pattern-maker: zones are the structural pieces that get cut, sewn, or assembled separately.`;

  const user_prompt = `Identify the colorable/material zones for this specific product:
- Product name: ${productName || 'not specified'}
- Family: ${family || 'not specified'}
- Category: ${category || 'not specified'}
- Subcategory: ${subcategory || 'not specified'}

YOUR TASK: Return the 5–9 zones that are visually and structurally distinct on THIS specific product. Adapt to the product type — do NOT use generic templates.

EXAMPLES OF GOOD ZONE DETECTION:
• Sneaker (low-top): Upper, Tongue, Midsole, Outsole, Laces, Heel Counter, Eyelets, Branding
• Sandal / chancla: Footbed, Vamp strap, Toe loop, Heel strap, Sole, Buckle
• Boot: Shaft, Vamp, Pull-loop, Heel cup, Sole, Stitching
• Stiletto: Vamp, Heel column, Sole, Counter, Topline
• T-shirt: Body, Sleeves, Neckline, Hem, Branding
• Pants: Waistband, Body, Pockets, Hem, Stitching, Closure
• Jacket: Body, Sleeves, Lapels, Lining, Buttons, Pockets, Cuffs
• Dress: Bodice, Skirt, Sleeves, Neckline, Closure
• Bag: Body, Strap, Hardware, Lining, Trim
• Hat: Crown, Brim, Band, Branding
• Sunglasses: Frame, Lenses, Temples, Bridge, Nose pads

RULES:
1. ZONES MUST BE SPECIFIC TO THE PRODUCT — a chancla has no Tongue, no Laces, no Heel Counter. A stiletto has no Midsole.
2. NAME ZONES THE WAY A DESIGNER WOULD — use industry-standard part names (Vamp, not "front"; Footbed, not "inside bottom").
3. SEMANTIC ROLE — for each zone, pick one:
   • "identity"   = the dominant zone, defines the product's visual character (Upper, Body, Vamp, Frame).
   • "structural" = the contrasting/grounding zone (Midsole, Sole, Lining, Bodice).
   • "accent"     = the small detail zone (Laces, Branding, Buckle, Trim).
   • "neutral"    = soft zones that recede (Lining, Stitching).
   • "hardware"   = metal/plastic functional parts (Eyelets, Buttons, Buckles, Closures).
4. DEFAULT HEX — pick a sensible default base color for each zone (will be overridden when the user colorizes). Use neutral tones unless the zone implies something (e.g. Laces → mid gray, Hardware → silver-ish).
5. DESCRIPTION — 4–8 words describing what the zone is, for a designer who's never seen this product type.

Return ONLY valid JSON, no preamble:
{
  "zones": [
    {
      "id": "lowercase-with-hyphens",
      "name": "Display Name",
      "defaultHex": "#XXXXXX",
      "semanticRole": "identity" | "structural" | "accent" | "neutral" | "hardware",
      "description": "what this zone is, briefly"
    }
  ]
}

5 to 9 zones. Order them by visual importance: identity first, then structural, then accents, hardware last.`;

  try {
    const { data, model, fallback } = await generateJSON<{ zones: DetectedZone[] }>({
      system,
      user: user_prompt,
      temperature: 0.4,
      maxTokens: 1500,
    });

    if (!data?.zones || !Array.isArray(data.zones) || data.zones.length === 0) {
      return NextResponse.json({ error: 'AI returned no zones' }, { status: 502 });
    }

    return NextResponse.json({ zones: data.zones, model, fallback });
  } catch (err) {
    console.error('[ZonesDetect] error:', err);
    const message = err instanceof Error ? err.message : 'Zone detection failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
