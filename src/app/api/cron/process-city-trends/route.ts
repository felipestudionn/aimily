import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractJSON } from '@/lib/ai/llm-client';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get week string
function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Auth check
function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!process.env.CRON_SECRET && !!authHeader && authHeader === expected;
}

interface TrendExtraction {
  garments: Array<{ name: string; mentions: number; emerging: boolean }>;
  styles: Array<{ name: string; mentions: number; emerging: boolean }>;
  colors: Array<{ name: string; mentions: number }>;
  brands: Array<{ name: string; mentions: number; type: string }>;
  local_spots: Array<{ name: string; mentions: number }>;
  micro_trends: Array<{ name: string; description: string; confidence: number }>;
}

// Use Gemini to extract trends from TikTok captions
async function extractTrendsWithAI(captions: string[], neighborhood: string, city: string): Promise<TrendExtraction> {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
  
  const prompt = `You are a fashion trend analyst. Analyze these TikTok captions from ${neighborhood}, ${city} and extract REAL fashion intelligence.

CAPTIONS FROM ${neighborhood.toUpperCase()}:
${captions.slice(0, 150).join('\n---\n')}

Your task: Find the SPECIFIC, ACTIONABLE fashion trends. Not generic things like "fashion" or "style" - we need REAL items people are wearing.

Extract:

1. GARMENTS: Specific clothing pieces mentioned or shown
   - Be SPECIFIC: "barrel jeans" not "jeans", "cropped leather jacket" not "jacket"
   - Include: shoes, bags, accessories, specific cuts/styles
   - Mark as "emerging: true" if it seems new/unusual

2. STYLES/AESTHETICS: Fashion movements or looks
   - Examples: "gorpcore", "quiet luxury", "coquette", "old money", "y2k revival"
   - Mark as "emerging: true" if it's not mainstream yet

3. COLORS: Specific color trends
   - Be specific: "butter yellow" not "yellow", "chocolate brown" not "brown"

4. BRANDS: Fashion brands mentioned (with @ or directly)
   - Include type: "luxury", "streetwear", "vintage", "fast-fashion", "emerging-designer"

5. LOCAL_SPOTS: Shops, markets, or locations mentioned in ${neighborhood}
   - These are valuable for understanding WHERE trends come from

6. MICRO_TRENDS: Identify 2-3 emerging micro-trends you see forming
   - These are the "brotes verdes" - early signals of what's coming
   - Include confidence score 0-100

Return ONLY valid JSON:
{
  "garments": [{"name": "barrel jeans", "mentions": 8, "emerging": true}],
  "styles": [{"name": "quiet luxury", "mentions": 5, "emerging": false}],
  "colors": [{"name": "burgundy", "mentions": 4}],
  "brands": [{"name": "Avirex", "mentions": 3, "type": "streetwear"}],
  "local_spots": [{"name": "Brick Lane Market", "mentions": 6}],
  "micro_trends": [{"name": "vintage bomber revival", "description": "People pairing vintage bombers with modern tailored pants", "confidence": 75}]
}

Be analytical. Find patterns. Identify what's UNIQUE to ${neighborhood}.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return extractJSON(text);
  } catch (error) {
    console.error(`Error extracting trends for ${neighborhood}:`, error);
  }
  
  return { garments: [], styles: [], colors: [], brands: [], local_spots: [], micro_trends: [] };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const currentWeek = getWeekString(new Date());
    const previousWeek = getWeekString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    // Get TikTok data from the last 7 days grouped by neighborhood
    const { data: rawData, error } = await supabaseAdmin
      .from('city_trends_raw')
      .select('city, neighborhood, caption, hashtags, likes, plays, shares')
      .eq('platform', 'tiktok')
      .gte('collected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error || !rawData) {
      console.error('Error fetching raw data:', error);
      return NextResponse.json({ error: 'Failed to fetch raw data' }, { status: 500 });
    }
    
    
    // Group by neighborhood (not city)
    const neighborhoodData: Record<string, { 
      city: string; 
      captions: string[]; 
      totalViews: number;
      totalLikes: number;
    }> = {};
    
    for (const post of rawData) {
      const key = post.neighborhood || post.city;
      if (!neighborhoodData[key]) {
        neighborhoodData[key] = {
          city: post.city,
          captions: [],
          totalViews: 0,
          totalLikes: 0,
        };
      }
      if (post.caption && post.caption.length > 10) {
        neighborhoodData[key].captions.push(post.caption);
      }
      neighborhoodData[key].totalViews += (post.plays || 0);
      neighborhoodData[key].totalLikes += (post.likes || 0);
    }
    
    // Get previous week's data for comparison
    const { data: prevData } = await supabaseAdmin
      .from('city_trends_processed')
      .select('neighborhood, trend_type, trend_name, mentions')
      .eq('period', previousWeek);
    
    const prevTrends: Record<string, number> = {};
    if (prevData) {
      for (const t of prevData) {
        prevTrends[`${t.neighborhood}:${t.trend_type}:${t.trend_name}`] = t.mentions;
      }
    }
    
    // Process each neighborhood with AI
    const results: Record<string, { trends: number; microTrends: string[] }> = {};
    
    for (const [neighborhood, data] of Object.entries(neighborhoodData)) {
      if (data.captions.length < 20) {
        continue;
      }
      
      
      const trends = await extractTrendsWithAI(data.captions, neighborhood, data.city);
      const avgEngagement = data.captions.length > 0 ? data.totalLikes / data.captions.length : 0;
      
      let insertedCount = 0;
      
      // Insert garments
      for (let i = 0; i < trends.garments.length && i < 15; i++) {
        const garment = trends.garments[i];
        const prevKey = `${neighborhood}:garment:${garment.name}`;
        const prevMentions = prevTrends[prevKey];
        const changePercent = prevMentions ? ((garment.mentions - prevMentions) / prevMentions) * 100 : null;
        
        await supabaseAdmin.from('city_trends_processed').upsert({
          city: data.city,
          neighborhood,
          period: currentWeek,
          trend_type: 'garment',
          trend_name: garment.name,
          mentions: garment.mentions,
          avg_engagement: avgEngagement,
          change_percent: changePercent,
          is_new: garment.emerging || !prevMentions,
          rank: i + 1,
          source_platform: 'tiktok',
        }, { onConflict: 'city,period,trend_type,trend_name' });
        insertedCount++;
      }
      
      // Insert styles
      for (let i = 0; i < trends.styles.length && i < 10; i++) {
        const style = trends.styles[i];
        const prevKey = `${neighborhood}:style:${style.name}`;
        const prevMentions = prevTrends[prevKey];
        const changePercent = prevMentions ? ((style.mentions - prevMentions) / prevMentions) * 100 : null;
        
        await supabaseAdmin.from('city_trends_processed').upsert({
          city: data.city,
          neighborhood,
          period: currentWeek,
          trend_type: 'style',
          trend_name: style.name,
          mentions: style.mentions,
          avg_engagement: avgEngagement,
          change_percent: changePercent,
          is_new: style.emerging || !prevMentions,
          rank: i + 1,
          source_platform: 'tiktok',
        }, { onConflict: 'city,period,trend_type,trend_name' });
        insertedCount++;
      }
      
      // Insert brands
      for (let i = 0; i < trends.brands.length && i < 10; i++) {
        const brand = trends.brands[i];
        
        await supabaseAdmin.from('city_trends_processed').upsert({
          city: data.city,
          neighborhood,
          period: currentWeek,
          trend_type: 'brand',
          trend_name: brand.name,
          mentions: brand.mentions,
          avg_engagement: avgEngagement,
          change_percent: null,
          is_new: brand.type === 'emerging-designer',
          rank: i + 1,
          source_platform: 'tiktok',
          metadata: { brand_type: brand.type },
        }, { onConflict: 'city,period,trend_type,trend_name' });
        insertedCount++;
      }
      
      // Insert local spots
      for (let i = 0; i < trends.local_spots.length && i < 5; i++) {
        const spot = trends.local_spots[i];
        
        await supabaseAdmin.from('city_trends_processed').upsert({
          city: data.city,
          neighborhood,
          period: currentWeek,
          trend_type: 'local_spot',
          trend_name: spot.name,
          mentions: spot.mentions,
          avg_engagement: avgEngagement,
          change_percent: null,
          is_new: false,
          rank: i + 1,
          source_platform: 'tiktok',
        }, { onConflict: 'city,period,trend_type,trend_name' });
        insertedCount++;
      }
      
      // Insert micro-trends (the gold!)
      const microTrendNames: string[] = [];
      for (let i = 0; i < trends.micro_trends.length && i < 5; i++) {
        const mt = trends.micro_trends[i];
        microTrendNames.push(mt.name);
        
        await supabaseAdmin.from('city_trends_processed').upsert({
          city: data.city,
          neighborhood,
          period: currentWeek,
          trend_type: 'micro_trend',
          trend_name: mt.name,
          mentions: mt.confidence, // Use confidence as "strength"
          avg_engagement: avgEngagement,
          change_percent: null,
          is_new: true,
          rank: i + 1,
          source_platform: 'tiktok',
          metadata: { description: mt.description, confidence: mt.confidence },
        }, { onConflict: 'city,period,trend_type,trend_name' });
        insertedCount++;
      }
      
      results[neighborhood] = { trends: insertedCount, microTrends: microTrendNames };
      if (microTrendNames.length > 0) {
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'TikTok trends processed with Gemini AI',
      period: currentWeek,
      totalNeighborhoods: Object.keys(results).length,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error processing city trends:', error);
    return NextResponse.json({ error: 'Processing failed', details: String(error) }, { status: 500 });
  }
}
