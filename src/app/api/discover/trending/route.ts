/**
 * Discover Trending API endpoint
 * GET /api/discover/trending - Get trending content (posts, hashtags, users)
 */
import { createClient } from '@/lib/supabase/server';
import {
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
    const type = searchParams.get('type') || 'all'; // all, posts, hashtags, users
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const response: any = {};

    // Get trending posts
    if (type === 'all' || type === 'posts') {
      const { data: trendingPosts, error: postsError } = await supabase.rpc(
        'get_trending_posts',
        {
          limit_count: limit,
          offset_count: 0,
        }
      );

      if (postsError) {
        console.log('[Discover Trending API] Error with RPC, using fallback');
        // Fallback: Get recent popular posts
        const { data: fallbackPosts } = await supabase
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
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('likes_count', { ascending: false })
          .order('comments_count', { ascending: false })
          .limit(limit);

        response.trending_posts = fallbackPosts || [];
      } else {
        // Get full post data for trending post IDs
        const postIds = (trendingPosts || []).map((p: any) => p.post_id);
        if (postIds.length > 0) {
          const { data: posts } = await supabase
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
            .in('id', postIds);

          response.trending_posts = posts || [];
        } else {
          response.trending_posts = [];
        }
      }
    }

    // Get trending hashtags
    if (type === 'all' || type === 'hashtags') {
      // Try to use materialized view
      const { data: trendingHashtags, error: hashtagsError } = await supabase
        .from('mv_trending_hashtags')
        .select('*')
        .limit(limit);

      if (hashtagsError) {
        console.log('[Discover Trending API] MV not available, using fallback');
        // Fallback: Get recent popular hashtags
        const { data: fallbackHashtags } = await supabase
          .from('hashtag')
          .select('*')
          .order('posts_count', { ascending: false })
          .limit(limit);

        response.trending_hashtags = fallbackHashtags || [];
      } else {
        response.trending_hashtags = trendingHashtags || [];
      }
    }

    // Get trending users (by follower count and recent activity)
    if (type === 'all' || type === 'users') {
      const { data: trendingUsers, error: usersError } = await supabase
        .from('user_profile')
        .select('id, name, username, avatar_url, level, followers_count, following_count')
        .order('followers_count', { ascending: false })
        .limit(limit);

      if (usersError) {
        console.error('[Discover Trending API] Error fetching users:', usersError);
      } else {
        // Check which users the current user is following
        if (trendingUsers && trendingUsers.length > 0) {
          const userIds = trendingUsers.map((u) => u.id);
          const { data: following } = await supabase
            .from('follow')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', userIds);

          const followingSet = new Set((following || []).map((f) => f.following_id));

          trendingUsers.forEach((u: any) => {
            u.is_following = followingSet.has(u.id);
          });
        }

        response.trending_users = trendingUsers || [];
      }
    }

    return successResponse(response);
  } catch (error) {
    console.error('[Discover Trending API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
