/**
 * Match Score Submission API
 *
 * POST /api/tournaments/[id]/rounds/[roundId]/matches/[matchId]/score
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { submitScoreSchema } from '@/lib/validations/tournament';
import { TournamentEngine } from '@/lib/tournament-engine';
import { notifyScoreSubmitted } from '@/lib/notifications/tournament';
import type { Standing, Match, TournamentConfig } from '@/lib/tournament-engine';

/**
 * POST - Submit match score
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; roundId: string; matchId: string }> }
) {
  try {
    const { id, roundId, matchId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Parse and validate scores
    const body = await request.json();
    const validated = submitScoreSchema.parse(body);

    // Fetch match with tournament details
    const { data: match, error: matchError } = await supabase
      .from('tournament_match')
      .select(
        `
        *,
        tournament_round!inner(
          tournament_id,
          status,
          tournament!inner(
            type,
            points_per_win,
            points_per_draw,
            points_per_loss,
            settings
          )
        )
      `
      )
      .eq('id', matchId)
      .eq('round_id', roundId)
      .single();

    if (matchError || !match) {
      return ApiResponse.error('Match not found', 404);
    }

    const tournament = match.tournament_round.tournament;

    // Validate user is admin or one of the players
    const isPlayer = [
      match.team1_player1_id,
      match.team1_player2_id,
      match.team2_player1_id,
      match.team2_player2_id,
    ].includes(user.id);

    if (!isPlayer) {
      // Check if user is admin
      const { data: membership } = await supabase
        .from('org_member')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .limit(1)
        .single();

      if (!membership) {
        return ApiResponse.error('Unauthorized to submit score', 403);
      }
    }

    // Calculate winner
    const isDraw = validated.team1_score === validated.team2_score;
    const winnerTeam = isDraw
      ? undefined
      : validated.team1_score > validated.team2_score
        ? 1
        : 2;

    // Update match with scores
    const { error: updateError } = await supabase
      .from('tournament_match')
      .update({
        team1_score: validated.team1_score,
        team2_score: validated.team2_score,
        winner_team: winnerTeam,
        is_draw: isDraw,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('Error updating match:', updateError);
      return ApiResponse.error('Failed to update match score', 500);
    }

    // Fetch current standings
    const { data: currentStandings } = await supabase
      .from('tournament_standing')
      .select('*')
      .eq('tournament_id', id);

    // Create tournament config
    const config: TournamentConfig = {
      type: tournament.type,
      points_per_win: tournament.points_per_win,
      points_per_draw: tournament.points_per_draw,
      points_per_loss: tournament.points_per_loss,
      match_duration_minutes: 90,
    };

    // Update standings using tournament engine
    const updatedMatch: Match = {
      ...match,
      team1_score: validated.team1_score,
      team2_score: validated.team2_score,
      winner_team: winnerTeam,
      is_draw: isDraw,
      status: 'completed',
    };

    const updatedStandings = TournamentEngine.updateStandingsForMatch(
      updatedMatch,
      (currentStandings || []) as Standing[],
      config
    );

    // Update standings in database
    for (const standing of updatedStandings) {
      await supabase
        .from('tournament_standing')
        .update({
          matches_played: standing.matches_played,
          matches_won: standing.matches_won,
          matches_drawn: standing.matches_drawn,
          matches_lost: standing.matches_lost,
          games_won: standing.games_won,
          games_lost: standing.games_lost,
          points: standing.points,
          rank: standing.rank,
          updated_at: new Date().toISOString(),
        })
        .eq('tournament_id', id)
        .eq('user_id', standing.user_id);
    }

    // Check if all matches in round are completed (auto-advance if enabled)
    const { data: roundMatches } = await supabase
      .from('tournament_match')
      .select('status')
      .eq('round_id', roundId);

    const allCompleted = roundMatches?.every((m) => m.status === 'completed');

    if (allCompleted && tournament.settings?.auto_advance_rounds) {
      // Auto-advance to next round (handled by round complete endpoint)
      // TODO: Trigger round completion automatically
    }

    // Send score notification to all 4 players
    try {
      await notifyScoreSubmitted(matchId);
    } catch (notifError) {
      console.error('[Notification] Score submitted failed:', notifError);
    }

    return ApiResponse.success({ match: updatedMatch }, 'Score submitted successfully');
  } catch (error) {
    console.error('Score submission error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
