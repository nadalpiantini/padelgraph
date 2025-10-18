/**
 * Post Like API endpoint
 * POST /api/feed/like - Toggle like on a post
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const likePostSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
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
    const body = await request.json();
    const validation = likePostSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { post_id } = validation.data;

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return errorResponse('Post not found', undefined, 404);
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_like')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from('post_like')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Like API] Error removing like:', deleteError);
        return serverErrorResponse('Failed to remove like', deleteError);
      }

      // Decrement likes count
      const { data: currentPost } = await supabase
        .from('post')
        .select('likes_count')
        .eq('id', post_id)
        .single();

      if (currentPost) {
        const { error: updateError } = await supabase
          .from('post')
          .update({ likes_count: Math.max(0, currentPost.likes_count - 1) })
          .eq('id', post_id);

        if (updateError) {
          console.error('[Like API] Error updating likes count:', updateError);
        }
      }

      return successResponse({ liked: false }, 'Post unliked successfully');
    } else {
      // Like - add the like
      const { error: insertError } = await supabase
        .from('post_like')
        .insert({
          post_id,
          user_id: user.id,
        });

      if (insertError) {
        console.error('[Like API] Error adding like:', insertError);
        return serverErrorResponse('Failed to like post', insertError);
      }

      // Increment likes count
      const { data: currentPost } = await supabase
        .from('post')
        .select('likes_count')
        .eq('id', post_id)
        .single();

      if (currentPost) {
        const { error: updateError } = await supabase
          .from('post')
          .update({ likes_count: currentPost.likes_count + 1 })
          .eq('id', post_id);

        if (updateError) {
          console.error('[Like API] Error updating likes count:', updateError);
        }
      }

      return successResponse({ liked: true }, 'Post liked successfully');
    }
  } catch (error) {
    console.error('[Like API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
