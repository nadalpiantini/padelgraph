/**
 * Discover Posts API endpoint
 * GET /api/discover/posts - Get trending posts
 */
import { createClient } from '@/lib/supabase/server';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = await createClient();

    // Try RPC function first
    const { data: trendingData, error: rpcError } = await supabase.rpc(
      'padelgraph_trending_posts',
      {
        p_window: '3 days',
        p_limit: 50,
      }
    );

    if (rpcError) {
      console.log('[Discover Posts API] RPC not available, using fallback');
      // Fallback: recent popular posts
      const { data: fallbackData } = await supabase
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
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .limit(50);

      return successResponse(fallbackData || []);
    }

    // Get full post data with author info
    if (trendingData && trendingData.length > 0) {
      const postIds = trendingData.map((p: any) => p.id);
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

      // Merge with scores
      const postsWithScores = posts?.map((post) => {
        const scored = trendingData.find((t: any) => t.id === post.id);
        return { ...post, score: scored?.score };
      });

      return successResponse(postsWithScores || []);
    }

    return successResponse([]);
  } catch (error) {
    console.error('[Discover Posts API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
