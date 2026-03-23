import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedUser } from '@/lib/api-auth';

// Get current week string
function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const currentWeek = getWeekString(new Date());

    // Get processed trends by city
    const { data: processedTrends, error: processedError } = await supabaseAdmin
      .from('city_trends_processed')
      .select('*')
      .eq('period', currentWeek)
      .order('city')
      .order('trend_type')
      .order('rank');

    // Get raw data stats by city (for when processed data isn't available yet)
    const { data: rawStats, error: rawError } = await supabaseAdmin
      .from('city_trends_raw')
      .select('city, neighborhood, platform, hashtags, likes, comments')
      .gte('collected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get TikTok hashtag trends
    const { data: tiktokTrends, error: tiktokError } = await supabaseAdmin
      .from('tiktok_hashtag_trends')
      .select('*')
      .eq('period', currentWeek)
      .order('total_plays', { ascending: false });

    if (processedError || rawError || tiktokError) {
      console.error('Error fetching city trends:', { processedError, rawError, tiktokError });
    }

    // If we have processed data, use it
    if (processedTrends && processedTrends.length > 0) {
      // Group by neighborhood (not city) for more granular data
      const neighborhoodsMap: Record<string, {
        city: string;
        neighborhood: string;
        garments: Array<{ name: string; mentions: number; isNew: boolean; rank: number }>;
        styles: Array<{ name: string; mentions: number; isNew: boolean }>;
        brands: Array<{ name: string; mentions: number; type: string }>;
        localSpots: Array<{ name: string; mentions: number }>;
        microTrends: Array<{ name: string; description: string; confidence: number }>;
      }> = {};

      for (const trend of processedTrends) {
        const key = trend.neighborhood || trend.city;
        if (!neighborhoodsMap[key]) {
          neighborhoodsMap[key] = {
            city: trend.city,
            neighborhood: trend.neighborhood || trend.city,
            garments: [],
            styles: [],
            brands: [],
            localSpots: [],
            microTrends: [],
          };
        }

        const metadata = trend.metadata || {};

        if (trend.trend_type === 'garment') {
          neighborhoodsMap[key].garments.push({
            name: trend.trend_name,
            mentions: trend.mentions,
            isNew: trend.is_new || false,
            rank: trend.rank,
          });
        } else if (trend.trend_type === 'style') {
          neighborhoodsMap[key].styles.push({
            name: trend.trend_name,
            mentions: trend.mentions,
            isNew: trend.is_new || false,
          });
        } else if (trend.trend_type === 'brand') {
          neighborhoodsMap[key].brands.push({
            name: trend.trend_name,
            mentions: trend.mentions,
            type: metadata.brand_type || 'unknown',
          });
        } else if (trend.trend_type === 'local_spot') {
          neighborhoodsMap[key].localSpots.push({
            name: trend.trend_name,
            mentions: trend.mentions,
          });
        } else if (trend.trend_type === 'micro_trend') {
          neighborhoodsMap[key].microTrends.push({
            name: trend.trend_name,
            description: metadata.description || '',
            confidence: metadata.confidence || trend.mentions,
          });
        }
      }

      return NextResponse.json({
        neighborhoods: Object.values(neighborhoodsMap),
        tiktokTrends: tiktokTrends || [],
        period: currentWeek,
        hasProcessedData: true,
      });
    }

    // Fallback: aggregate raw data if no processed data
    if (rawStats && rawStats.length > 0) {
      const cityStats: Record<string, {
        city: string;
        neighborhood: string;
        postCount: number;
        totalEngagement: number;
        topHashtags: Record<string, number>;
      }> = {};

      for (const post of rawStats) {
        if (post.city === 'Global') continue; // Skip TikTok global posts

        if (!cityStats[post.city]) {
          cityStats[post.city] = {
            city: post.city,
            neighborhood: post.neighborhood || '',
            postCount: 0,
            totalEngagement: 0,
            topHashtags: {},
          };
        }

        cityStats[post.city].postCount++;
        cityStats[post.city].totalEngagement += (post.likes || 0) + (post.comments || 0);

        // Count hashtags
        if (post.hashtags) {
          for (const tag of post.hashtags) {
            cityStats[post.city].topHashtags[tag] = (cityStats[post.city].topHashtags[tag] || 0) + 1;
          }
        }
      }

      // Convert to response format
      const cities = Object.values(cityStats).map(city => ({
        city: city.city,
        neighborhood: city.neighborhood,
        postCount: city.postCount,
        avgEngagement: city.postCount > 0 ? Math.round(city.totalEngagement / city.postCount) : 0,
        topHashtags: Object.entries(city.topHashtags)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count })),
      }));

      return NextResponse.json({
        cities,
        tiktokTrends: tiktokTrends || [],
        period: currentWeek,
        hasProcessedData: false,
        message: 'Raw data aggregated. Run process-city-trends for full analysis.',
      });
    }

    // No data at all
    return NextResponse.json({
      cities: [],
      tiktokTrends: [],
      period: currentWeek,
      hasProcessedData: false,
      message: 'No data available. Run collect-city-trends first.',
    });

  } catch (error) {
    console.error('Error in city trends API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
