// Sprint 5 Phase 2: Calculate Stats Cron Job (Phase 1 Completion)
// Runs daily at 02:00 UTC to calculate player stats and detect achievements

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { calculatePlayerStats } from '@/lib/services/analytics';
import { precalculateLeaderboards } from '@/lib/services/leaderboards';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn('Unauthorized cron job attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const startTime = Date.now();

    log.info('Starting daily stats calculation');

    // Get all tournaments with matches in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentTournaments, error: tournamentsError } = await supabase
      .from('tournament')
      .select('id')
      .in('status', ['in_progress', 'completed'])
      .gte('updated_at', yesterday.toISOString());

    if (tournamentsError) {
      log.error('Error fetching recent tournaments', { error: tournamentsError });
      return NextResponse.json(
        { error: 'Failed to fetch tournaments' },
        { status: 500 }
      );
    }

    log.info(`Found ${recentTournaments?.length || 0} tournaments with recent activity`);

    // Process each tournament
    const results = {
      processed_tournaments: 0,
      updated_players: 0,
      new_achievements: 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    for (const tournament of recentTournaments || []) {
      try {
        // Get all matches from this tournament updated in the last 24 hours
        const { data: matches, error: matchesError } = await supabase
          .from('match')
          .select(`
            *,
            round:round_id (
              tournament_id,
              round_number
            ),
            participant:match_participant (
              user_id,
              score,
              games_won,
              is_winner
            )
          `)
          .eq('round.tournament_id', tournament.id)
          .gte('updated_at', yesterday.toISOString())
          .eq('status', 'completed');

        if (matchesError) {
          log.error('Error fetching matches', {
            error: matchesError,
            tournamentId: tournament.id
          });
          results.errors.push(`Tournament ${tournament.id}: ${matchesError.message}`);
          continue;
        }

        // Calculate stats for each player in the tournament
        const playerIds = new Set<string>();
        matches?.forEach(match => {
          match.participant?.forEach((p: { user_id?: string }) => {
            if (p.user_id) playerIds.add(p.user_id);
          });
        });

        for (const playerId of playerIds) {
          try {
            // Calculate player stats for different periods
            const now = new Date();
            
            // Weekly stats
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            await calculatePlayerStats(playerId, 'week', weekStart, now);
            
            // Monthly stats  
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            await calculatePlayerStats(playerId, 'month', monthStart, monthEnd);
            
            // All-time stats
            const allTimeStart = new Date('2024-01-01');
            await calculatePlayerStats(playerId, 'all_time', allTimeStart, now);

            // TODO: Implement these functions in next phase
            // - Achievement detection
            // - Achievement notifications
            // - Aggregated stats update

            results.updated_players++;
          } catch (playerError) {
            log.error('Error processing player stats', {
              error: playerError,
              playerId,
              tournamentId: tournament.id,
            });
            results.errors.push(`Player ${playerId}: ${playerError}`);
          }
        }

        results.processed_tournaments++;
      } catch (tournamentError) {
        log.error('Error processing tournament', {
          error: tournamentError,
          tournamentId: tournament.id,
        });
        results.errors.push(`Tournament ${tournament.id}: ${tournamentError}`);
      }
    }

    // Update global leaderboards
    try {
      log.info('Updating global leaderboards');

      // Precalculate all leaderboards
      await precalculateLeaderboards();

      log.info('Leaderboards updated successfully');
    } catch (leaderboardError) {
      log.error('Error updating leaderboards', { error: leaderboardError });
      results.errors.push(`Leaderboards: ${leaderboardError}`);
    }

    const duration = Date.now() - startTime;

    log.info('Daily stats calculation completed', {
      duration: `${duration}ms`,
      ...results,
    });

    return NextResponse.json({
      success: true,
      message: 'Stats calculation completed',
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    log.error('Critical error in stats calculation cron job', { error });
    return NextResponse.json(
      {
        error: 'Stats calculation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}