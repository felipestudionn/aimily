import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch ALL pins from a specific Pinterest board (handles pagination)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const accessToken = req.cookies.get('pinterest_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Pinterest', code: 'NO_TOKEN' },
      { status: 401 }
    );
  }

  try {
    const allPins: unknown[] = [];
    let bookmark: string | undefined;
    let page = 0;
    const maxPages = 10; // Safety limit

    do {
      const url = new URL(`https://api.pinterest.com/v5/boards/${boardId}/pins`);
      url.searchParams.set('page_size', '100');
      if (bookmark) url.searchParams.set('bookmark', bookmark);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorData;
        try { errorData = JSON.parse(responseText); } catch { errorData = { message: responseText }; }

        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Pinterest session expired', code: 'TOKEN_EXPIRED' },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to fetch pins', code: 'API_ERROR', details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Transform pins to simpler format
      const pins = (data.items || []).map((pin: Record<string, unknown>) => {
        const media = pin.media as Record<string, unknown> | undefined;
        const images = media?.images as Record<string, { url?: string }> | undefined;
        return {
          id: pin.id,
          title: (pin.title as string) || '',
          description: (pin.description as string) || '',
          link: (pin.link as string) || '',
          imageUrl: images?.['600x']?.url || images?.['400x300']?.url || (pin.image_cover_url as string) || null,
          dominantColor: (pin.dominant_color as string) || null,
        };
      }).filter((pin: Record<string, unknown>) => pin.imageUrl);

      allPins.push(...pins);
      bookmark = (data.bookmark as string) || undefined;
      page++;
    } while (bookmark && page < maxPages);

    return NextResponse.json({ items: allPins });
  } catch (error) {
    console.error('Error fetching Pinterest pins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pins', code: 'NETWORK_ERROR' },
      { status: 500 }
    );
  }
}
