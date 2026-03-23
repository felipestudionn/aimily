import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// NEIGHBORHOOD SEARCHES - Specific fashion keywords per barrio
const NEIGHBORHOOD_SEARCHES = [
  // SHOREDITCH (London)
  { neighborhood: 'Shoreditch', city: 'London', hashtags: ['shoreditchfashion', 'shoreditchstyle', 'bricklanestyle'] },
  // LE MARAIS (Paris)
  { neighborhood: 'Le Marais', city: 'Paris', hashtags: ['lemaraisstyle', 'parisfashion', 'parisstreetfashion'] },
  // WILLIAMSBURG (Brooklyn)
  { neighborhood: 'Williamsburg', city: 'New York', hashtags: ['williamsburgfashion', 'brooklynstyle', 'brooklynfashion'] },
  // HARAJUKU (Tokyo)
  { neighborhood: 'Harajuku', city: 'Tokyo', hashtags: ['harajukufashion', 'tokyostreetstyle', 'japanesefashion'] },
  // KREUZBERG (Berlin)
  { neighborhood: 'Kreuzberg', city: 'Berlin', hashtags: ['berlinfashion', 'berlinstreetfashion', 'kreuzbergstyle'] },
  // HONGDAE (Seoul)
  { neighborhood: 'Hongdae', city: 'Seoul', hashtags: ['seoulfashion', 'koreanfashion', 'hongdaestyle'] },
];

// Posts per hashtag - optimized for budget ($9/week = ~30K posts)
const POSTS_PER_HASHTAG = 150; // 18 hashtags × 150 = 2,700 posts = ~$0.81

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!process.env.CRON_SECRET && !!authHeader && authHeader === expected;
}

function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

interface TikTokPost {
  id?: string;
  text?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  createTimeISO?: string;
  hashtags?: Array<{ name?: string }>;
  authorMeta?: { name?: string; fans?: number };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const currentWeek = getWeekString(new Date());
    const results: Array<{ neighborhood: string; hashtag: string; posts: number; topHashtags: string[] }> = [];
    
    for (const location of NEIGHBORHOOD_SEARCHES) {
      for (const hashtag of location.hashtags) {
        try {
          
          // Use clockworks TikTok scraper - reliable and includes all data we need
          const run = await apifyClient.actor('clockworks/tiktok-scraper').call({
            hashtags: [hashtag],
            resultsPerPage: POSTS_PER_HASHTAG,
          });
          
          const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
          const posts = items as TikTokPost[];
          
          // Collect all hashtags from posts to find emerging ones
          const hashtagCounts: Record<string, number> = {};
          let insertedCount = 0;
          let totalViews = 0;
          let totalLikes = 0;
          
          for (const post of posts) {
            if (!post.id) continue;
            
            const views = post.playCount || 0;
            const likes = post.diggCount || 0;
            const shares = post.shareCount || 0;
            const comments = post.commentCount || 0;
            
            totalViews += views;
            totalLikes += likes;
            
            // Count hashtags to find emerging trends
            if (post.hashtags) {
              for (const h of post.hashtags) {
                if (h.name) {
                  const name = h.name.toLowerCase();
                  hashtagCounts[name] = (hashtagCounts[name] || 0) + 1;
                }
              }
            }
            
            // Store raw post data
            const { error } = await supabaseAdmin
              .from('city_trends_raw')
              .upsert({
                platform: 'tiktok',
                city: location.city,
                neighborhood: location.neighborhood,
                post_id: String(post.id),
                caption: post.text || '',
                hashtags: post.hashtags?.map(h => h.name?.toLowerCase()).filter(Boolean) || [],
                likes,
                comments,
                plays: views,
                shares,
                author: post.authorMeta?.name || '',
                collected_at: new Date().toISOString(),
              }, {
                onConflict: 'platform,post_id',
              });
            
            if (!error) insertedCount++;
          }
          
          // Get top 10 hashtags (excluding the search hashtag)
          const topHashtags = Object.entries(hashtagCounts)
            .filter(([name]) => name !== hashtag.toLowerCase())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name]) => name);
          
          // Store hashtag trend data
          await supabaseAdmin
            .from('tiktok_hashtag_trends')
            .upsert({
              hashtag,
              period: currentWeek,
              neighborhood: location.neighborhood,
              city: location.city,
              total_plays: totalViews,
              total_likes: totalLikes,
              post_count: insertedCount,
              avg_engagement: insertedCount > 0 ? Math.round(totalLikes / insertedCount) : 0,
              top_related_hashtags: topHashtags,
            }, {
              onConflict: 'hashtag,period',
            });
          
          results.push({
            neighborhood: location.neighborhood,
            hashtag,
            posts: insertedCount,
            topHashtags: topHashtags.slice(0, 5),
          });
          
          
        } catch (error) {
          console.error(`❌ Error scraping #${hashtag}:`, error);
          results.push({ neighborhood: location.neighborhood, hashtag, posts: 0, topHashtags: [] });
        }
      }
    }
    
    const totalPosts = results.reduce((sum, r) => sum + r.posts, 0);
    const estimatedCost = (totalPosts / 1000) * 0.30;
    
    
    return NextResponse.json({
      success: true,
      message: 'TikTok neighborhood trends collected',
      period: currentWeek,
      totalPosts,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('TikTok collection failed:', error);
    return NextResponse.json({ error: 'Collection failed', details: String(error) }, { status: 500 });
  }
}
