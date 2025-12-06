import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { screenshot, pageUrl, pageTitle, selectedText, timestamp } = body;
    
    // Validate required fields
    if (!screenshot || !pageUrl || !pageTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: screenshot, pageUrl, or pageTitle' },
        { status: 400 }
      );
    }
    
    // Validate screenshot is a data URL
    if (!screenshot.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid screenshot format. Expected data URL.' },
        { status: 400 }
      );
    }
    
    // Log the received screenshot info
    console.log('📸 Screenshot received:', {
      pageTitle,
      pageUrl,
      hasSelectedText: !!selectedText,
      timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
      screenshotSize: screenshot.length,
    });
    
    // Store in memory or database (for now, we'll just acknowledge receipt)
    // In a real app, you might want to:
    // 1. Store in a database with user session
    // 2. Process the image (compress, analyze, etc.)
    // 3. Associate with a conversation thread
    
    const response = {
      success: true,
      message: 'Screenshot received successfully',
      data: {
        pageTitle,
        pageUrl,
        selectedText,
        timestamp: timestamp || Date.now(),
        screenshotSize: screenshot.length,
      }
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('Error processing screenshot:', error);
    return NextResponse.json(
      { error: 'Failed to process screenshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve recent screenshots
export async function GET(request: NextRequest) {
  // This could return recent screenshots from a database
  // For now, just return a simple response
  return NextResponse.json({
    message: 'Screenshot API endpoint',
    methods: ['POST'],
    postBody: {
      screenshot: 'data:image/png;base64,...',
      pageUrl: 'https://example.com',
      pageTitle: 'Page Title',
      selectedText: 'Optional selected text',
      timestamp: 'Unix timestamp'
    }
  });
}
