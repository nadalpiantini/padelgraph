/**
 * Discovery Bookmark API endpoint
 * POST /api/discover/bookmark - Save a discovery item
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { bookmarkSchema } from '@/lib/validations/discovery';

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
    const validation = bookmarkSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { entity_type, entity_id, notes } = validation.data;

    // Create recommendation entry as a bookmark
    // Using the recommendation table with high score to indicate it's a saved item
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('recommendation')
      .insert({
        user_id: user.id,
        recommended_type: entity_type,
        recommended_id: entity_id,
        score: 1.0, // Max score for bookmarked items
        reason: notes || `Bookmarked ${entity_type}`,
        shown: true,
        clicked: true,
      })
      .select()
      .single();

    if (bookmarkError) {
      // Check if already bookmarked (would cause unique constraint error)
      if (bookmarkError.code === '23505') {
        return errorResponse('This item is already bookmarked', undefined, 409);
      }

      console.error('[Discovery Bookmark API] Error creating bookmark:', bookmarkError);
      return serverErrorResponse('Failed to create bookmark', bookmarkError);
    }

    return successResponse(bookmark, 'Bookmark created successfully', 201);
  } catch (error) {
    console.error('[Discovery Bookmark API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
