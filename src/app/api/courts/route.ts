/**
 * Courts API endpoint
 * GET /api/courts - List courts with filters
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { courtsQuerySchema } from '@/lib/validations/booking';

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
      org_id: searchParams.get('org_id'),
      active: searchParams.get('active'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = courtsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { org_id, active, limit, offset } = validation.data;

    // Build query
    let query = supabase
      .from('court')
      .select(
        `
        *,
        organization:organization (
          id,
          name,
          slug
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    if (active !== undefined) {
      query = query.eq('active', active);
    }

    const { data: courts, error: courtsError, count } = await query;

    if (courtsError) {
      console.error('[Courts API] Error fetching courts:', courtsError);
      return serverErrorResponse('Failed to fetch courts', courtsError);
    }

    return successResponse({
      courts: courts || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Courts API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
