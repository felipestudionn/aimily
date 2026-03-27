import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch ALL of the user's Pinterest boards (handles pagination)
 */
export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get('pinterest_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated with Pinterest', code: 'NO_TOKEN' },
      { status: 401 }
    );
  }

  try {
    const allItems: unknown[] = [];
    let bookmark: string | undefined;
    let page = 0;
    const maxPages = 10; // Safety limit

    // Paginate through all boards
    do {
      const url = new URL('https://api.pinterest.com/v5/boards');
      url.searchParams.set('page_size', '100'); // Max per page
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
            { error: 'Pinterest session expired. Please reconnect.', code: 'TOKEN_EXPIRED', details: errorData },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to fetch boards from Pinterest', code: 'API_ERROR', details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();
      if (data.items) allItems.push(...data.items);
      bookmark = data.bookmark || undefined;
      page++;
    } while (bookmark && page < maxPages);

    // Return in same format, sorted by most recent first
    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error('Error fetching Pinterest boards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boards', code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
