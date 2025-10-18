/**
 * Share Post API endpoint
 * POST /api/share - Share a post to feed (re-share with optional caption)
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const sharePostSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().max(2000).optional(),
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
    const validation = sharePostSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { post_id, content } = validation.data;

    // Get original post
    const { data: originalPost, error: postError } = await supabase
      .from('post')
      .select('*')
      .eq('id', post_id)
      .single();

    if (postError || !originalPost) {
      return notFoundResponse('Post');
    }

    // Check if user has access to this post (based on visibility)
    if (originalPost.visibility === 'private' && originalPost.user_id !== user.id) {
      return errorResponse('You cannot share private posts', undefined, 403);
    }

    // Create new post as a share
    const { data: sharedPost, error: createError } = await supabase
      .from('post')
      .insert({
        user_id: user.id,
        content: content || `Shared: ${originalPost.content.substring(0, 100)}${originalPost.content.length > 100 ? '...' : ''}`,
        media_urls: originalPost.media_urls,
        visibility: 'public', // Shares are always public
        org_id: null, // Shares are not org-specific
      })
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
      .single();

    if (createError) {
      console.error('[Share API] Error creating share:', createError);
      return serverErrorResponse('Failed to share post', createError);
    }

    // Create notification for original post author
    if (originalPost.user_id !== user.id) {
      await supabase.from('notification').insert({
        user_id: originalPost.user_id,
        actor_id: user.id,
        type: 'share',
        post_id: sharedPost.id,
      });
    }

    return successResponse(
      {
        post: sharedPost,
        original_post_id: post_id,
      },
      'Post shared successfully',
      201
    );
  } catch (error) {
    console.error('[Share API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
