#!/usr/bin/env tsx
/**
 * Generate AZUR visual assets via Freepik Mystic API.
 * Downloads sketches, editorial shots, still-life renders, and moodboard images
 * for the AZUR SS27 showcase collection.
 *
 * Usage: tsx scripts/generate-azur-assets.ts
 */
import { config as dotenvConfig } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY!;
if (!FREEPIK_API_KEY) {
  console.error('FREEPIK_API_KEY missing in env');
  process.exit(1);
}

const MYSTIC_ENDPOINT = 'https://api.freepik.com/v1/ai/mystic';
const OUT_DIR = path.resolve(process.cwd(), 'public/meet-aimily/azur');

interface AssetSpec {
  filename: string;
  prompt: string;
  aspect: 'square_1_1' | 'traditional_3_4' | 'classic_4_3' | 'widescreen_16_9';
  detail: number;
}

const ASSETS: AssetSpec[] = [
  // === SKETCHES — fashion technical illustrations ===
  {
    filename: 'sketch-solene.png',
    aspect: 'square_1_1',
    detail: 30,
    prompt:
      "Hand-drawn fashion technical sketch of a women's asymmetric maxi linen dress. A-line silhouette, square neckline, deep open back with thin straps, asymmetric hem (longest 142cm, shortest 126cm). Loose A-line skirt. Clean black single-line illustration on pure white background. Designer's croquis style, like Phoebe Philo Céline-era technical drawings. Front view, full body. NO color, NO shading, NO model, NO text. Pure technical fashion sketch with measurement guides barely visible.",
  },
  {
    filename: 'sketch-amelie.png',
    aspect: 'square_1_1',
    detail: 30,
    prompt:
      'Hand-drawn fashion technical sketch of a raffia espadrille flat shoe. Side view and top view, two angles. Clean black single-line illustration on pure white background. Fashion designer croquis style. Hand-woven raffia upper texture suggested with light shading. Jute sole. Round toe. NO color, NO model, NO text. Pure footwear technical sketch.',
  },
  {
    filename: 'sketch-pauline.png',
    aspect: 'square_1_1',
    detail: 30,
    prompt:
      "Hand-drawn fashion technical sketch of high-waist linen trousers, women's. Wide-leg, pleated front, front-and-back view. Clean black single-line illustration on pure white background. Designer's technical drawing style. NO color, NO shading, NO model, NO text. Pure technical fashion sketch.",
  },
  {
    filename: 'sketch-marina.png',
    aspect: 'square_1_1',
    detail: 30,
    prompt:
      'Hand-drawn fashion technical sketch of a hand-woven raffia tote bag with leather handles. Front view and side view, showing the woven texture and leather handle attachment. Clean black single-line illustration on pure white background. Designer technical drawing style. NO color, NO model, NO text.',
  },

  // === STILL-LIFE / 3D RENDERS — product alone, editorial flatlay ===
  {
    filename: 'render-solene.png',
    aspect: 'traditional_3_4',
    detail: 75,
    prompt:
      "Editorial product photography. A women's asymmetric maxi linen dress in deep azure blue, suspended on an invisible mannequin against a bone-white architectural wall background. Soft natural light from the left. Hand-finished asymmetric hem visible. Open back and thin straps. The fabric is 100% Italian linen, 148gsm, garment-washed for a soft hand-feel. Shot like a Khaite or Toteme campaign. NO model, NO text, NO logo, NO props.",
  },
  {
    filename: 'render-amelie.png',
    aspect: 'square_1_1',
    detail: 75,
    prompt:
      'Editorial product photography of a single raffia espadrille flat shoe in natural raffia color, leather insole, jute sole. Shot from a slight 45-degree angle. Clean bone-white background with very soft shadow. Hand-woven raffia texture clearly visible. Vegetable-tanned leather insole with subtle debossed mark. Shot like a Jacquemus or Manolo Blahnik product still. NO model, NO text, NO logo of any brand.',
  },
  {
    filename: 'render-marina.png',
    aspect: 'square_1_1',
    detail: 75,
    prompt:
      'Editorial product photography of a hand-woven natural raffia tote bag with vegetable-tanned charcoal leather handles. Shot from front, slightly tilted. Clean bone-white architectural background. Soft natural light. The raffia weave is visible, the leather handles are crafted with visible stitching. Shot like a The Row or Loro Piana campaign still. NO model, NO text, NO logo.',
  },

  // === EDITORIAL — model wearing piece, on location ===
  {
    filename: 'editorial-solene-beach.png',
    aspect: 'traditional_3_4',
    detail: 85,
    prompt:
      "Editorial fashion photograph for a contemporary luxury women's resort label. A woman in her early 30s, ambiguous European features, wearing an asymmetric maxi linen dress in olive color, walking on a Mediterranean beach at golden hour. Côte d'Azur landscape — Cap Ferret atmosphere — sand dunes and pine trees in background, sea visible. The model has natural windswept hair, no makeup, salt on her skin. Full body shot, slight motion blur. Photographed like Charlotte Wales for Khaite — sun-soaked, raw, natural. Shot on ARRI Alexa film look. The face is partially turned away, never direct eye contact. NO text, NO logo, NO brand visible.",
  },
  {
    filename: 'editorial-amelie-feet.png',
    aspect: 'classic_4_3',
    detail: 85,
    prompt:
      "Editorial close-up fashion photograph of a woman's feet wearing raffia espadrille flat shoes, standing on warm terracotta tile floor. Natural light from a window left. The skin is sun-kissed, the espadrilles are natural raffia color with hand-woven texture. The composition is editorial, like a Toteme or The Row product page shot. Shows the raffia weave detail and the leather insole subtle debossed mark. NO face visible, just feet and ankles. NO text, NO logo.",
  },
  {
    filename: 'editorial-azur-lifestyle.png',
    aspect: 'traditional_3_4',
    detail: 80,
    prompt:
      "Editorial lifestyle photograph for a Mediterranean luxury women's resort label. A woman walking down a stone staircase in a whitewashed Mediterranean village (Mallorca or Saint-Tropez old town), wearing a sleeveless midi linen dress in bone color. The dress catches the light at the bottom hem. Bougainvillea flowers in the periphery. Late afternoon golden light. Like a campaign for Khaite or La DoubleJ resort line. Face partially obscured by movement. Editorial, quiet, slow. NO text, NO logo, NO brand visible.",
  },

  // === MOODBOARD — Mediterranean atmosphere references ===
  {
    filename: 'mood-1-mediterranean-wall.png',
    aspect: 'classic_4_3',
    detail: 60,
    prompt:
      "Mediterranean architectural mood photograph. A whitewashed wall in Mallorca or Cadaqués, partial shadow of a palm tree, terracotta floor tiles, raking afternoon light. Quiet, lived-in, no people. Editorial, like Apartmento or Cereal magazine atmosphere. Color palette: bone white, terracotta, soft shadow. Like a brand world reference for a contemporary luxury women's resort label. NO text, NO logo, NO branding.",
  },
  {
    filename: 'mood-2-fabric-detail.png',
    aspect: 'square_1_1',
    detail: 60,
    prompt:
      "Macro photograph of folded Italian linen fabric in olive color and raffia weave detail side by side on a bone-white surface. Soft natural light. Texture-focused. Like a luxury fashion brand's material reference. Shot like a Loro Piana or The Row close-up. NO model, NO text, NO logo.",
  },
  {
    filename: 'mood-3-sea-tile.png',
    aspect: 'classic_4_3',
    detail: 60,
    prompt:
      "Mediterranean atmosphere photograph. A turquoise-blue tiled fountain or pool surface with sun reflections, deep azure blue water. Architectural, quiet, soft afternoon light. Like a brand world reference for a contemporary luxury women's resort label. Editorial atmosphere shot. NO people, NO text, NO logo.",
  },
];

