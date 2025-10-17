/**
 * Tournament Check-In API
 *
 * POST /api/tournaments/[id]/check-in - Check in with GPS validation
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { checkInSchema } from '@/lib/validations/tournament';

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * POST /api/tournaments/[id]/check-in
 *
 * Check in for tournament with GPS validation
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Parse and validate GPS coordinates
    const body = await request.json();
    const validated = checkInSchema.parse(body);

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournament')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    // Check participant registration
    const { data: participant, error: participantError } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return ApiResponse.error('Not registered for this tournament', 403);
    }

    // Validation: Check-in window must be open
    const now = new Date();
    const checkInOpens = tournament.check_in_opens_at
      ? new Date(tournament.check_in_opens_at)
      : null;
    const checkInCloses = tournament.check_in_closes_at
      ? new Date(tournament.check_in_closes_at)
      : null;

    if (checkInOpens && now < checkInOpens) {
      return ApiResponse.error('Check-in has not opened yet', 400);
    }

    if (checkInCloses && now > checkInCloses) {
      return ApiResponse.error('Check-in period has closed', 400);
    }

    // Validation: Not already checked in
    if (participant.status === 'checked_in') {
      return ApiResponse.error('Already checked in', 400);
    }

    // GPS Geofencing Validation
    const distance = calculateDistance(
      validated.lat,
      validated.lng,
      tournament.location_lat,
      tournament.location_lng
    );

    if (distance > tournament.geofence_radius_meters) {
      return ApiResponse.error(
        `You must be within ${tournament.geofence_radius_meters}m of the venue to check in. You are ${Math.round(distance)}m away.`,
        400
      );
    }

    // Update participant to checked_in
    const { data: updated, error: updateError } = await supabase
      .from('tournament_participant')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_lat: validated.lat,
        checked_in_lng: validated.lng,
        updated_at: new Date().toISOString(),
      })
      .eq('tournament_id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating check-in:', updateError);
      return ApiResponse.error('Failed to check in', 500);
    }

    // TODO: Send check-in confirmation notification

    return ApiResponse.success({ participant: updated }, 'Successfully checked in');
  } catch (error) {
    console.error('Check-in error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
