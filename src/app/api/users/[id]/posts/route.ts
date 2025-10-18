/**
 * User Posts API endpoint
 * GET /api/users/[id]/posts - Get user's posts
 */
import { createClient } from '@/lib/supabase/server';
import {
  serverErrorResponse,
  successResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's posts
    const { data: posts, error: postsError, count } = await supabase
      .from('post')
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
      `,
        { count: 'exact' }
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error('[User Posts API] Error fetching posts:', postsError);
      return serverErrorResponse('Failed to fetch posts', postsError);
    }

    return successResponse({
      posts: posts || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[User Posts API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
