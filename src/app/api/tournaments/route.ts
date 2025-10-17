/**
 * Tournament API - List & Create
 *
 * GET /api/tournaments - List tournaments with filters
 * POST /api/tournaments - Create new tournament
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import {
  createTournamentSchema,
  tournamentQuerySchema,
} from '@/lib/validations/tournament';
import { notifyTournamentPublished } from '@/lib/notifications/tournament';

/**
 * GET /api/tournaments
 *
 * List tournaments with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      org_id: searchParams.get('org_id') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      starts_after: searchParams.get('starts_after') || undefined,
      starts_before: searchParams.get('starts_before') || undefined,
      nearby: searchParams.get('nearby') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const validated = tournamentQuerySchema.parse(queryData);

    // Build query
    let query = supabase.from('tournament').select('*', { count: 'exact' });

    // Apply filters
    if (validated.org_id) {
      query = query.eq('org_id', validated.org_id);
    }

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    if (validated.type) {
      query = query.eq('type', validated.type);
    }

    if (validated.starts_after) {
      query = query.gte('starts_at', validated.starts_after);
    }

    if (validated.starts_before) {
      query = query.lte('starts_at', validated.starts_before);
    }

    // TODO: Implement nearby filter with PostGIS
    // if (validated.nearby) {
    //   const [lat, lng, radius] = validated.nearby.split(',').map(Number);
    //   // Use PostGIS earth_distance or similar
    // }

    // Pagination
    const offset = (validated.page - 1) * validated.limit;
    query = query.range(offset, offset + validated.limit - 1);

    // Order by start date
    query = query.order('starts_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tournaments:', error);
      return ApiResponse.error('Failed to fetch tournaments', 500);
    }

    return ApiResponse.success({
      tournaments: data,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / validated.limit),
      },
    });
  } catch (error) {
    console.error('Tournament list error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}

/**
 * POST /api/tournaments
 *
 * Create new tournament
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = createTournamentSchema.parse(body);

    // Check user is admin of an organization
    const { data: membership, error: membershipError } = await supabase
      .from('org_member')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (membershipError || !membership) {
      return ApiResponse.error(
        'Must be organization owner or admin to create tournaments',
        403
      );
    }

    // Create tournament
    const { data: tournament, error } = await supabase
      .from('tournament')
      .insert({
        org_id: membership.org_id,
        created_by: user.id,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      return ApiResponse.error('Failed to create tournament', 500);
    }

    // Send tournament published notification if status is published
    if (tournament.status === 'published') {
      try {
        await notifyTournamentPublished(tournament.id);
      } catch (notifError) {
        console.error('[Notification] Tournament published failed:', notifError);
      }
    }

    return ApiResponse.success(
      { tournament },
      'Tournament created successfully',
      201
    );
  } catch (error) {
    console.error('Tournament creation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
