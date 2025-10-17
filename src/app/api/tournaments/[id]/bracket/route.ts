/**
 * Tournament Bracket API
 *
 * GET /api/tournaments/[id]/bracket - Get bracket structure with matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import type { TournamentBracket } from '@/types/database';

/**
 * GET - Retrieve Tournament Bracket
 *
 * Returns bracket structure organized by bracket type (main/losers/consolation)
 * with all associated matches including team details.
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

    // Get all brackets for this tournament
    const { data: brackets, error: bracketsError } = await supabase
      .from('tournament_bracket')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('position', { ascending: true });

    if (bracketsError) {
      console.error('Error fetching brackets:', bracketsError);
      return NextResponse.json(
        ApiResponse.error('Error al obtener brackets', 500),
        { status: 500 }
      );
    }

    // Get all matches for this tournament with team details
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_match')
      .select(`
        *,
        tournament_round!inner(round_number),
        team1_player1:team1_player1_id(id, name, avatar_url),
        team1_player2:team1_player2_id(id, name, avatar_url),
        team2_player1:team2_player1_id(id, name, avatar_url),
        team2_player2:team2_player2_id(id, name, avatar_url)
      `)
      .eq('tournament_round.tournament_id', tournamentId)
      .order('tournament_round.round_number', { ascending: true });

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        ApiResponse.error('Error al obtener partidos', 500),
        { status: 500 }
      );
    }

    // Group brackets by type for easier visualization
    const bracketsByType = (brackets || []).reduce((acc, bracket) => {
      const type = bracket.bracket_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(bracket);
      return acc;
    }, {} as Record<string, TournamentBracket[]>);

    // Format response
    const response = {
      brackets: bracketsByType,
      matches: matches || [],
      tournamentType: tournament.type,
    };

    return NextResponse.json(
      ApiResponse.success(response, 'Bracket obtenido exitosamente'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in GET /api/tournaments/[id]/bracket:', error);
    return NextResponse.json(
      ApiResponse.error('Error interno del servidor', 500),
      { status: 500 }
    );
  }
}
