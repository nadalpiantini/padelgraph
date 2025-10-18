/**
 * Graph Nodes API endpoint
 * GET /api/graph/nodes - Get all nodes and edges for Six Degrees graph
 */
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

export async function GET() {
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

    // Get all player nodes (from user_profile)
    const { data: players, error: playersError } = await supabase
      .from('user_profile')
      .select('id, name, username, level, avatar_url')
      .limit(100);

    if (playersError) {
      console.error('[Graph Nodes API] Error fetching players:', playersError);
      return serverErrorResponse('Failed to fetch players', playersError);
    }

    // Get all edges
    const { data: edges, error: edgesError } = await supabase
      .from('graph_edge')
      .select('src, dst, kind')
      .limit(500);

    if (edgesError) {
      console.log('[Graph Nodes API] graph_edge table not available, using empty edges');
    }

    // Format nodes for force graph
    const nodes = (players || []).map((p) => ({
      id: p.id,
      label: p.name || p.username,
      type: 'player',
      level: p.level,
      avatar_url: p.avatar_url,
    }));

    // Format links for force graph
    const links = (edges || []).map((e) => ({
      source: e.src,
      target: e.dst,
      kind: e.kind,
    }));

    return successResponse({
      nodes,
      links,
    });
  } catch (error) {
    console.error('[Graph Nodes API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
