/**
 * User Follow Stats API endpoint
 * GET /api/users/[id]/follow-stats - Get follower/following counts
 */
import { createClient } from '@/lib/supabase/server';
import { serverErrorResponse, successResponse } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Try RPC function
    const { data: stats, error: rpcError } = await supabase.rpc(
      'padelgraph_profile_counts',
      {
        p_user: id,
      }
    );

    if (rpcError || !stats || stats.length === 0) {
      console.log('[Follow Stats API] RPC not available, using fallback');
      // Fallback: manual counts
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase
          .from('follow')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', id),
        supabase
          .from('follow')
          .select('following_id', { count: 'exact', head: true })
          .eq('follower_id', id),
        supabase
          .from('post')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id),
      ]);

      return successResponse({
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        posts: postsRes.count || 0,
      });
    }

    return successResponse(stats[0]);
  } catch (error) {
    console.error('[Follow Stats API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
