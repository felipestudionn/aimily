import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use stable Gemini 2.5 Flash for vision (supports images, video, audio)
const GEMINI_MODEL = 'models/gemini-2.5-flash';

// Max images per batch (Gemini handles up to ~16 well)
const BATCH_SIZE = 8;

interface ImageData {
  base64: string;
  mimeType: string;
}

interface AnalysisResult {
  keyColors: string[];
  keyTrends: string[];
  keyBrands: string[];
  keyItems: string[];
  keyStyles: string[];
  keyMaterials: string[];
  seasonalFit: string;
  moodDescription: string;
  targetAudience: string;
}

const ANALYSIS_PROMPT = `You are a senior fashion trend analyst and creative director working for a major fashion retailer like Zara, Mango, or COS.

TASK: Analyze these moodboard images as a professional trend report for a collection development meeting.

Look at EACH IMAGE carefully and identify:

1. **KEY COLORS** (5-7 colors)
   - Identify the ACTUAL dominant and accent colors you see in these specific images
   - Use professional fashion/Pantone-style names: "Dusty Rose", "Sage Green", "Burnt Sienna", "Ecru", "Cobalt Blue"
   - Include both neutrals and accent colors visible

2. **KEY TRENDS** (3-5 trends)
   - What current fashion movements do these images represent?
   - Reference trends from SS26 and Pre-Fall 2026 runways (shown September-November 2025)
   - Include current aesthetics: Quiet Luxury evolution, Boho Redux, Sheer layering, Romantic Minimalism, etc.
   - Be specific about silhouettes, proportions, styling approaches

3. **KEY BRANDS** (4-6 brands)
   - Which luxury, contemporary, or streetwear brands have similar aesthetics RIGHT NOW?
   - Include a mix: 1-2 luxury (The Row, Loro Piana, Bottega Veneta), 2-3 contemporary (COS, Arket, Totême, Jacquemus), 1-2 accessible (Zara, Mango, & Other Stories)
   - Only mention brands whose current collections match this moodboard aesthetic

4. **KEY ITEMS** (5-8 items)
   - List specific garments and accessories you SEE in these images
   - Be precise: "Oversized wool coat", "Pleated midi skirt", "Chunky loafers", "Structured leather tote"

5. **KEY STYLES** (2-3 styles)
   - Broader aesthetic categories: "Quiet Luxury", "Scandi Minimalism", "Parisian Chic", "Urban Streetwear", "Coastal Elegance"

6. **KEY MATERIALS** (3-5 materials)
   - Fabrics and textures visible: "Bouclé wool", "Soft leather", "Organic cotton", "Cashmere blend", "Raw denim"

7. **SEASONAL FIT**
   - Which season does this moodboard best suit? SS26, Pre-Fall 2026, Resort 2026, or FW26

8. **MOOD DESCRIPTION**
   - 2-3 sentences capturing the overall aesthetic, feeling, and lifestyle this represents

9. **TARGET AUDIENCE**
   - Demographics, psychographics, lifestyle of the ideal customer

10. **COLLECTION NAME**
   - Propose a creative, evocative name for this collection
   - Should capture the essence and mood of the moodboard
   - Examples: "Urban Nomad", "Coastal Reverie", "New Minimalism", "Quiet Elegance"

Return ONLY valid JSON with this exact structure:
{
  "collectionName": "Creative collection name",
  "keyColors": ["Color 1", "Color 2", "Color 3", "Color 4", "Color 5"],
  "keyTrends": ["Trend 1", "Trend 2", "Trend 3"],
  "keyBrands": ["Brand 1", "Brand 2", "Brand 3", "Brand 4"],
  "keyItems": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
  "keyStyles": ["Style 1", "Style 2"],
  "keyMaterials": ["Material 1", "Material 2", "Material 3"],
  "seasonalFit": "SS26 or Pre-Fall 2026 or Resort 2026 or FW26",
  "moodDescription": "Descriptive paragraph about the mood and aesthetic...",
  "targetAudience": "Description of target customer..."
}

IMPORTANT: Base your analysis on what you ACTUALLY SEE in these images, not generic fashion advice.`;

/**
 * Analyze moodboard images using Gemini Vision
 * Supports unlimited images by batching and merging results
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { images } = body as { images: ImageData[] };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    console.log(`Received ${images.length} images for analysis`);

    // Split images into batches
    const batches: ImageData[][] = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }

    console.log(`Split into ${batches.length} batches of max ${BATCH_SIZE} images`);

    // Analyze each batch
    const batchResults: AnalysisResult[] = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`Analyzing batch ${i + 1}/${batches.length}...`);
      const result = await analyzeBatch(batches[i]);
      if (result) {
        batchResults.push(result);
      }
    }

    if (batchResults.length === 0) {
      return NextResponse.json(
        { error: 'Failed to analyze any images' },
        { status: 500 }
      );
    }

    // If only one batch, return directly
    if (batchResults.length === 1) {
      return NextResponse.json(batchResults[0]);
    }

    // Merge results from multiple batches using AI
    console.log(`Merging ${batchResults.length} batch results...`);
    const mergedResult = await mergeAnalysisResults(batchResults);
    return NextResponse.json(mergedResult);

  } catch (error) {
    console.error('Moodboard analysis error', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * Analyze a single batch of images
 */
