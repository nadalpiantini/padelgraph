/**
 * Discovery Feed API endpoint
 * GET /api/discover/feed - Get location-based discovery feed
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { feedQuerySchema } from '@/lib/validations/discovery';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      location: searchParams.get('location'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radius_km: searchParams.get('radius_km'),
      event_type: searchParams.get('event_type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = feedQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { location, lat, lng, radius_km, event_type, limit, offset } = validation.data;

    let centerLocation;

    // Determine center location
    if (location === 'auto') {
      // Get user's current location from profile
      const { data: profile } = await supabase
        .from('user_profile')
        .select('location')
        .eq('id', user.id)
        .single();

      if (!profile?.location) {
        return errorResponse(
          'User location not set. Please provide lat/lng or set your profile location.',
          undefined,
          400
        );
      }

      centerLocation = profile.location;
    } else {
      // Use custom location
      centerLocation = `POINT(${lng} ${lat})`;
    }

    // Build query for discovery events
    let query = supabase
      .from('discovery_event')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply event type filter
    if (event_type !== 'all') {
      query = query.eq('event_type', event_type);
    }

    // Apply visibility filter based on user's privacy settings
    // For now, only show public events (can be enhanced with friends/clubs filtering)
    query = query.eq('visibility', 'public');

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: events, error: eventsError, count } = await query;

    if (eventsError) {
      console.error('[Discovery Feed API] Error fetching events:', eventsError);
      return serverErrorResponse('Failed to fetch discovery feed', eventsError);
    }

    // Calculate distance for each event (if they have location)
    const eventsWithDistance = await Promise.all(
      (events || []).map(async (event) => {
        if (event.location) {
          const { data: distance } = await supabase.rpc('calculate_distance_km', {
            point1: centerLocation,
            point2: event.location,
          });

          return {
            ...event,
            distance_km: distance ? Math.round(distance * 10) / 10 : null,
          };
        }
        return event;
      })
    );

    // Filter by radius and sort by distance
    const filteredEvents = eventsWithDistance
      .filter((e) => !e.distance_km || e.distance_km <= radius_km)
      .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

    return successResponse({
      events: filteredEvents,
      total: count || 0,
      radius_km,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Discovery Feed API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
