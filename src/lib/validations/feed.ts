/**
 * Validation schemas for feed endpoints
 */
import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  media_urls: z.array(z.string().url()).max(10, 'Maximum 10 media files').optional(),
  visibility: z.enum(['public', 'friends', 'private', 'org']).default('public'),
  org_id: z.string().uuid().optional().nullable(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
});

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(), // Filter by specific user
  org_id: z.string().uuid().optional(), // Filter by organization
});

export const postIdSchema = z.object({
  id: z.string().uuid('Invalid post ID'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type PostIdInput = z.infer<typeof postIdSchema>;
