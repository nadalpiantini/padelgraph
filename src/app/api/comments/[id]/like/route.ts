/**
 * Comment Like API endpoint
 * POST /api/comments/[id]/like - Toggle like on comment
 */
import { createClient } from '@/lib/supabase/server';
import {
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
    const { id: comment_id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('post_comment')
      .select('id, user_id, post_id')
      .eq('id', comment_id)
      .single();

    if (commentError || !comment) {
      return notFoundResponse('Comment');
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('comment_like')
      .select('id')
      .eq('comment_id', comment_id)
      .eq('user_id', user.id)
      .single();

    let action: 'liked' | 'unliked';

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('comment_like')
        .delete()
        .eq('comment_id', comment_id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Comment Like API] Error unliking:', deleteError);
        return serverErrorResponse('Failed to unlike comment', deleteError);
      }

      action = 'unliked';
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('comment_like')
        .insert({
          comment_id,
          user_id: user.id,
        });

      if (insertError) {
        console.error('[Comment Like API] Error liking:', insertError);
        return serverErrorResponse('Failed to like comment', insertError);
      }

      // Create notification for comment author (if not liking own comment)
      if (comment.user_id !== user.id) {
        await supabase.from('notification').insert({
          user_id: comment.user_id,
          actor_id: user.id,
          type: 'comment_like',
          post_id: comment.post_id,
          comment_id,
        });
      }

      action = 'liked';
    }

    // Get updated likes count
    const { data: updatedComment } = await supabase
      .from('post_comment')
      .select('likes_count')
      .eq('id', comment_id)
      .single();

    return successResponse(
      {
        action,
        likes_count: updatedComment?.likes_count || 0,
        has_liked: action === 'liked',
      },
      `Comment ${action} successfully`
    );
  } catch (error) {
    console.error('[Comment Like API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