async function createAndPoll(spec: AssetSpec): Promise<{ url: string; filename: string } | null> {
  console.log(`→ Creating: ${spec.filename}`);
  const createRes = await fetch(MYSTIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY,
    },
    body: JSON.stringify({
      prompt: spec.prompt,
      aspect_ratio: spec.aspect,
      resolution: '2k',
      model: 'fluid',
      creative_detailing: spec.detail,
      engine: 'magnific_illusio',
      num_images: 1,
    }),
  });

  if (!createRes.ok) {
    const t = await createRes.text();
    console.error(`✗ ${spec.filename} create failed:`, createRes.status, t.slice(0, 200));
    return null;
  }

  const json = await createRes.json();
  const taskId = json?.data?.task_id;
  if (!taskId) {
    console.error(`✗ ${spec.filename} no task_id`);
    return null;
  }

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const sr = await fetch(`${MYSTIC_ENDPOINT}/${taskId}`, {
      headers: { 'x-freepik-api-key': FREEPIK_API_KEY },
    });
    if (!sr.ok) continue;
    const sd = await sr.json();
    const status: string | undefined = sd.data?.status;
    if (status === 'COMPLETED') {
      const url = sd.data?.generated?.[0];
      if (url) {
        console.log(`✓ ${spec.filename} done (${i * 3 + 3}s)`);
        return { url, filename: spec.filename };
      }
      return null;
    }
    if (status === 'FAILED') {
      console.error(`✗ ${spec.filename} FAILED`);
      return null;
    }
  }
  console.error(`✗ ${spec.filename} timeout (>120s)`);
  return null;
}

async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`✗ Download failed for ${filename}: ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(OUT_DIR, filename);
    await fs.writeFile(outPath, buffer);
    console.log(`💾 saved → ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (err) {
    console.error(`✗ Download error for ${filename}:`, err);
    return false;
  }
}

async function main() {
  console.log(`AZUR asset generator — ${ASSETS.length} images via Freepik Mystic`);
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Run in batches of 4 to balance throughput vs Freepik rate limit
  const BATCH = 4;
  const successful: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < ASSETS.length; i += BATCH) {
    const batch = ASSETS.slice(i, i + BATCH);
    console.log(`\n--- Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(ASSETS.length / BATCH)} (${batch.length} images)`);
    const results = await Promise.all(batch.map(createAndPoll));
    await Promise.all(
      results.map(async (r) => {
        if (!r) return;
        const ok = await downloadImage(r.url, r.filename);
        if (ok) successful.push(r.filename);
        else failed.push(r.filename);
      }),
    );
    for (const spec of batch) {
      if (!results.find((r) => r?.filename === spec.filename)) failed.push(spec.filename);
    }
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`✓ ${successful.length}/${ASSETS.length} images saved to ${OUT_DIR}`);
  if (failed.length) console.log(`✗ Failed: ${failed.join(', ')}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
