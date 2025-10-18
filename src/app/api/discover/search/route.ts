/**
 * Discover Search API endpoint
 * GET /api/discover/search - Search posts, users, hashtags
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // all, posts, users, hashtags
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.trim().length < 2) {
      return errorResponse('Search query must be at least 2 characters', undefined, 400);
    }

    const searchQuery = query.trim();
    const response: any = {};

    // Search posts
    if (type === 'all' || type === 'posts') {
      const { data: posts, error: postsError } = await supabase
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
        `
        )
        .eq('visibility', 'public')
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (postsError) {
        console.error('[Discover Search API] Error searching posts:', postsError);
      }

      response.posts = posts || [];
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users, error: usersError } = await supabase
        .from('user_profile')
        .select('id, name, username, avatar_url, level, followers_count')
        .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .limit(limit);

      if (usersError) {
        console.error('[Discover Search API] Error searching users:', usersError);
      }

      // Check which users the current user is following
      if (users && users.length > 0) {
        const userIds = users.map((u) => u.id);
        const { data: following } = await supabase
          .from('follow')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', userIds);

        const followingSet = new Set((following || []).map((f) => f.following_id));

        users.forEach((u: any) => {
          u.is_following = followingSet.has(u.id);
        });
      }

      response.users = users || [];
    }

    // Search hashtags
    if (type === 'all' || type === 'hashtags') {
      const { data: hashtags, error: hashtagsError } = await supabase
        .from('hashtag')
        .select('*')
        .ilike('tag', `%${searchQuery}%`)
        .order('posts_count', { ascending: false })
        .limit(limit);

      if (hashtagsError) {
        console.error('[Discover Search API] Error searching hashtags:', hashtagsError);
      }

      response.hashtags = hashtags || [];
    }

    return successResponse({
      query: searchQuery,
      ...response,
    });
  } catch (error) {
    console.error('[Discover Search API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
