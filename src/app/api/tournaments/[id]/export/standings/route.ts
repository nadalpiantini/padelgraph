/**
 * Export Standings
 *
 * Exports tournament standings in CSV format.
 *
 * Query params:
 * - format: 'csv' (default: 'csv')
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stringify } from 'csv-stringify/sync';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournament')
      .select('id, name, type')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Fetch standings
    const { data: standings, error: standingsError } = await supabase
      .from('tournament_standing')
      .select(
        `
        *,
        user_profile!inner(
          user_id,
          full_name,
          email
        )
      `
      )
      .eq('tournament_id', id)
      .order('rank', { ascending: true });

    if (standingsError) {
      console.error('Error fetching standings:', standingsError);
      return NextResponse.json(
        { error: 'Failed to fetch standings' },
        { status: 500 }
      );
    }

    if (format === 'csv') {
      // Prepare CSV data
      const csvData = standings?.map((s) => ({
        Rank: s.rank,
        Player: s.user_profile?.full_name || 'Unknown',
        Email: s.user_profile?.email || '',
        'Matches Played': s.matches_played || 0,
        Wins: s.wins || 0,
        Losses: s.losses || 0,
        'Games Won': s.games_won || 0,
        'Games Lost': s.games_lost || 0,
        'Win Rate': s.matches_played
          ? `${((s.wins / s.matches_played) * 100).toFixed(1)}%`
          : '0%',
        Points: s.points || 0,
      })) || [];

      // Generate CSV
      const csv = stringify(csvData, {
        header: true,
        columns: [
          'Rank',
          'Player',
          'Email',
          'Matches Played',
          'Wins',
          'Losses',
          'Games Won',
          'Games Lost',
          'Win Rate',
          'Points',
        ],
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="standings-${tournament.name.replace(/\s+/g, '-')}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export standings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
