/**
 * Usage Limits Middleware - Tests
 * Sprint 5 Phase 2 - Task #6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canCreateTournament,
  canCreateTeam,
  canCreateBooking,
  checkUsageLimit,
  incrementUsage,
  getUsageSummary,
} from '@/lib/middleware/usage-enforcement';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => {
    const mockSubscription = { plan: 'free', status: 'active' };
    const mockUsageCount = 0;

    return {
      from: vi.fn((table: string) => {
        if (table === 'subscription') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockSubscription,
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
                  gte: vi.fn().mockResolvedValue({
                    count: mockUsageCount,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }

        return {};
      }),
    };
  }),
}));

describe('Usage Limits Middleware', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canCreateTournament', () => {
    it('should allow FREE user to create tournament when under limit (0/10)', async () => {
      const result = await canCreateTournament(mockUserId);

      expect(result).toMatchObject({
        allowed: true,
        limit: 10,
        remaining: 10,
        current: 0,
      });
    });
  });

  describe('canCreateTeam', () => {
    it('should allow FREE user to create team when under limit (0/5)', async () => {
      const result = await canCreateTeam(mockUserId);

      expect(result).toMatchObject({
        allowed: true,
        limit: 5,
        remaining: 5,
        current: 0,
      });
    });
  });

  describe('canCreateBooking', () => {
    it('should allow FREE user to create booking when under limit (0/2)', async () => {
      const result = await canCreateBooking(mockUserId);

      expect(result).toMatchObject({
        allowed: true,
        limit: 2,
        remaining: 2,
        current: 0,
      });
    });
  });

  describe('checkUsageLimit', () => {
    it('should return correct structure for usage limit check', async () => {
      const result = await checkUsageLimit(mockUserId, 'tournament_created');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('current');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.limit).toBe('number');
    });
  });

  describe('getUsageSummary', () => {
    it('should return usage summary for all feature types', async () => {
      const summary = await getUsageSummary(mockUserId);

      expect(summary).toHaveProperty('tournaments');
      expect(summary).toHaveProperty('teams');
      expect(summary).toHaveProperty('bookings');

      expect(summary.tournaments).toHaveProperty('allowed');
      expect(summary.tournaments).toHaveProperty('limit');
      expect(summary.tournaments).toHaveProperty('remaining');

      expect(summary.teams).toHaveProperty('allowed');
      expect(summary.teams).toHaveProperty('limit');
      expect(summary.teams).toHaveProperty('remaining');

      expect(summary.bookings).toHaveProperty('allowed');
      expect(summary.bookings).toHaveProperty('limit');
      expect(summary.bookings).toHaveProperty('remaining');
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage without throwing error', async () => {
      await expect(
        incrementUsage(mockUserId, 'tournament_created', { tournament_id: 'test-123' })
      ).resolves.not.toThrow();
    });
  });
});
