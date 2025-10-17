/**
 * Individual Post API endpoint
 * GET /api/posts/[id] - Get a specific post
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { postIdSchema } from '@/lib/validations/feed';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate post ID
    const validation = postIdSchema.safeParse({ id });

    if (!validation.success) {
      return errorResponse('Invalid post ID', validation.error.issues);
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Fetch post with author and comments
    const { data: post, error: postError } = await supabase
      .from('post')
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          avatar_url,
          level
        ),
        comments:post_comment (
          id,
          content,
          created_at,
          author:user_profile!user_id (
            id,
            name,
            avatar_url
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        return notFoundResponse('Post');
      }
      console.error('[Post API] Error fetching post:', postError);
      return serverErrorResponse('Failed to fetch post', postError);
    }

    if (!post) {
      return notFoundResponse('Post');
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.user_id !== user.id) {
      return errorResponse('You do not have permission to view this post', undefined, 403);
    }

    if (post.visibility === 'org' && post.org_id) {
      const { data: membership } = await supabase
        .from('org_member')
        .select('id')
        .eq('org_id', post.org_id)
        .eq('user_id', user.id)
        .single();

      if (!membership && post.user_id !== user.id) {
        return errorResponse('You do not have permission to view this post', undefined, 403);
      }
    }

    return successResponse(post);
  } catch (error) {
    console.error('[Post API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
