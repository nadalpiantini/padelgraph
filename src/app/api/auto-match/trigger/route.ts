/**
 * Auto-Match Trigger API endpoint
 * POST /api/auto-match/trigger - Trigger auto-match for current user or batch
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { triggerAutoMatch, batchAutoMatch } from '@/lib/services/auto-match';
import { enforceUsageLimit, recordFeatureUsage, UsageLimitError } from '@/lib/middleware/usage-enforcement';
import { z } from 'zod';

const triggerAutoMatchSchema = z.object({
  min_score: z.number().min(0).max(1).optional().default(0.8),
  max_matches: z.number().min(1).max(10).optional().default(3),
  send_message: z.boolean().optional().default(true),
  batch_mode: z.boolean().optional().default(false),
  max_users: z.number().min(1).max(1000).optional().default(100),
});

export async function POST(request: Request) {
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

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = triggerAutoMatchSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { min_score, max_matches, send_message, batch_mode, max_users } = validation.data;

    // Check usage limit for auto-match (unless batch mode - admin only)
    if (!batch_mode) {
      try {
        await enforceUsageLimit(user.id, 'auto_match');
      } catch (error) {
        if (error instanceof UsageLimitError) {
          return errorResponse(error.message, 403);
        }
        throw error;
      }
    }

    // Check if batch mode (admin only)
    if (batch_mode) {
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!userProfile?.is_admin) {
        return unauthorizedResponse('Batch mode requires admin privileges');
      }

      // Run batch auto-match
      const result = await batchAutoMatch({ min_score, max_users });

      return successResponse(
        {
          batch_mode: true,
          total_users_processed: result.total_users,
          total_matches_created: result.total_matches,
        },
        'Batch auto-match completed successfully'
      );
    }

    // Individual auto-match for current user
    const matches = await triggerAutoMatch(user.id, {
      min_score,
      max_matches,
      send_message,
    });

    if (matches.length === 0) {
      return successResponse(
        {
          matches: [],
          message: 'No compatible matches found or rate limit reached',
        },
        'Auto-match completed with no results'
      );
    }

    // Record successful usage
    await recordFeatureUsage(user.id, 'auto_match', 'trigger', {
      matches_found: matches.length,
      min_score,
    });

    return successResponse(
      {
        matches,
        total_matches: matches.length,
      },
      `Auto-match completed: ${matches.length} match(es) found`,
      201
    );
  } catch (error) {
    console.error('[Auto-Match Trigger API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
