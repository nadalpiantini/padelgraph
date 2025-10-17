/**
 * Social Graph Connection API endpoint
 * GET /api/graph/connection - Find connection path between two users
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { connectionQuerySchema } from '@/lib/validations/graph';

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
      target_user_id: searchParams.get('target_user_id'),
      max_depth: searchParams.get('max_depth'),
    };

    const validation = connectionQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { target_user_id, max_depth } = validation.data;

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('user_profile')
      .select('id, name')
      .eq('id', target_user_id)
      .single();

    if (targetError || !targetUser) {
      return errorResponse('Target user not found', undefined, 404);
    }

    // Use SQL function to find connection path (BFS with privacy)
    const { data: pathData, error: pathError } = await supabase.rpc('find_connection_path', {
      start_user_id: user.id,
      end_user_id: target_user_id,
      max_depth,
    });

    if (pathError) {
      console.error('[Graph Connection API] Error finding path:', pathError);
      return serverErrorResponse('Failed to find connection path', pathError);
    }

    // If no path found
    if (!pathData || pathData.length === 0) {
      return successResponse({
        connected: false,
        degrees_of_separation: null,
        path: [],
        message: `No connection found within ${max_depth} degrees`,
      });
    }

    // Fetch user details for each user in path
    const userIds = pathData.map((node: { user_id: string }) => node.user_id);
    const { data: usersData } = await supabase
      .from('user_profile')
      .select('id, name, level, city')
      .in('id', userIds);

    // Build enriched path with user details
    const enrichedPath = pathData.map((node: { user_id: string; connection_type?: string }) => {
      const userInfo = usersData?.find((u) => u.id === node.user_id);
      return {
        user_id: node.user_id,
        name: userInfo?.name,
        level: userInfo?.level,
        city: userInfo?.city,
        connection_type: node.connection_type,
      };
    });

    return successResponse({
      connected: true,
      degrees_of_separation: pathData.length - 1, // Subtract 1 because path includes both endpoints
      path: enrichedPath,
      source_user_id: user.id,
      target_user_id,
    });
  } catch (error) {
    console.error('[Graph Connection API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
