/**
 * Post Comment API endpoint
 * POST /api/posts/[id]/comment - Add a comment to a post
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createCommentSchema, postIdSchema } from '@/lib/validations/feed';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate post ID
    const idValidation = postIdSchema.safeParse({ id });

    if (!idValidation.success) {
      return errorResponse('Invalid post ID', idValidation.error.issues);
    }

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
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { content } = validation.data;

    // Check if post exists and get visibility
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
      return errorResponse('You do not have permission to comment on this post', undefined, 403);
    }

    if (post.visibility === 'org' && post.org_id) {
      const { data: membership } = await supabase
        .from('org_member')
        .select('id')
        .eq('org_id', post.org_id)
        .eq('user_id', user.id)
        .single();

      if (!membership && post.user_id !== user.id) {
        return errorResponse('You do not have permission to comment on this post', undefined, 403);
      }
    }

    // Create comment
    const { data: newComment, error: createError } = await supabase
      .from('post_comment')
      .insert({
        post_id: id,
        user_id: user.id,
        content,
      })
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .single();

    if (createError) {
      console.error('[Comment API] Error creating comment:', createError);
      return serverErrorResponse('Failed to create comment', createError);
    }

    // Get updated comments count (trigger automatically updates it)
    const { data: updatedPost } = await supabase
      .from('post')
      .select('comments_count')
      .eq('id', id)
      .single();

    return successResponse(
      {
        comment: newComment,
        comments_count: updatedPost?.comments_count || 0,
      },
      'Comment added successfully',
      201
    );
  } catch (error) {
    console.error('[Comment API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
