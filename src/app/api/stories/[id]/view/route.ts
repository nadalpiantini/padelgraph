/**
 * Story View API endpoint
 * POST /api/stories/[id]/view - Mark story as viewed
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: story_id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Check if story exists and is not expired
    const { data: story, error: storyError } = await supabase
      .from('story')
      .select('id, user_id, expires_at, views_count')
      .eq('id', story_id)
      .single();

    if (storyError || !story) {
      return notFoundResponse('Story');
    }

    if (new Date(story.expires_at) < new Date()) {
      return errorResponse('Story has expired', undefined, 410);
    }

    // Check if already viewed
    const { data: existingView } = await supabase
      .from('story_view')
      .select('story_id')
      .eq('story_id', story_id)
      .eq('viewer_id', user.id)
      .single();

    if (existingView) {
      return successResponse(
        {
          already_viewed: true,
          views_count: story.views_count,
        },
        'Already viewed'
      );
    }

    // Mark as viewed
    const { error: viewError } = await supabase
      .from('story_view')
      .insert({
        story_id,
        viewer_id: user.id,
      });

    if (viewError) {
      console.error('[Story View API] Error marking as viewed:', viewError);
      return serverErrorResponse('Failed to mark story as viewed', viewError);
    }

    // Get updated views count
    const { data: updatedStory } = await supabase
      .from('story')
      .select('views_count')
      .eq('id', story_id)
      .single();

    return successResponse(
      {
        views_count: updatedStory?.views_count || story.views_count + 1,
      },
      'Story marked as viewed',
      201
    );
  } catch (error) {
    console.error('[Story View API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
