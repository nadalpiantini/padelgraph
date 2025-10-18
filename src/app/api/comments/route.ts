/**
 * Comments API endpoint
 * POST /api/comments - Create a top-level comment
 * GET /api/comments?post_id={id} - Get all comments for a post
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

const createCommentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
});

const getCommentsSchema = z.object({
  post_id: z.string().uuid(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
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
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    const { post_id, content, parent_id } = validation.data;

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id, user_id, visibility, org_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return notFoundResponse('Post');
    }

    // If parent_id provided, verify it exists and belongs to same post
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('post_comment')
        .select('id, post_id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentComment) {
        return errorResponse('Parent comment not found', undefined, 404);
      }

      if (parentComment.post_id !== post_id) {
        return errorResponse('Parent comment does not belong to this post', undefined, 400);
      }
    }

    // Create comment
    const { data: newComment, error: createError } = await supabase
      .from('post_comment')
      .insert({
        post_id,
        user_id: user.id,
        content,
        parent_id: parent_id || null,
      })
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          username,
          avatar_url,
          level
        )
      `
      )
      .single();

    if (createError) {
      console.error('[Comments API] Error creating comment:', createError);
      return serverErrorResponse('Failed to create comment', createError);
    }

    // Create notification for post author (if not commenting on own post)
    if (post.user_id !== user.id) {
      await supabase.from('notification').insert({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'comment',
        post_id,
        comment_id: newComment.id,
      });
    }

    // If replying to a comment, notify the comment author
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('post_comment')
        .select('user_id')
        .eq('id', parent_id)
        .single();

      if (parentComment && parentComment.user_id !== user.id) {
        await supabase.from('notification').insert({
          user_id: parentComment.user_id,
          actor_id: user.id,
          type: 'comment',
          post_id,
          comment_id: newComment.id,
        });
      }
    }

    return successResponse(
      {
        comment: newComment,
      },
      'Comment created successfully',
      201
    );
  } catch (error) {
    console.error('[Comments API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user (optional for public posts)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      post_id: searchParams.get('post_id'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = getCommentsSchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { post_id, limit, offset } = validation.data;

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id, visibility, user_id, org_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return notFoundResponse('Post');
    }

    // Get all comments for this post (with author info)
    const { data: comments, error: commentsError, count } = await supabase
      .from('post_comment')
      .select(
        `
        *,
        author:user_profile!user_id (
          id,
          name,
          username,
          avatar_url,
          level
        )
      `,
        { count: 'exact' }
      )
      .eq('post_id', post_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      console.error('[Comments API] Error fetching comments:', commentsError);
      return serverErrorResponse('Failed to fetch comments', commentsError);
    }

    // Build comment tree (group by parent_id)
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments
    (comments || []).forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree
    (comments || []).forEach((comment) => {
      const node = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(node);
        }
      } else {
        rootComments.push(node);
      }
    });

    // If user is authenticated, check which comments they've liked
    if (user) {
      const commentIds = Array.from(commentMap.keys());
      const { data: likes } = await supabase
        .from('comment_like')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', user.id);

      const likedSet = new Set((likes || []).map((l) => l.comment_id));

      commentMap.forEach((comment) => {
        comment.has_liked = likedSet.has(comment.id);
      });
    }

    return successResponse({
      comments: rootComments,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Comments API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
