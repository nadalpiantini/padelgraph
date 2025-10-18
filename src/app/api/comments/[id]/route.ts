/**
 * Single Comment API endpoint
 * GET /api/comments/[id] - Get comment with thread
 * DELETE /api/comments/[id] - Delete own comment
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

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get comment with author info
    const { data: comment, error: commentError } = await supabase
      .from('post_comment')
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          username,
          avatar_url,
          level
        )
      `
      )
      .eq('id', id)
      .single();

    if (commentError || !comment) {
      return notFoundResponse('Comment');
    }

    // Get comment thread (all replies recursively)
    const { data: thread, error: threadError } = await supabase.rpc('get_comment_thread', {
      root_comment_id: id,
    });

    if (threadError) {
      console.error('[Comment API] Error fetching thread:', threadError);
      // Continue without thread if function doesn't exist yet
    }

    // Get replies if RPC function doesn't work
    let replies: any[] = [];
    if (!thread) {
      const { data: directReplies } = await supabase
        .from('post_comment')
        .select(
          `
          *,
          author:user_profile!user_id (
            id,
            name,
            username,
            avatar_url,
            level
          )
        `
        )
        .eq('parent_id', id)
        .order('created_at', { ascending: true });

      replies = directReplies || [];
    }

    return successResponse({
      comment: {
        ...comment,
        replies: thread || replies,
      },
    });
  } catch (error) {
    console.error('[Comment API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Check if comment exists and user owns it
    const { data: comment, error: commentError } = await supabase
      .from('post_comment')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (commentError || !comment) {
      return notFoundResponse('Comment');
    }

    if (comment.user_id !== user.id) {
      return errorResponse('You can only delete your own comments', undefined, 403);
    }

    // Delete comment (CASCADE will delete replies and likes)
    const { error: deleteError } = await supabase
      .from('post_comment')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Comment API] Error deleting comment:', deleteError);
      return serverErrorResponse('Failed to delete comment', deleteError);
    }

    return successResponse({ id }, 'Comment deleted successfully');
  } catch (error) {
    console.error('[Comment API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
