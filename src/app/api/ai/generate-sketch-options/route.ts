import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { persistAsset } from '@/lib/storage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface RequestBody {
  images: Array<{
    base64: string;
    mimeType: string;
    instructions: string;
  }>;
  garmentType: string;
  season: string;
  styleName: string;
  fabric: string;
  additionalNotes: string;
}

// Build the sketch prompt — based on the user's proven GPT system prompt
function buildSketchPrompt(garmentType: string, fabric: string, additionalNotes: string): string {
  return `A partir de esta foto de referencia, genera un FLAT SKETCH TÉCNICO de la prenda.

REGLAS DEL DIBUJO:
- Flat sketch técnico para ficha técnica / tech pack
- Vista frontal
- Fondo blanco puro
- Trazo negro fino, limpio y uniforme
- Sin cuerpo humano, sin perspectiva, sin sombras, sin color, sin texturas
- Proporciones realistas de patronaje
- Todos los detalles constructivos visibles: cierres, bolsillos, costuras, paneles, pinzas, tapetas, vistas
- No reinterpretar ni inventar detalles — reproducir fielmente lo que se ve en la foto
- Nivel de detalle apto para fábrica

Piensa como un patronista, no como un ilustrador.

TIPO DE PRENDA: ${garmentType}
${fabric ? `TEJIDO: ${fabric}` : ''}
${additionalNotes ? `NOTAS: ${additionalNotes}` : ''}`;
}

// Generate fashion flat using OpenAI gpt-image-1 (Images edits endpoint)
async function generateSketchWithOpenAI(
  prompt: string,
  photoBase64: string,
  photoMimeType: string
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  // Convert base64 to a File for multipart upload
  const imageBuffer = Buffer.from(photoBase64, 'base64');
  const extension = photoMimeType.includes('png') ? 'png' : 'png';
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', blob, `photo.${extension}`);
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('quality', 'high');

  console.log('Generating sketch with OpenAI gpt-image-1...');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Response can include b64_json or url
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    // Fetch the URL and convert to data URI
    const imgRes = await fetch(data.data[0].url);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  }

  throw new Error('No image in OpenAI response');
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const usage = await checkAIUsage(user.id, user.email!);
    if (!usage.allowed) return usageDeniedResponse(usage);

    const body: RequestBody & { collectionPlanId?: string } = await req.json();

    // Validation
    if (!body.images || body.images.length === 0) {
      return NextResponse.json(
        { error: 'Se necesita al menos 1 foto de referencia' },
        { status: 400 }
      );
    }
    if (!body.garmentType) {
      return NextResponse.json(
        { error: 'El tipo de prenda es obligatorio' },
        { status: 400 }
      );
    }

    const primaryPhoto = body.images[0];
    const prompt = buildSketchPrompt(body.garmentType, body.fabric, body.additionalNotes);

    console.log('Generating fashion flat with OpenAI...');
    const sketchImage = await generateSketchWithOpenAI(
      prompt,
      primaryPhoto.base64,
      primaryPhoto.mimeType
    );
    console.log('Sketch generated successfully');

    // Auto-persist to Supabase Storage if collectionPlanId provided
    let persistedUrl: string | null = null;
    let assetId: string | null = null;
    if (body.collectionPlanId) {
      try {
        const result = await persistAsset({
          collectionPlanId: body.collectionPlanId,
          assetType: 'sketch',
          name: `Sketch — ${body.garmentType}`,
          base64: sketchImage,
          mimeType: 'image/png',
          phase: 'design',
          metadata: { garmentType: body.garmentType, fabric: body.fabric },
          uploadedBy: user.id,
        });
        persistedUrl = result.publicUrl;
        assetId = result.assetId;
      } catch (err) {
        console.error('[Sketch] Persist failed:', err);
      }
    }

    return NextResponse.json({
      sketchOptions: [{
        id: '1',
        description: `Fiel al original: ${body.garmentType}`,
        frontImageBase64: sketchImage,
        ...(persistedUrl && { url: persistedUrl, assetId }),
      }],
      persisted: !!persistedUrl,
    });
  } catch (error) {
    console.error('Sketch generation error:', error);
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
