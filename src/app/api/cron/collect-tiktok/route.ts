import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// KEYWORD SEARCHES - Like how users search on TikTok
// Format: { query: "search term", city: "city", neighborhood: "barrio" }
const TIKTOK_SEARCHES = [
  // SHOREDITCH (London)
  { query: 'shoreditch fashion', city: 'London', neighborhood: 'Shoreditch' },
  { query: 'shoreditch street style', city: 'London', neighborhood: 'Shoreditch' },
  { query: 'shoreditch outfit', city: 'London', neighborhood: 'Shoreditch' },
  // LE MARAIS (Paris)
  { query: 'le marais fashion', city: 'Paris', neighborhood: 'Le Marais' },
  { query: 'le marais style', city: 'Paris', neighborhood: 'Le Marais' },
  { query: 'marais paris outfit', city: 'Paris', neighborhood: 'Le Marais' },
  // WILLIAMSBURG (Brooklyn/NYC)
  { query: 'williamsburg fashion', city: 'New York', neighborhood: 'Williamsburg' },
  { query: 'williamsburg brooklyn style', city: 'New York', neighborhood: 'Williamsburg' },
  { query: 'williamsburg outfit', city: 'New York', neighborhood: 'Williamsburg' },
  // HARAJUKU (Tokyo)
  { query: 'harajuku fashion', city: 'Tokyo', neighborhood: 'Harajuku' },
  { query: 'harajuku street style', city: 'Tokyo', neighborhood: 'Harajuku' },
  { query: 'harajuku outfit 2025', city: 'Tokyo', neighborhood: 'Harajuku' },
  // KREUZBERG (Berlin)
  { query: 'kreuzberg fashion', city: 'Berlin', neighborhood: 'Kreuzberg' },
  { query: 'kreuzberg berlin style', city: 'Berlin', neighborhood: 'Kreuzberg' },
  // HONGDAE (Seoul)
  { query: 'hongdae fashion', city: 'Seoul', neighborhood: 'Hongdae' },
  { query: 'hongdae street style', city: 'Seoul', neighborhood: 'Hongdae' },
];

const RESULTS_PER_SEARCH = 30;

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

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: { query: string; city: string; posts: number }[] = [];
    const currentWeek = getWeekString(new Date());
    
    for (const search of TIKTOK_SEARCHES) {
      try {
        
        // Use TikTok Keyword Search Scraper
        const run = await apifyClient.actor('sociavault/tiktok-keyword-search-scraper').call({
          query: search.query,
          max_results: RESULTS_PER_SEARCH,
          sort_by: 'relevance',
          date_posted: 'this-month', // Recent content only
        });
        
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        let insertedCount = 0;
        let totalPlays = 0;
        let totalLikes = 0;
        let totalShares = 0;
        
        for (const item of items as Array<Record<string, unknown>>) {
          const videoId = (item.id as string) || (item.video_id as string);
          if (!videoId) continue;
          
          const playCount = (item.play_count as number) || (item.playCount as number) || 0;
          const likeCount = (item.digg_count as number) || (item.diggCount as number) || (item.like_count as number) || 0;
          const shareCount = (item.share_count as number) || (item.shareCount as number) || 0;
          const commentCount = (item.comment_count as number) || (item.commentCount as number) || 0;
          const description = (item.desc as string) || (item.description as string) || (item.text as string) || '';
          const author = (item.author as { nickname?: string })?.nickname || (item.authorMeta as { name?: string })?.name || '';
          
          // Extract hashtags from description
          const hashtagMatches = description.match(/#[\w\u00C0-\u024F]+/g);
          const hashtags = hashtagMatches ? hashtagMatches.map(h => h.toLowerCase().replace('#', '')) : [];
          
          totalPlays += playCount;
          totalLikes += likeCount;
          totalShares += shareCount;
          
          const { error } = await supabaseAdmin
            .from('city_trends_raw')
            .upsert({
              platform: 'tiktok',
              city: search.city,
              neighborhood: search.neighborhood, // Store the actual neighborhood
              post_id: String(videoId),
              caption: description,
              hashtags,
              likes: likeCount,
              comments: commentCount,
              plays: playCount,
              shares: shareCount,
              author,
            }, {
              onConflict: 'platform,post_id',
            });
          
          if (!error) insertedCount++;
        }
        
        // Save search query aggregate stats
        if (insertedCount > 0) {
          await supabaseAdmin
            .from('tiktok_hashtag_trends')
            .upsert({
              hashtag: search.query, // Store the search query
              period: currentWeek,
              total_plays: totalPlays,
              total_likes: totalLikes,
              total_shares: totalShares,
              post_count: insertedCount,
              avg_engagement: insertedCount > 0 ? Math.round((totalLikes + totalShares) / insertedCount) : 0,
            }, {
              onConflict: 'hashtag,period',
            });
        }
        
        results.push({ query: search.query, city: search.city, posts: insertedCount });
        
      } catch (error) {
        console.error(`Error searching "${search.query}":`, error);
        results.push({ query: search.query, city: search.city, posts: 0 });
      }
    }
    
    const totalPosts = results.reduce((sum, r) => sum + r.posts, 0);
    
    return NextResponse.json({
      success: true,
      message: 'TikTok keyword search scraping completed',
      total: totalPosts,
      searches: results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('TikTok scraping failed:', error);
    return NextResponse.json({ error: 'Scraping failed', details: String(error) }, { status: 500 });
  }
}
