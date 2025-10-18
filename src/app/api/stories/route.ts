/**
 * Stories API endpoint
 * POST /api/stories - Create a story
 * GET /api/stories - Get active stories (not expired)
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const createStorySchema = z.object({
  media_urls: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
    caption: z.string().max(500).optional(),
  })).min(1).max(10),
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
    const validation = createStorySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { media_urls } = validation.data;

    // Create story (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: story, error: storyError } = await supabase
      .from('story')
      .insert({
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (storyError) {
      console.error('[Stories API] Error creating story:', storyError);
      return serverErrorResponse('Failed to create story', storyError);
    }

    // Insert story media
    const mediaInserts = media_urls.map((media, index) => ({
      story_id: story.id,
      media_url: media.url,
      media_type: media.type,
      caption: media.caption || null,
      order_index: index,
    }));

    const { error: mediaError } = await supabase
      .from('story_media')
      .insert(mediaInserts);

    if (mediaError) {
      console.error('[Stories API] Error adding story media:', mediaError);
      // Rollback: delete the story
      await supabase.from('story').delete().eq('id', story.id);
      return serverErrorResponse('Failed to add story media', mediaError);
    }

    // Get complete story with media
    const { data: completeStory } = await supabase
      .from('story')
      .select(
        `
        *,
        media:story_media (
          id,
          media_url,
          media_type,
          caption,
          order_index
        ),
        author:user_profile!user_id (
          id,
          name,
          username,
          avatar_url,
          level
        )
      `
      )
      .eq('id', story.id)
      .single();

    return successResponse(
      {
        story: completeStory,
      },
      'Story created successfully',
      201
    );
  } catch (error) {
    console.error('[Stories API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function GET(_request: Request) {
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

    // Get active stories (not expired)
    // Include: own stories + stories from people you follow
    const { data: stories, error: storiesError } = await supabase
      .from('story')
      .select(
        `
        *,
        media:story_media (
          id,
          media_url,
          media_type,
          caption,
          order_index
        ),
        author:user_profile!user_id (
          id,
          name,
          username,
          avatar_url,
          level
        )
      `
      )
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesError) {
      console.error('[Stories API] Error fetching stories:', storiesError);
      return serverErrorResponse('Failed to fetch stories', storiesError);
    }

    // Get viewed status for each story
    if (stories && stories.length > 0) {
      const storyIds = stories.map((s) => s.id);
      const { data: views } = await supabase
        .from('story_view')
        .select('story_id')
        .in('story_id', storyIds)
        .eq('viewer_id', user.id);

      const viewedSet = new Set((views || []).map((v) => v.story_id));

      stories.forEach((story) => {
        story.has_viewed = viewedSet.has(story.id);
      });
    }

    // Group stories by user
    const storiesByUser = (stories || []).reduce((acc: any, story: any) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.author,
          stories: [],
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    return successResponse({
      stories_by_user: Object.values(storiesByUser),
      total: stories?.length || 0,
    });
  } catch (error) {
    console.error('[Stories API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
