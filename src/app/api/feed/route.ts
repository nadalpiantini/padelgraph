/**
 * Feed API endpoint
 * GET /api/feed - Get social feed timeline with pagination
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { feedQuerySchema } from '@/lib/validations/feed';

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
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor'),
      user_id: searchParams.get('user_id'),
      org_id: searchParams.get('org_id'),
    };

    const validation = feedQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { limit, cursor, user_id, org_id } = validation.data;

    // Build query with joins
    let query = supabase
      .from('post')
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
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply cursor pagination
    if (cursor) {
      const { data: cursorPost } = await supabase
        .from('post')
        .select('created_at')
        .eq('id', cursor)
        .single();

      if (cursorPost) {
        query = query.lt('created_at', cursorPost.created_at);
      }
    }

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    // Filter by visibility
    // Show: public posts, user's own posts, and org posts if user is member
    if (!user_id && !org_id) {
      query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('[Feed API] Error fetching feed:', postsError);
      return serverErrorResponse('Failed to fetch feed', postsError);
    }

    // Determine next cursor
    const nextCursor = posts && posts.length === limit ? posts[posts.length - 1].id : null;

    return successResponse({
      posts: posts || [],
      nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (error) {
    console.error('[Feed API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
