/**
 * Social Graph Stats API endpoint
 * GET /api/graph/stats - Get user's graph statistics
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { statsQuerySchema } from '@/lib/validations/graph';

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
      include_breakdown: searchParams.get('include_breakdown'),
    };

    const validation = statsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { include_breakdown } = validation.data;

    // Get total connections count
    const { count: totalConnections } = await supabase
      .from('social_connection')
      .select('*', { count: 'exact', head: true })
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    // Get connections breakdown by type if requested
    let connectionsByType = {};
    if (include_breakdown) {
      const { data: connections } = await supabase
        .from('social_connection')
        .select('connection_type')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (connections) {
        connectionsByType = connections.reduce(
          (acc: { [key: string]: number }, conn: { connection_type: string }) => {
            acc[conn.connection_type] = (acc[conn.connection_type] || 0) + 1;
            return acc;
          },
          {}
        );
      }
    }

    // Get strongest connections (top 5)
    const { data: strongestConnections } = await supabase
      .from('social_connection')
      .select('user_a, user_b, connection_type, strength')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('strength', { ascending: false })
      .limit(5);

    // Calculate average connection strength
    const totalStrength =
      strongestConnections?.reduce((sum: number, conn: { strength: number }) => sum + conn.strength, 0) || 0;
    const avgStrength = totalConnections ? totalStrength / totalConnections : 0;

    // Get user IDs from strongest connections
    const strongestUserIds =
      strongestConnections?.map((conn: { user_a: string; user_b: string }) =>
        conn.user_a === user.id ? conn.user_b : conn.user_a
      ) || [];

    // Fetch user details for strongest connections
    let strongestUsers: Array<{
      user_id: string;
      name?: string;
      level?: string;
      connection_type: string;
      strength: number;
    }> = [];
    if (strongestUserIds.length > 0) {
      const { data } = await supabase
        .from('user_profile')
        .select('id, name, level')
        .in('id', strongestUserIds);

      if (data) {
        strongestUsers =
          strongestConnections?.map(
            (conn: { user_a: string; user_b: string; connection_type: string; strength: number }) => {
              const userId = conn.user_a === user.id ? conn.user_b : conn.user_a;
              const userInfo = data.find((u) => u.id === userId);
              return {
                user_id: userId,
                name: userInfo?.name,
                level: userInfo?.level,
                connection_type: conn.connection_type,
                strength: conn.strength,
              };
            }
          ) || [];
      }
    }

    return successResponse({
      total_connections: totalConnections || 0,
      connections_by_type: include_breakdown ? connectionsByType : undefined,
      average_strength: Math.round(avgStrength * 100) / 100,
      strongest_connections: strongestUsers,
      network_health: totalConnections
        ? totalConnections > 10
          ? 'strong'
          : totalConnections > 5
            ? 'moderate'
            : 'building'
        : 'new',
    });
  } catch (error) {
    console.error('[Graph Stats API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
