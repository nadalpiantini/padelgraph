/**
 * Admin API Tests
 * Tests for admin courts, availability, and dashboard endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as DashboardGET } from '@/app/api/admin/dashboard/route';
import { POST as CourtsPOST } from '@/app/api/courts/route';
import { PUT as CourtPUT, DELETE as CourtDELETE } from '@/app/api/courts/[id]/route';
import { POST as AvailabilityPOST } from '@/app/api/availability/route';
import {
  PUT as AvailabilityPUT,
  DELETE as AvailabilityDELETE,
} from '@/app/api/availability/[id]/route';
import { mockUser, mockCourt, mockOrganization, resetMocks } from '../setup';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  checkOrgAdmin: vi.fn(),
  checkOrgOwner: vi.fn(),
  checkCourtAccess: vi.fn(),
}));

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});

const mockAvailability = {
  id: '523e4567-e89b-12d3-a456-426614174000',
  court_id: mockCourt.id,
  day_of_week: 1,
  start_time: '09:00:00',
  end_time: '18:00:00',
  price_per_hour: 50,
  active: true,
};

describe('Admin API - Dashboard', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should return dashboard metrics for admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkOrgAdmin } = await import('@/lib/permissions');

    (checkOrgAdmin as any).mockResolvedValue(true);

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
              data: { count: 5, active_count: 4 },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { count: 0, revenue: 0 },
            error: null,
          }),
        };
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(
      `http://localhost:3000/api/admin/dashboard?org_id=${mockOrganization.id}`
    );

    const response = await DashboardGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(checkOrgAdmin).toHaveBeenCalledWith(mockUser.id, mockOrganization.id);
  });

  it('should return 403 when user is not admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkOrgAdmin } = await import('@/lib/permissions');

    (checkOrgAdmin as any).mockResolvedValue(false);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(
      `http://localhost:3000/api/admin/dashboard?org_id=${mockOrganization.id}`
    );

    const response = await DashboardGET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('permissions');
  });
});

describe('Admin API - Courts Management', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should create court as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkOrgAdmin } = await import('@/lib/permissions');

    (checkOrgAdmin as any).mockResolvedValue(true);

    const courtData = {
      org_id: mockOrganization.id,
      name: 'New Court',
      surface_type: 'grass',
      indoor: false,
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockCourt, ...courtData },
          error: null,
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courtData),
    });

    const response = await CourtsPOST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.name).toBe('New Court');
    expect(checkOrgAdmin).toHaveBeenCalled();
  });

  it('should update court as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkCourtAccess } = await import('@/lib/permissions');

    (checkCourtAccess as any).mockResolvedValue(mockCourt);

    const updateData = { name: 'Updated Court' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockCourt, ...updateData },
          error: null,
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/courts/${mockCourt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await CourtPUT(request, { params: { id: mockCourt.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.name).toBe('Updated Court');
  });

  it('should soft delete court as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkCourtAccess } = await import('@/lib/permissions');

    (checkCourtAccess as any).mockResolvedValue(mockCourt);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockCourt, active: false },
          error: null,
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/courts/${mockCourt.id}`, {
      method: 'DELETE',
    });

    const response = await CourtDELETE(request, { params: { id: mockCourt.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.active).toBe(false);
    expect(data.message).toContain('deactivated');
  });
});

describe('Admin API - Availability Management', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should create availability slot as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkCourtAccess } = await import('@/lib/permissions');

    (checkCourtAccess as any).mockResolvedValue(mockCourt);

    const availabilityData = {
      court_id: mockCourt.id,
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '18:00:00',
      price_per_hour: 50,
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAvailability,
          error: null,
        }),
      })),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(availabilityData),
    });

    const response = await AvailabilityPOST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.price_per_hour).toBe(50);
    expect(checkCourtAccess).toHaveBeenCalled();
  });

  it('should update availability slot as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkOrgAdmin } = await import('@/lib/permissions');

    (checkOrgAdmin as any).mockResolvedValue(true);

    const updateData = { price_per_hour: 60 };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'availability') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...mockAvailability, ...updateData },
              error: null,
            }),
          };
        }
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
        return {};
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/availability/${mockAvailability.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const response = await AvailabilityPUT(request, { params: { id: mockAvailability.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.price_per_hour).toBe(60);
  });

  it('should delete availability slot as admin', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { checkOrgAdmin } = await import('@/lib/permissions');

    (checkOrgAdmin as any).mockResolvedValue(true);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'availability') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAvailability,
              error: null,
            }),
          };
        }
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
        return {};
      }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const request = new Request(`http://localhost:3000/api/availability/${mockAvailability.id}`, {
      method: 'DELETE',
    });

    const response = await AvailabilityDELETE(request, { params: { id: mockAvailability.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('deleted');
  });
});
