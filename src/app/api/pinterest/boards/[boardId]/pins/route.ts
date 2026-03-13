import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch pins from a specific Pinterest board
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
    console.log('Fetching pins for board:', boardId);
    
    // Pinterest API v5 endpoint for board pins
    const response = await fetch(
      `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const responseText = await response.text();
    console.log('Pinterest pins response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
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

    const data = JSON.parse(responseText);
    
    // Transform pins to a simpler format with image URLs
    const pins = (data.items || []).map((pin: any) => ({
      id: pin.id,
      title: pin.title || '',
      description: pin.description || '',
      link: pin.link || '',
      // Get the best available image — prefer originals for correct aspect ratio
      imageUrl: pin.media?.images?.originals?.url
        || pin.media?.images?.['600x']?.url
        || pin.media?.images?.['400x300']?.url
        || pin.image_cover_url
        || null,
      dominantColor: pin.dominant_color || null,
    })).filter((pin: any) => pin.imageUrl); // Only return pins with images

    console.log('Fetched', pins.length, 'pins with images');
    
    return NextResponse.json({ 
      items: pins,
      bookmark: data.bookmark // For pagination if needed
    });
  } catch (error) {
    console.error('Error fetching Pinterest pins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pins', code: 'NETWORK_ERROR' },
      { status: 500 }
    );
  }
}
