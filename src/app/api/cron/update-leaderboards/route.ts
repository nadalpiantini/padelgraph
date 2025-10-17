// Sprint 5 Phase 2: Update Leaderboards Cron Job
// Runs every 6 hours to update all leaderboards

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { precalculateLeaderboards } from '@/lib/services/leaderboards';

export const runtime = 'edge';
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

    const startTime = Date.now();

    log.info('Starting leaderboards update');

    try {
      // Precalculate all leaderboard types
      await precalculateLeaderboards();

      const duration = Date.now() - startTime;

      log.info('Leaderboards update completed', {
        duration: `${duration}ms`,
      });

      return NextResponse.json({
        success: true,
        message: 'Leaderboards updated successfully',
        duration: `${duration}ms`,
      });
    } catch (error) {
      log.error('Error updating leaderboards', { error });
      throw error;
    }
  } catch (error) {
    log.error('Critical error in leaderboards cron job', { error });
    return NextResponse.json(
      {
        error: 'Leaderboards update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}