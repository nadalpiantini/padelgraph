/**
 * Recommendations Feedback API endpoint
 * POST /api/recommendations/feedback - Track recommendation interactions
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { recommendationFeedbackSchema } from '@/lib/validations/recommendations';
import { trackRecommendationFeedback } from '@/lib/services/recommendations';

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
    const body = await request.json();
    const validation = recommendationFeedbackSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { recommendation_id, shown, clicked, dismissed } = validation.data;

    // Verify the recommendation belongs to the user
    const { data: recommendation, error: fetchError } = await supabase
      .from('recommendation')
      .select('user_id')
      .eq('id', recommendation_id)
      .single();

    if (fetchError || !recommendation) {
      return errorResponse('Recommendation not found', undefined, 404);
    }

    if (recommendation.user_id !== user.id) {
      return unauthorizedResponse('Not authorized to update this recommendation');
    }

    // Track feedback
    await trackRecommendationFeedback(recommendation_id, {
      shown,
      clicked,
      dismissed,
    });

    return successResponse({ recommendation_id }, 'Feedback recorded successfully');
  } catch (error) {
    console.error('[Recommendations Feedback API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
