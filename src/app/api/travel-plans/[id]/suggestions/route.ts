/**
 * Travel Plan Suggestions API endpoint
 * GET /api/travel-plans/[id]/suggestions - Get suggestions for travel plan destination
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { suggestionsQuerySchema } from '@/lib/validations/travel-plan';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
      radius_km: searchParams.get('radius_km'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
    };

    const validation = suggestionsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { radius_km, type, limit } = validation.data;

    // Fetch travel plan to get destination location
    const { data: plan, error: planError } = await supabase
      .from('travel_plan')
      .select('location, destination_city, start_date, end_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (planError || !plan) {
      console.error('[Travel Plan Suggestions API] Error fetching plan:', planError);
      return notFoundResponse('Travel plan');
    }

    if (!plan.location) {
      return errorResponse('Travel plan does not have a location set', undefined, 400);
    }

    const suggestions: {
      clubs?: unknown[];
      tournaments?: unknown[];
      players?: unknown[];
    } = {};

    // Get nearby clubs if requested
    if (type === 'clubs' || type === 'all') {
      const { data: nearbyClubs } = await supabase.rpc('get_nearby_clubs', {
        center_location: plan.location,
        radius_km,
      });

      suggestions.clubs = nearbyClubs?.slice(0, limit) || [];
    }

    // Get nearby players if requested
    if (type === 'players' || type === 'all') {
      const { data: nearbyPlayers } = await supabase.rpc('get_nearby_users', {
        center_location: plan.location,
        radius_km,
        privacy_level: 'public', // Only show users with public location
      });

      suggestions.players = nearbyPlayers?.slice(0, limit) || [];
    }

    // Get tournaments in destination city if requested
    if (type === 'tournaments' || type === 'all') {
      // Query tournaments that overlap with travel dates and are in the destination
      // Note: This assumes tournaments have a location field (may need adjustment)
      const { data: tournaments } = await supabase
        .from('tournament')
        .select('*, club:club(id, name, city)')
        .gte('start_date', plan.start_date)
        .lte('start_date', plan.end_date)
        .eq('status', 'published')
        .limit(limit);

      // Filter tournaments by city match (rough approximation)
      const filteredTournaments = tournaments?.filter(
        (t) =>
          t.club?.city?.toLowerCase().includes(plan.destination_city.toLowerCase()) ||
          plan.destination_city.toLowerCase().includes(t.club?.city?.toLowerCase() || '')
      );

      suggestions.tournaments = filteredTournaments || [];
    }

    return successResponse({
      travel_plan_id: id,
      destination: plan.destination_city,
      radius_km,
      suggestions,
      total_results:
        (suggestions.clubs?.length || 0) +
        (suggestions.tournaments?.length || 0) +
        (suggestions.players?.length || 0),
    });
  } catch (error) {
    console.error('[Travel Plan Suggestions API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
