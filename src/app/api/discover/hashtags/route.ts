/**
 * Discover Hashtags API endpoint
 * GET /api/discover/hashtags - Get trending hashtags
 */
import { createClient } from '@/lib/supabase/server';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = await createClient();

    // Try to fetch from materialized view
    const { data, error } = await supabase
      .from('mv_trending_hashtags')
      .select('*')
      .limit(30);

    if (error) {
      console.log('[Hashtags API] MV not available, using fallback');
      // Fallback: regular hashtag table
      const { data: fallbackData } = await supabase
        .from('hashtag')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(30);

      return successResponse(fallbackData || []);
    }

    return successResponse(data || []);
  } catch (error) {
    console.error('[Hashtags API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
