/**
 * Notifications API endpoint
 * GET /api/notifications - Get user's notifications
 * POST /api/notifications - Mark notifications as read
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unread_only = searchParams.get('unread_only') === 'true';

    // Build query
    let query = supabase
      .from('notification')
      .select(
        `
        *,
        actor:user_profile!actor_id (
          id,
          name,
          username,
          avatar_url,
          level
        ),
        post:post!post_id (
          id,
          content,
          media_urls
        ),
        comment:post_comment!comment_id (
          id,
          content
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unread_only) {
      query = query.eq('read', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error: notifError, count } = await query;

    if (notifError) {
      console.error('[Notifications API] Error fetching notifications:', notifError);
      return serverErrorResponse('Failed to fetch notifications', notifError);
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notification')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return successResponse({
      notifications: notifications || [],
      total: count || 0,
      unread_count: unreadCount || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function POST(request: Request) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = markReadSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { notification_ids } = validation.data;

    // Mark notifications as read
    const { error: updateError } = await supabase
      .from('notification')
      .update({ read: true })
      .in('id', notification_ids)
      .eq('user_id', user.id); // Ensure user owns these notifications

    if (updateError) {
      console.error('[Notifications API] Error marking as read:', updateError);
      return serverErrorResponse('Failed to mark notifications as read', updateError);
    }

    return successResponse(
      {
        marked_count: notification_ids.length,
      },
      'Notifications marked as read'
    );
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
