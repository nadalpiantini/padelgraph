/**
 * Usage Limits Middleware - Simplified Tests
 * Focus on critical functionality first
 */

import { describe, it, expect, vi } from 'vitest';
import {
  canCreateTournament,
  canCreateTeam,
  canCreateBooking,
} from '@/lib/middleware/usage-limits';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'subscription') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { plan: 'free', status: 'active' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'usage_log') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

describe('Usage Limits - Critical Tests', () => {
  const mockUserId = 'test-user-123';

  it('should allow FREE user to create tournament when under limit', async () => {
    const result = await canCreateTournament(mockUserId);
    
    expect(result).toMatchObject({
      allowed: true,
      limit: 10,
      remaining: 10,
    });
  });

  it('should allow FREE user to create team when under limit', async () => {
    const result = await canCreateTeam(mockUserId);
    
    expect(result).toMatchObject({
      allowed: true,
      limit: 5,
      remaining: 5,
    });
  });

  it('should allow FREE user to create booking when under limit', async () => {
    const result = await canCreateBooking(mockUserId);
    
    expect(result).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 2,
    });
  });
});
