/**
 * Fair-Play Incidents API - Tournament Scope
 *
 * POST /api/tournaments/[id]/fair-play - Issue fair-play incident
 * GET /api/tournaments/[id]/fair-play - List all incidents for tournament
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import type { 
  CreateFairPlayIncidentRequest,
  TournamentFairPlayWithProfile 
} from '@/types/database';

/**
 * POST - Issue Fair-Play Incident
 * 
 * Creates a new fair-play incident and automatically updates standings.
 * The database trigger handles:
 * - Updating fair_play_points in tournament_standing
 * - Incrementing yellow_cards or red_cards count
 * - Adding conduct_bonus for positive conduct
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const tournamentId = (await params).id;

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        ApiResponse.error('No autorizado', 401),
        { status: 401 }
      );
    }

    // Verify tournament exists and user is admin
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournament')
      .select(`
        *,
        org_member!inner(role)
      `)
      .eq('id', tournamentId)
      .eq('org_member.user_id', user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        ApiResponse.error('Torneo no encontrado', 404),
        { status: 404 }
      );
    }

    // Verify user is admin or owner
    if (!['admin', 'owner'].includes(tournament.org_member.role)) {
      return NextResponse.json(
        ApiResponse.error('No autorizado - solo admins', 403),
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateFairPlayIncidentRequest = await request.json();

    // Validate required fields
    if (!body.user_id || !body.incident_type || !body.severity) {
      return NextResponse.json(
        ApiResponse.error('user_id, incident_type y severity son requeridos', 400),
        { status: 400 }
      );
    }

    // Verify target user is participant
    const { data: participant, error: participantError } = await supabase
      .from('tournament_participant')
      .select('user_id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', body.user_id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        ApiResponse.error('Usuario no es participante del torneo', 400),
        { status: 400 }
      );
    }

    // Calculate penalty/bonus points based on incident type and severity
    let penalty_points = 0;
    let bonus_points = 0;

    if (body.incident_type === 'positive_conduct') {
      // Positive conduct = bonus points
      bonus_points = body.bonus_points || body.severity;
    } else {
      // Negative incidents = penalty points
      penalty_points = body.penalty_points || body.severity * 2;
    }

    // Create fair-play incident
    const { data: incident, error: insertError } = await supabase
      .from('tournament_fair_play')
      .insert({
        tournament_id: tournamentId,
        user_id: body.user_id,
        match_id: body.match_id || null,
        incident_type: body.incident_type,
        description: body.description || null,
        severity: body.severity,
        penalty_points,
        bonus_points,
        issued_by: user.id,
      })
      .select(`
        *,
        user_profile:user_id (name, avatar_url),
        issuer_profile:issued_by (name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating incident:', insertError);
      return NextResponse.json(
        ApiResponse.error('Error al crear incidente', 500),
        { status: 500 }
      );
    }

    // Note: Standing update happens automatically via database trigger

    return NextResponse.json(
      ApiResponse.success(incident, 'Incidente registrado exitosamente'),
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in POST /api/tournaments/[id]/fair-play:', error);
    return NextResponse.json(
      ApiResponse.error('Error interno del servidor', 500),
      { status: 500 }
    );
  }
}

/**
 * GET - List Fair-Play Incidents
 * 
 * Returns all fair-play incidents for the tournament with user profiles.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const tournamentId = (await params).id;

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        ApiResponse.error('No autorizado', 401),
        { status: 401 }
      );
    }

    // Verify tournament exists and user has access
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournament')
      .select(`
        *,
        org_member!inner(role)
      `)
      .eq('id', tournamentId)
      .eq('org_member.user_id', user.id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        ApiResponse.error('Torneo no encontrado', 404),
        { status: 404 }
      );
    }

    // Get all incidents with profiles
    const { data: incidents, error: incidentsError } = await supabase
      .from('tournament_fair_play')
      .select(`
        *,
        user_profile:user_id (name, avatar_url),
        issuer_profile:issued_by (name, avatar_url)
      `)
      .eq('tournament_id', tournamentId)
      .order('issued_at', { ascending: false });

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError);
      return NextResponse.json(
        ApiResponse.error('Error al obtener incidentes', 500),
        { status: 500 }
      );
    }

    // Format response
    const formattedIncidents: TournamentFairPlayWithProfile[] = incidents.map(inc => ({
      ...inc,
      user_profile: inc.user_profile as Pick<{ name: string; avatar_url: string | null }, 'name' | 'avatar_url'>,
      issuer_profile: inc.issuer_profile as Pick<{ name: string; avatar_url: string | null }, 'name' | 'avatar_url'> | undefined,
    }));

    return NextResponse.json(
      ApiResponse.success(formattedIncidents, 'Incidentes obtenidos exitosamente'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in GET /api/tournaments/[id]/fair-play:', error);
    return NextResponse.json(
      ApiResponse.error('Error interno del servidor', 500),
      { status: 500 }
    );
  }
}
