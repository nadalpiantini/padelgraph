/**
 * Analytics Event Tracking API
 * Sprint 5 Phase 3: Client-side event tracking endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/lib/services/analytics-events';

export async function POST(request: NextRequest) {
  try {
    // Parse JSON with explicit error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { event_name, user_id, session_id, properties, page_url, referrer, device_info } = body;

    // Validate required fields
    if (!event_name || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_name, session_id' },
        { status: 400 }
      );
    }

    // Track the event
    await trackEvent({
      event_name,
      user_id: user_id || undefined,
      session_id,
      properties: properties || undefined,
      page_url: page_url || undefined,
      referrer: referrer || undefined,
      device_info: device_info || undefined,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error tracking event:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}
