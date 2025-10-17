/**
 * Profile API Tests
 * Tests for GET and PUT /api/profile endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '@/app/api/profile/route';
import { mockUser, mockProfile, resetMocks } from '../setup';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Profile API - GET /api/profile', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should return user profile when authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockProfile);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_profile');
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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 404 when profile not found', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Profile not found');
  });

  it('should return 500 on database error', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const dbError = new Error('Database error');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch profile');
  });
});

describe('Profile API - PUT /api/profile', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should update profile with valid data', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const updateData = {
      name: 'Updated Name',
      phone: '+1234567890',
      level: 5.5,
    };
    const updatedProfile = { ...mockProfile, ...updateData };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedProfile,
          error: null,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(updatedProfile);
    expect(data.message).toBe('Profile updated successfully');
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

    const request = new Request('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 400 with invalid phone format', async () => {
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

    const request = new Request('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: 'invalid-phone' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(data.details).toBeDefined();
  });

  it('should return 400 with invalid level range', async () => {
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

    const request = new Request('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 10.0 }), // Max is 7.0
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should return 500 on database update error', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const dbError = new Error('Update failed');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update profile');
  });
});
