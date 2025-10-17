/**
 * Booking API Tests
 * Tests for POST and GET /api/bookings endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bookings/route';
import { mockUser, mockCourt, mockOrganization, resetMocks } from '../setup';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockBooking = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  court_id: mockCourt.id,
  user_id: mockUser.id,
  org_id: mockOrganization.id,
  start_at: '2025-10-17T10:00:00Z',
  end_at: '2025-10-17T11:00:00Z',
  total_price: 50,
  notes: 'Test booking',
  status: 'pending',
  created_at: '2025-10-16T00:00:00Z',
};

describe('Booking API - POST /api/bookings', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should create booking with valid data', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const bookingData = {
      court_id: mockCourt.id,
      start_at: '2025-10-17T10:00:00Z',
      end_at: '2025-10-17T11:00:00Z',
      notes: 'Test booking',
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'court') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockCourt,
              error: null,
            }),
          };
        }
        if (table === 'availability') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { price_per_hour: 50 },
              error: null,
            }),
          };
        }
        if (table === 'booking') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...mockBooking, court: mockCourt, user: mockUser },
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
    expect(data.message).toBe('Booking created successfully');
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

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        court_id: mockCourt.id,
        start_at: '2025-10-17T10:00:00Z',
        end_at: '2025-10-17T11:00:00Z',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 404 when court not found', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        court_id: mockCourt.id,
        start_at: '2025-10-17T10:00:00Z',
        end_at: '2025-10-17T11:00:00Z',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Court not found');
  });

  it('should return 400 when court is not active', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const inactiveCourt = { ...mockCourt, active: false };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: inactiveCourt,
          error: null,
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        court_id: mockCourt.id,
        start_at: '2025-10-17T10:00:00Z',
        end_at: '2025-10-17T11:00:00Z',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Court is not active');
  });

  it('should return 409 on booking conflict', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const conflictError = new Error('Booking conflict detected');

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'court') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockCourt,
              error: null,
            }),
          };
        }
        if (table === 'availability') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { price_per_hour: 50 },
              error: null,
            }),
          };
        }
        if (table === 'booking') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: conflictError,
            }),
          };
        }
        return {};
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        court_id: mockCourt.id,
        start_at: '2025-10-17T10:00:00Z',
        end_at: '2025-10-17T11:00:00Z',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('This time slot is already booked');
  });
});

describe('Booking API - GET /api/bookings', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should return user bookings', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockBookings = [mockBooking];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockBookings,
        error: null,
        count: 1,
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

    const request = new Request('http://localhost:3000/api/bookings?limit=10&offset=0');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.bookings).toEqual(mockBookings);
    expect(data.data.total).toBe(1);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });

  it('should filter by status', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockBooking],
        error: null,
        count: 1,
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

    const request = new Request(
      'http://localhost:3000/api/bookings?status=pending&limit=10&offset=0'
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending');
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

    const request = new Request('http://localhost:3000/api/bookings?limit=10&offset=0');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });

  it('should return 400 with invalid query parameters', async () => {
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

    const request = new Request('http://localhost:3000/api/bookings?limit=invalid');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid query parameters');
  });
});
