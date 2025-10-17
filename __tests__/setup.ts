/**
 * Test Setup and Utilities
 */
import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  })),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
};

// Mock user data
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  created_at: '2025-01-01T00:00:00Z',
};

// Mock profile data
export const mockProfile = {
  id: mockUser.id,
  email: mockUser.email,
  full_name: 'Test User',
  phone: '+1234567890',
  avatar_url: null,
  preferred_language: 'en',
  skill_level: 'intermediate',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// Mock organization data
export const mockOrganization = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  name: 'Test Club',
  owner_id: mockUser.id,
  created_at: '2025-01-01T00:00:00Z',
};

// Mock court data
export const mockCourt = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  org_id: mockOrganization.id,
  name: 'Court 1',
  surface_type: 'grass',
  indoor: false,
  active: true,
  created_at: '2025-01-01T00:00:00Z',
};

// Mock Next.js request/response
export const createMockRequest = (
  method: string,
  body?: any,
  headers?: Record<string, string>
) => {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
};

// Helper to parse JSON response
export const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
};
