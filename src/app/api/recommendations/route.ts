/**
 * Recommendations API endpoint
 * GET /api/recommendations - Get personalized recommendations
 * POST /api/recommendations - Generate new recommendations (admin/system)
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import {
  recommendationsQuerySchema,
  generateRecommendationsSchema,
} from '@/lib/validations/recommendations';
import { generateRecommendations } from '@/lib/services/recommendations';
import { canCreateRecommendation, incrementUsage } from '@/lib/middleware/usage-limits';

export async function GET(request: Request) {
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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      include_shown: searchParams.get('include_shown'),
    };

    const validation = recommendationsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { type, limit, include_shown } = validation.data;

    // Build query
    let query = supabase
      .from('recommendation')
      .select('*')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by type if specified
    if (type) {
      query = query.eq('recommended_type', type);
    }

    // Filter out already shown unless explicitly requested
    if (!include_shown) {
      query = query.eq('shown', false);
    }

    const { data: recommendations, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Recommendations API] Error fetching recommendations:', fetchError);
      return serverErrorResponse('Failed to fetch recommendations', fetchError);
    }

    // Mark recommendations as shown
    if (recommendations && recommendations.length > 0) {
      const recommendationIds = recommendations.map((r) => r.id);
      await supabase
        .from('recommendation')
        .update({ shown: true })
        .in('id', recommendationIds);
    }

    return successResponse({
      recommendations: recommendations || [],
      total: recommendations?.length || 0,
    });
  } catch (error) {
    console.error('[Recommendations API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

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
    const validation = generateRecommendationsSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { user_id, type, limit, force_refresh } = validation.data;

    // Use current user if user_id not specified
    const targetUserId = user_id || user.id;

    // Check if user has permission (only self or admin)
    let isAdmin = false;
    if (targetUserId !== user.id) {
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!userProfile?.is_admin) {
        return unauthorizedResponse('Not authorized to generate recommendations for other users');
      }
      isAdmin = userProfile.is_admin;
    }

    // Check usage limit for recommendations
    const limitCheck = await canCreateRecommendation(targetUserId);
    if (!limitCheck.allowed && !isAdmin) {
      return errorResponse(
        limitCheck.error || 'Recommendation generation limit exceeded. Upgrade your plan to continue.',
        {
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          current: limitCheck.current,
          upgrade_url: '/pricing',
        },
        403
      );
    }

    // Check if fresh recommendations exist (unless force_refresh)
    if (!force_refresh) {
      const { count } = await supabase
        .from('recommendation')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('recommended_type', type)
        .eq('shown', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

      if (count && count >= limit) {
        return successResponse({
          message: 'Fresh recommendations already exist',
          count,
        });
      }
    }

    // Generate new recommendations
    const recommendations = await generateRecommendations({
      user_id: targetUserId,
      type,
      limit,
    });

    // Record successful usage
    await incrementUsage(targetUserId, 'recommendation_created', {
      type,
      count: recommendations.length,
      force_refresh,
    });

    return successResponse(
      {
        recommendations,
        generated: recommendations.length,
      },
      'Recommendations generated successfully',
      201
    );
  } catch (error) {
    console.error('[Recommendations API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
