/**
 * Follow/Unfollow API endpoint
 * POST /api/follow - Follow a user
 * DELETE /api/follow - Unfollow a user
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const followSchema = z.object({
  following_id: z.string().uuid(),
});

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
    const validation = followSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { following_id } = validation.data;

    // Prevent self-follow
    if (following_id === user.id) {
      return errorResponse('You cannot follow yourself', undefined, 400);
    }

    // Check if user to follow exists
    const { data: userToFollow, error: userError } = await supabase
      .from('user_profile')
      .select('id, name, username')
      .eq('id', following_id)
      .single();

    if (userError || !userToFollow) {
      return notFoundResponse('User');
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follow')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .single();

    if (existingFollow) {
      return errorResponse('Already following this user', undefined, 409);
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from('follow')
      .insert({
        follower_id: user.id,
        following_id,
      });

    if (followError) {
      console.error('[Follow API] Error following user:', followError);
      return serverErrorResponse('Failed to follow user', followError);
    }

    // Create notification
    await supabase.from('notification').insert({
      user_id: following_id,
      actor_id: user.id,
      type: 'follow',
    });

    return successResponse(
      {
        following_id,
        user: userToFollow,
      },
      'User followed successfully',
      201
    );
  } catch (error) {
    console.error('[Follow API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function DELETE(request: Request) {
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
    const following_id = searchParams.get('following_id');

    if (!following_id) {
      return errorResponse('following_id is required', undefined, 400);
    }

    // Delete follow relationship
    const { error: unfollowError } = await supabase
      .from('follow')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id);

    if (unfollowError) {
      console.error('[Follow API] Error unfollowing user:', unfollowError);
      return serverErrorResponse('Failed to unfollow user', unfollowError);
    }

    return successResponse(
      {
        following_id,
      },
      'User unfollowed successfully'
    );
  } catch (error) {
    console.error('[Follow API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
