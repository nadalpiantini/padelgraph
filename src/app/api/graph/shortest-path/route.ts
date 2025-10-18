/**
 * Graph Shortest Path API endpoint
 * GET /api/graph/shortest-path?from={id}&to={id} - Get shortest path between two users
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return errorResponse('Both from and to parameters are required', undefined, 400);
    }

    // Try RPC function
    const { data: pathData, error: rpcError } = await supabase.rpc(
      'padelgraph_shortest_path',
      {
        p_from: from,
        p_to: to,
        p_max_depth: 6,
      }
    );

    if (rpcError) {
      console.log('[Shortest Path API] RPC not available, returning empty path');
      return successResponse({ path: [] });
    }

    // Extract node IDs from result
    const path = (pathData || []).map((row: any) => row.node);

    return successResponse({ path });
  } catch (error) {
    console.error('[Shortest Path API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
