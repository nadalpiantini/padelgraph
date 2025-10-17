/**
 * Post Like API endpoint
 * POST /api/posts/[id]/like - Toggle like on a post
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

export async function POST(_request: Request, { params }: RouteParams) {
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

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id, visibility, user_id, org_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return notFoundResponse('Post');
    }

    // Check visibility permissions for private/org posts
    if (post.visibility === 'private' && post.user_id !== user.id) {
      return errorResponse('You do not have permission to like this post', undefined, 403);
    }

    if (post.visibility === 'org' && post.org_id) {
      const { data: membership } = await supabase
        .from('org_member')
        .select('id')
        .eq('org_id', post.org_id)
        .eq('user_id', user.id)
        .single();

      if (!membership && post.user_id !== user.id) {
        return errorResponse('You do not have permission to like this post', undefined, 403);
      }
    }

    // Check if user already liked the post
    const { data: existingLike } = await supabase
      .from('post_like')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    let liked = false;

    if (existingLike) {
      // Unlike: delete the like
      const { error: deleteError } = await supabase
        .from('post_like')
        .delete()
        .eq('post_id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Like API] Error removing like:', deleteError);
        return serverErrorResponse('Failed to remove like', deleteError);
      }

      liked = false;
    } else {
      // Like: insert new like
      const { error: insertError } = await supabase.from('post_like').insert({
        post_id: id,
        user_id: user.id,
      });

      if (insertError) {
        console.error('[Like API] Error adding like:', insertError);
        return serverErrorResponse('Failed to add like', insertError);
      }

      liked = true;
    }

    // Get updated likes count (triggers automatically update the count)
    const { data: updatedPost } = await supabase
      .from('post')
      .select('likes_count')
      .eq('id', id)
      .single();

    return successResponse(
      {
        liked,
        likes_count: updatedPost?.likes_count || 0,
      },
      liked ? 'Post liked' : 'Post unliked'
    );
  } catch (error) {
    console.error('[Like API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
