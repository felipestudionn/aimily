import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch user's Pinterest boards
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
    
    const response = await fetch('https://api.pinterest.com/v5/boards', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Parse error details
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      
      // Check if token expired
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Pinterest session expired. Please reconnect.', 
            code: 'TOKEN_EXPIRED',
            details: errorData 
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch boards from Pinterest', 
          code: 'API_ERROR',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Pinterest boards:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch boards', 
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
