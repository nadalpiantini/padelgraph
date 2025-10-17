/**
 * Feed API Tests
 * Tests for GET /api/feed endpoint
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/feed/route';
import { mockUser, resetMocks } from '../setup';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockPost = {
  id: '623e4567-e89b-12d3-a456-426614174000',
  user_id: mockUser.id,
  org_id: null,
  content: 'Test post content',
  media_urls: [],
  visibility: 'public',
  created_at: '2025-10-16T00:00:00Z',
  updated_at: '2025-10-16T00:00:00Z',
  author: {
    id: mockUser.id,
    name: 'Test User',
    avatar_url: null,
    level: 5.0,
  },
};

describe('Feed API - GET /api/feed', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should return feed posts when authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockPosts = [mockPost];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: mockPosts,
        error: null,
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => mockQuery),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/feed?limit=10');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.posts).toEqual(mockPosts);
    expect(data.data.hasMore).toBe(false);
    expect(mockQuery.or).toHaveBeenCalledWith(`visibility.eq.public,user_id.eq.${mockUser.id}`);
  });

  it('should return 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
      from: vi.fn(),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/feed?limit=10');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should filter by user_id', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const targetUserId = '723e4567-e89b-12d3-a456-426614174000';

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockPost],
        error: null,
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => mockQuery),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/feed?user_id=${targetUserId}&limit=10`);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', targetUserId);
  });

  it('should handle cursor pagination', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const cursorId = '723e4567-e89b-12d3-a456-426614174000';

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [mockPost],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { created_at: '2025-10-16T00:00:00Z' },
        error: null,
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => mockQuery),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/feed?cursor=${cursorId}&limit=10`);

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery.lt).toHaveBeenCalledWith('created_at', '2025-10-16T00:00:00Z');
  });

  it('should return hasMore true when full page returned', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const limit = 10;
    const fullPagePosts = Array(limit)
      .fill(null)
      .map((_, i) => ({
        ...mockPost,
        id: `post-${i}`,
      }));

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: fullPagePosts,
        error: null,
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => mockQuery),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/feed?limit=${limit}`);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.hasMore).toBe(true);
    expect(data.data.nextCursor).toBe('post-9');
  });

  it('should return 400 with invalid limit parameter', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/feed?limit=invalid');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid query parameters');
  });

  it('should return 500 on database error', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const dbError = new Error('Database error');

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      }),
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => mockQuery),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/feed?limit=10');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch feed');
  });
});