async function analyzeBatch(imageBatch: ImageData[]): Promise<AnalysisResult | null> {
  try {
    // Build parts array with images and prompt
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    
    // Add each image
    for (const img of imageBatch) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.base64
        }
      });
    }
    
    // Add the analysis prompt
    parts.push({ text: ANALYSIS_PROMPT });

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
    );
    url.searchParams.set('key', GEMINI_API_KEY!);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          // Disable thinking to get direct response
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // Log full response for debugging
    console.log('Full Gemini response:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    // Check for blocked content or other issues
    if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
      console.error('Content blocked by safety filters');
      return null;
    }
    
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('No text in response. Candidates:', JSON.stringify(data?.candidates));
      return null;
    }
    
    let textResponse = data.candidates[0].content.parts[0].text;
    
    console.log('Raw Gemini response:', textResponse.substring(0, 500));

    // Remove markdown code blocks if present (```json ... ```)
    textResponse = textResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Extract JSON from response
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = textResponse.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    }
    
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Batch analysis error:', error);
    return null;
  }
}

/**
 * Merge multiple analysis results using AI to synthesize insights
 */
async function mergeAnalysisResults(results: AnalysisResult[]): Promise<AnalysisResult> {
  // Collect all unique values from each category
  const allColors = Array.from(new Set(results.flatMap(r => r.keyColors || [])));
  const allTrends = Array.from(new Set(results.flatMap(r => r.keyTrends || [])));
  const allBrands = Array.from(new Set(results.flatMap(r => r.keyBrands || [])));
  const allItems = Array.from(new Set(results.flatMap(r => r.keyItems || [])));
  const allStyles = Array.from(new Set(results.flatMap(r => r.keyStyles || [])));
  const allMaterials = Array.from(new Set(results.flatMap(r => r.keyMaterials || [])));
  const allMoods = results.map(r => r.moodDescription).filter(Boolean);
  const allAudiences = results.map(r => r.targetAudience).filter(Boolean);
  const allSeasons = results.map(r => r.seasonalFit).filter(Boolean);

  // Use AI to synthesize the merged results
  const MERGE_PROMPT = `You are a fashion trend analyst. I have analyzed multiple batches of moodboard images and need you to synthesize the results into a cohesive analysis.

Here are the combined findings from all batches:

COLORS FOUND: ${allColors.join(', ')}
TRENDS FOUND: ${allTrends.join(', ')}
BRANDS FOUND: ${allBrands.join(', ')}
ITEMS FOUND: ${allItems.join(', ')}
STYLES FOUND: ${allStyles.join(', ')}
MATERIALS FOUND: ${allMaterials.join(', ')}
MOOD DESCRIPTIONS: ${allMoods.join(' | ')}
TARGET AUDIENCES: ${allAudiences.join(' | ')}
SEASONS: ${allSeasons.join(', ')}

Please synthesize these into a unified analysis. Select the most relevant and cohesive elements that work together as a collection direction.

Return ONLY valid JSON:
{
  "keyColors": [select 5-7 most cohesive colors],
  "keyTrends": [select 3-5 most relevant trends],
  "keyBrands": [select 4-6 most aligned brands],
  "keyItems": [select 6-8 key items],
  "keyStyles": [select 2-3 defining styles],
  "keyMaterials": [select 3-5 key materials],
  "seasonalFit": "most appropriate season",
  "moodDescription": "synthesized mood description in 2-3 sentences",
  "targetAudience": "unified target audience description"
}`;

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
    );
    url.searchParams.set('key', GEMINI_API_KEY!);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: MERGE_PROMPT }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 4096,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Remove markdown code blocks if present
      textResponse = textResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(textResponse.slice(firstBrace, lastBrace + 1));
      }
    }
  } catch (error) {
    console.error('Merge analysis error:', error);
  }

  // Fallback: return simple merged results without AI synthesis
  return {
    keyColors: allColors.slice(0, 7),
    keyTrends: allTrends.slice(0, 5),
    keyBrands: allBrands.slice(0, 6),
    keyItems: allItems.slice(0, 8),
    keyStyles: allStyles.slice(0, 3),
    keyMaterials: allMaterials.slice(0, 5),
    seasonalFit: allSeasons[0] || 'SS26',
    moodDescription: allMoods[0] || 'A cohesive collection direction based on the moodboard analysis.',
    targetAudience: allAudiences[0] || 'Style-conscious consumers seeking contemporary fashion.'
  };
}
