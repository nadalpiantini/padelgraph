/**
 * Tournament Check-In API
 *
 * POST /api/tournaments/[id]/check-in - Check in with GPS validation
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { checkInSchema } from '@/lib/validations/tournament';
import { validateGeofence } from '@/lib/geofencing';

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
    const geofenceResult = validateGeofence(
      validated.lat,
      validated.lng,
      tournament.location_lat,
      tournament.location_lng,
      tournament.geofence_radius_meters
    );

    if (!geofenceResult.valid) {
      return ApiResponse.error(geofenceResult.message, 400);
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
