import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { supabaseAdmin } from '@/lib/supabase-admin';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// City configurations - Batch 3
const CITY_LOCATIONS = [
  { city: 'Berlin', neighborhood: 'Kreuzberg', locationQuery: 'Kreuzberg, Berlin' },
  { city: 'Seoul', neighborhood: 'Hongdae', locationQuery: 'Hongdae, Seoul' },
];

const POSTS_PER_LOCATION = 150;

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  return !!process.env.CRON_SECRET && !!authHeader && authHeader === expected;
}

function extractHashtags(caption: string): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u00C0-\u024F]+/g);
  return matches ? matches.map(h => h.toLowerCase().replace('#', '')) : [];
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: { city: string; neighborhood: string; posts: number }[] = [];
    
    for (const location of CITY_LOCATIONS) {
      try {
        
        const run = await apifyClient.actor('apify/instagram-scraper').call({
          search: location.locationQuery,
          searchType: 'place',
          resultsLimit: POSTS_PER_LOCATION,
          searchLimit: 1,
        });
        
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        let insertedCount = 0;
        
        // Instagram scraper returns locations with posts inside
        for (const locationData of items as Array<Record<string, unknown>>) {
          const posts = locationData.posts as Array<Record<string, unknown>> | undefined;
          if (!posts || !Array.isArray(posts)) continue;
          
          for (const post of posts) {
            const postId = (post.id as string) || (post.shortCode as string);
            if (!postId) continue;
            
            const caption = (post.caption as string) || '';
            const hashtags = extractHashtags(caption);
            
            const { error } = await supabaseAdmin
              .from('city_trends_raw')
              .upsert({
                platform: 'instagram',
                city: location.city,
                neighborhood: location.neighborhood,
                post_id: String(postId),
                caption,
                hashtags,
                likes: (post.likesCount as number) || 0,
                comments: (post.commentsCount as number) || 0,
                image_url: (post.displayUrl as string) || (post.url as string) || '',
                author: (post.ownerUsername as string) || '',
              }, {
                onConflict: 'platform,post_id',
              });
            
            if (!error) insertedCount++;
          }
        }
        
        results.push({
          city: location.city,
          neighborhood: location.neighborhood,
          posts: insertedCount,
        });
        
        
      } catch (error) {
        console.error(`Error scraping ${location.city}:`, error);
        results.push({ city: location.city, neighborhood: location.neighborhood, posts: 0 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Instagram Batch 3 completed (Berlin, Seoul)',
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Instagram scraping failed:', error);
    return NextResponse.json({ error: 'Scraping failed', details: String(error) }, { status: 500 });
  }
}
