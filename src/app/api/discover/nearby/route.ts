/**
 * Discovery Nearby API endpoint
 * GET /api/discover/nearby - Find nearby players, clubs, or matches
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { nearbyQuerySchema } from '@/lib/validations/discovery';

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
      type: searchParams.get('type'),
      radius_km: searchParams.get('radius_km'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      level: searchParams.get('level'),
      min_rating: searchParams.get('min_rating'),
      availability: searchParams.get('availability'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = nearbyQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { type, radius_km, lat, lng, level, min_rating, limit, offset } =
      validation.data;

    // Create PostGIS GEOGRAPHY point from lat/lng
    const centerLocation = `POINT(${lng} ${lat})`;

    const results: {
      players?: unknown[];
      clubs?: unknown[];
      matches?: unknown[];
    } = {};

    // Find nearby players if requested
    if (type === 'players' || type === 'all') {
      const { data: nearbyPlayers, error: playersError } = await supabase.rpc('get_nearby_users', {
        center_location: centerLocation,
        radius_km,
        privacy_level: 'public',
      });

      if (playersError) {
        console.error('[Discovery Nearby API] Error finding players:', playersError);
      } else {
        // Apply additional filters
        let filteredPlayers = nearbyPlayers || [];

        if (level) {
          filteredPlayers = filteredPlayers.filter((p: { level?: string }) => p.level === level);
        }

        if (min_rating) {
          filteredPlayers = filteredPlayers.filter(
            (p: { rating?: number }) => (p.rating || 0) >= min_rating
          );
        }

        results.players = filteredPlayers.slice(offset, offset + limit);
      }
    }

    // Find nearby clubs if requested
    if (type === 'clubs' || type === 'all') {
      const { data: nearbyClubs, error: clubsError } = await supabase.rpc('get_nearby_clubs', {
        center_location: centerLocation,
        radius_km,
      });

      if (clubsError) {
        console.error('[Discovery Nearby API] Error finding clubs:', clubsError);
      } else {
        results.clubs = (nearbyClubs || []).slice(offset, offset + limit);
      }
    }

    // Find nearby matches if requested
    if (type === 'matches' || type === 'all') {
      // For matches, we'll query bookings that are upcoming and public
      // This is a simplified version - may need to be enhanced based on actual match schema
      const now = new Date().toISOString();
      const { data: upcomingMatches, error: matchesError } = await supabase
        .from('booking')
        .select(
          `
          *,
          court:court!inner(
            id,
            name,
            location,
            club:organization(id, name)
          )
        `
        )
        .gte('start_at', now)
        .eq('status', 'confirmed')
        .limit(limit);

      if (matchesError) {
        console.error('[Discovery Nearby API] Error finding matches:', matchesError);
      } else {
        // Filter matches by distance (manual filtering since we can't use PostGIS on nested fields)
        // This is a placeholder - ideally matches would have their own location field
        results.matches = upcomingMatches || [];
      }
    }

    return successResponse({
      center: { lat, lng },
      radius_km,
      results,
      total_results:
        (results.players?.length || 0) +
        (results.clubs?.length || 0) +
        (results.matches?.length || 0),
    });
  } catch (error) {
    console.error('[Discovery Nearby API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
