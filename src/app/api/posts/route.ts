/**
 * Posts API endpoint
 * POST /api/posts - Create a new post
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createPostSchema } from '@/lib/validations/feed';

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
    const validation = createPostSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { content, media_urls, visibility, org_id } = validation.data;

    // If org_id is provided, verify user is member
    if (org_id) {
      const { data: membership } = await supabase
        .from('org_member')
        .select('id')
        .eq('org_id', org_id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return errorResponse('You are not a member of this organization', undefined, 403);
      }
    }

    // Create post
    const { data: newPost, error: createError } = await supabase
      .from('post')
      .insert({
        user_id: user.id,
        content,
        media_urls: media_urls || [],
        visibility,
        org_id,
      })
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          avatar_url,
          level
        )
      `
      )
      .single();

    if (createError) {
      console.error('[Posts API] Error creating post:', createError);
      return serverErrorResponse('Failed to create post', createError);
    }

    return successResponse(newPost, 'Post created successfully', 201);
  } catch (error) {
    console.error('[Posts API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
