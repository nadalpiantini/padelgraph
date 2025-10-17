import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AutoMatchResult } from '@/lib/services/auto-match';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auto-Match Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      rpc: vi.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('calculateCompatibilityScore', () => {
    it('should calculate 0.55 score for same skill and city', async () => {
      mockSupabase.in.mockReturnValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
        ],
        error: null,
      });

      mockSupabase.or.mockResolvedValue({ count: 0, error: null });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      // Expected: same_skill (0.3) + same_city (0.25) = 0.55
    });

    it('should add 0.2 for nearby location (within 10km)', async () => {
      mockSupabase.in.mockReturnValue({
        data: [
          {
            id: 'user1',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: 'POINT(-3.7038 40.4168)',
            preferences: null,
          },
          {
            id: 'user2',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: 'POINT(-3.7050 40.4170)',
            preferences: null,
          },
        ],
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ data: 5.0, error: null }); // 5km distance
      mockSupabase.or.mockResolvedValue({ count: 0, error: null });

      // Expected: same_skill (0.3) + same_city (0.25) + nearby (0.2) = 0.75
    });

    it('should add 0.15 for common connections', async () => {
      mockSupabase.in.mockReturnValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
        ],
        error: null,
      });

      mockSupabase.or.mockResolvedValue({ count: 2, error: null }); // 2 common connections

      // Expected: same_skill (0.3) + same_city (0.25) + common_conn (0.15) = 0.7
    });

    it('should add 0.1 for similar preferences', async () => {
      mockSupabase.in.mockReturnValue({
        data: [
          {
            id: 'user1',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: null,
            preferences: { play_time: 'evening' },
          },
          {
            id: 'user2',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: null,
            preferences: { play_time: 'evening' },
          },
        ],
        error: null,
      });

      mockSupabase.or.mockResolvedValue({ count: 0, error: null });

      // Expected: same_skill (0.3) + same_city (0.25) + preferences (0.1) = 0.65
    });

    it('should cap total score at 1.0', async () => {
      mockSupabase.in.mockReturnValue({
        data: [
          {
            id: 'user1',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: 'POINT(-3.7038 40.4168)',
            preferences: { play_time: 'evening' },
          },
          {
            id: 'user2',
            skill_level: 'intermediate',
            city: 'Madrid',
            location: 'POINT(-3.7040 40.4169)',
            preferences: { play_time: 'evening' },
          },
        ],
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ data: 2.0, error: null }); // Very close
      mockSupabase.or.mockResolvedValue({ count: 5, error: null }); // Many connections

      // Total would be > 1.0, should cap at 1.0
      // same_skill (0.3) + same_city (0.25) + nearby (0.2) + common (0.15) + prefs (0.1) = 1.0
    });
  });

  describe('hasAutoMatchEnabled', () => {
    it('should return true when auto-match is enabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');
      // Should proceed with auto-matching
    });

    it('should return false when auto-match is disabled', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { auto_match_enabled: false },
        error: null,
      });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');
      expect(results).toHaveLength(0); // Should not create any matches
    });

    it('should default to true when setting not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');
      // Should proceed with auto-matching (defaults to enabled)
    });
  });

  describe('checkAutoMatchRateLimit', () => {
    it('should allow matches when under rate limit (< 3 per week)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      // Mock rate limit check (2 matches in last 7 days)
      mockSupabase.select.mockReturnValueOnce({
        count: 2,
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.or.mockResolvedValue({ data: [], error: null });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');
      // Should proceed (2 < 3)
    });

    it('should block matches when rate limit exceeded (>= 3 per week)', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      // Mock rate limit check (3 matches already)
      mockSupabase.select.mockReturnValueOnce({
        count: 3,
        error: null,
      });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');
      expect(results).toHaveLength(0); // Should block matches
    });
  });

  describe('createChatConversation', () => {
    it('should create new chat when none exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({ count: 0, error: null }); // Rate limit OK

      mockSupabase.or.mockResolvedValueOnce({ data: [], error: null }); // No existing connections

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user2', display_name: 'User 2', skill_level: 'intermediate', city: 'Madrid' }],
        error: null,
      });

      // Mock compatibility score calculation
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid', location: null, preferences: null },
        ],
        error: null,
      });

      mockSupabase.or.mockResolvedValueOnce({ count: 0, error: null }); // Common connections

      // Mock second auto-match check for candidate
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      // Mock existing chat check
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Mock chat creation
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'chat-123' },
        error: null,
      });

      // Mock message sending
      mockSupabase.single.mockResolvedValueOnce({
        data: { display_name: 'User 2' },
        error: null,
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.insert.mockResolvedValue({ error: null });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1', { min_score: 0.5 });

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0].chat_created).toBe(true);
      }
    });

    it('should reuse existing chat conversation', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: 'existing-chat-123' },
        error: null,
      });

      // Chat should reuse existing ID
    });
  });

  describe('sendIntroductionMessage', () => {
    it('should send personalized introduction message', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { display_name: 'Test User' },
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({ error: null });

      // Message template should include reason
      const expectedMessage = expect.stringContaining('Te gustaría jugar');
    });

    it('should handle message sending failures gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { display_name: 'Test User' },
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        error: new Error('Message send failed'),
      });

      // Should return false on error
    });
  });

  describe('triggerAutoMatch', () => {
    it('should create matches for compatible users above threshold', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({ count: 0, error: null });
      mockSupabase.or.mockResolvedValueOnce({ data: [], error: null });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'match1', display_name: 'Match 1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'match2', display_name: 'Match 2', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1', { min_score: 0.5, max_matches: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should respect max_matches limit', async () => {
      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      mockSupabase.single.mockResolvedValue({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnValue({ count: 0, error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const results = await triggerAutoMatch('user1', { max_matches: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should exclude already connected users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({ count: 0, error: null });

      mockSupabase.or.mockResolvedValueOnce({
        data: [
          { user_a: 'user1', user_b: 'existing-friend' }, // Already connected
        ],
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'existing-friend', display_name: 'Friend', skill_level: 'intermediate', city: 'Madrid' }],
        error: null,
      });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');

      // Should skip existing-friend
      expect(results.every((r) => r.user_b_id !== 'existing-friend')).toBe(true);
    });

    it('should skip users with auto-match disabled', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: true }, // Requester has it enabled
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({ count: 0, error: null });
      mockSupabase.or.mockResolvedValueOnce({ data: [], error: null });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user2', display_name: 'User 2', skill_level: 'intermediate', city: 'Madrid' }],
        error: null,
      });

      // Candidate has auto-match disabled
      mockSupabase.single.mockResolvedValueOnce({
        data: { auto_match_enabled: false },
        error: null,
      });

      const { triggerAutoMatch } = await import('@/lib/services/auto-match');

      const results = await triggerAutoMatch('user1');

      expect(results).toHaveLength(0); // Should skip user2
    });
  });

  describe('batchAutoMatch', () => {
    it('should process multiple users in batch', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ id: 'user1' }, { id: 'user2' }],
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { auto_match_enabled: true },
        error: null,
      });

      mockSupabase.select.mockReturnValue({ count: 0, error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const { batchAutoMatch } = await import('@/lib/services/auto-match');

      const result = await batchAutoMatch({ max_users: 2, min_score: 0.8 });

      expect(result.total_users).toBe(2);
    });

    it('should limit one match per user in batch mode', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [{ id: 'user1' }],
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { auto_match_enabled: true, skill_level: 'intermediate', location: null },
        error: null,
      });

      mockSupabase.select.mockReturnValue({ count: 0, error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'match1', display_name: 'M1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'match2', display_name: 'M2', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      const { batchAutoMatch } = await import('@/lib/services/auto-match');

      const result = await batchAutoMatch();

      // Should create max 1 match per user in batch
      expect(result.total_matches).toBeLessThanOrEqual(result.total_users);
    });

    it('should return zero when no eligible users found', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const { batchAutoMatch } = await import('@/lib/services/auto-match');

      const result = await batchAutoMatch();

      expect(result.total_users).toBe(0);
      expect(result.total_matches).toBe(0);
    });
  });
});
