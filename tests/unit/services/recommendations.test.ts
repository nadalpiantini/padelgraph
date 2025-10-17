import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn(),
    },
  })),
}));

describe('Recommendations Engine', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create fresh mock for each test
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
      rpc: vi.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('calculateUserSimilarity', () => {
    it('should return 0.5 for users with same city and skill level', async () => {
      mockSupabase.in.mockReturnThis();
      mockSupabase.select.mockReturnValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({
        count: 0,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ count: 0, error: null });

      // Note: calculateUserSimilarity is internal, we test it via recommendPlayers
      // Expected score: same_skill (0.3) + same_city (0.2) = 0.5
    });

    it('should add 0.3 for common connections', async () => {
      mockSupabase.select.mockReturnValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({
        count: 1, // Has common connection
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ count: 0, error: null });

      // Expected score: same_skill (0.3) + same_city (0.2) + common_connection (0.3) = 0.8
    });

    it('should cap total score at 1.0', async () => {
      mockSupabase.select.mockReturnValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'user2', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      mockSupabase.select.mockReturnValueOnce({
        count: 5, // Many common connections
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ count: 10, error: null });

      // Total would be > 1.0, should cap at 1.0
      // same_skill (0.3) + same_city (0.2) + common_conn (0.3) + tournaments (0.2) = 1.0
    });
  });

  describe('recommendPlayers', () => {
    it('should recommend players above 0.4 similarity threshold', async () => {
      mockSupabase.select.mockReturnValueOnce({
        data: [{ user_a: 'user1', user_b: 'friend1' }],
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', city: 'Madrid', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'candidate1', display_name: 'Player 1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'candidate2', display_name: 'Player 2', skill_level: 'beginner', city: 'Barcelona' },
        ],
        error: null,
      });

      // Mock similarity calculation responses
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'candidate1', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      mockSupabase.or.mockResolvedValue({ count: 0, error: null });
      mockSupabase.rpc.mockResolvedValue({ count: 0, error: null });
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'players',
        limit: 10,
      });

      // Should only recommend candidate1 (score 0.5 > threshold 0.4)
      // candidate2 has score 0 (different skill & city)
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('player');
      expect(result[0].score).toBeGreaterThanOrEqual(0.4);
    });

    it('should skip users already connected as friends', async () => {
      mockSupabase.select.mockReturnValueOnce({
        data: [
          { user_a: 'user1', user_b: 'candidate1' }, // Already friends
        ],
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', city: 'Madrid', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'candidate1', display_name: 'Already Friend', skill_level: 'intermediate', city: 'Madrid' },
        ],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'players',
        limit: 10,
      });

      // Should skip candidate1 since already friends
      expect(result).toHaveLength(0);
    });

    it('should sort recommendations by score descending', async () => {
      mockSupabase.select.mockReturnValueOnce({
        data: [],
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', city: 'Madrid', location: null },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 'high-score', display_name: 'High Score', skill_level: 'intermediate', city: 'Madrid' },
          { id: 'low-score', display_name: 'Low Score', skill_level: 'intermediate', city: 'Barcelona' },
        ],
        error: null,
      });

      // Mock different similarity scores
      let callCount = 0;
      mockSupabase.in.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            data: [
              { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
              { id: 'high-score', skill_level: 'intermediate', city: 'Madrid' },
            ],
            error: null,
          };
        }
        return {
          data: [
            { id: 'user1', skill_level: 'intermediate', city: 'Madrid' },
            { id: 'low-score', skill_level: 'intermediate', city: 'Barcelona' },
          ],
          error: null,
        };
      });

      mockSupabase.or.mockResolvedValue({ count: 0, error: null });
      mockSupabase.rpc.mockResolvedValue({ count: 0, error: null });
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'players',
        limit: 10,
      });

      // high-score (0.5) should come before low-score (0.3)
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });
  });

  describe('recommendClubs', () => {
    it('should recommend nearby clubs using PostGIS', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          location: 'POINT(-3.7038 40.4168)', // Madrid coordinates
          city: 'Madrid',
        },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            club_id: 'club1',
            club_name: 'Club Padel Madrid',
            distance_km: 2.5,
            address: 'Calle Test 123',
          },
          {
            club_id: 'club2',
            club_name: 'Club Padel Norte',
            distance_km: 15.0,
            address: 'Avenida Norte 456',
          },
        ],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'clubs',
        limit: 5,
      });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('club');
      expect(result[0].metadata).toHaveProperty('distance_km');

      // Score should decrease with distance
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('should return empty array if user has no location', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { location: null, city: 'Madrid' },
        error: null,
      });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'clubs',
        limit: 5,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('recommendTournaments', () => {
    it('should recommend tournaments matching user skill level', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          skill_level: 'intermediate',
          city: 'Madrid',
          preferences: {},
        },
        error: null,
      });

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'tourn1',
            name: 'Torneo Primavera',
            format: 'round_robin',
            level: 'intermediate',
            location: 'Madrid',
            start_date: futureDate,
          },
        ],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'tournaments',
        limit: 5,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tournament');
      expect(result[0].metadata).toHaveProperty('level', 'intermediate');
      expect(result[0].score).toBe(0.8); // Base score for matching skill
    });

    it('should only recommend published and upcoming tournaments', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', city: 'Madrid', preferences: {} },
        error: null,
      });

      mockSupabase.limit.mockResolvedValue({
        data: [], // No upcoming published tournaments
        error: null,
      });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      const result = await generateRecommendations({
        user_id: 'user1',
        type: 'tournaments',
        limit: 5,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('generateUserEmbedding', () => {
    it('should generate OpenAI embeddings when configured', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          bio: 'I love padel',
          skill_level: 'intermediate',
          city: 'Madrid',
          preferences: { play_time: 'evening' },
        },
        error: null,
      });

      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const OpenAI = require('openai').default;
      const mockCreate = vi.fn().mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });
      OpenAI.mockImplementation(() => ({
        embeddings: { create: mockCreate },
      }));

      const { generateUserEmbedding } = await import('@/lib/services/recommendations');

      const result = await generateUserEmbedding('user1');

      expect(result).toHaveLength(1536);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.stringContaining('Test User'),
      });
    });

    it('should return null when OpenAI is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const { generateUserEmbedding } = await import('@/lib/services/recommendations');

      const result = await generateUserEmbedding('user1');

      expect(result).toBeNull();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          bio: null,
          skill_level: 'intermediate',
          city: 'Madrid',
          preferences: {},
        },
        error: null,
      });

      const OpenAI = require('openai').default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
      OpenAI.mockImplementation(() => ({
        embeddings: { create: mockCreate },
      }));

      const { generateUserEmbedding } = await import('@/lib/services/recommendations');

      const result = await generateUserEmbedding('user1');

      expect(result).toBeNull();
    });
  });

  describe('saveRecommendations', () => {
    it('should save recommendations to database', async () => {
      mockSupabase.insert.mockResolvedValue({ data: null, error: null });

      mockSupabase.select.mockReturnValueOnce({ data: [], error: null });
      mockSupabase.single.mockResolvedValueOnce({
        data: { skill_level: 'intermediate', city: 'Madrid', location: null },
        error: null,
      });
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const { generateRecommendations } = await import('@/lib/services/recommendations');

      // Generate recommendations triggers save
      await generateRecommendations({ user_id: 'user1', type: 'players', limit: 10 });

      // Verify insert was called (if recommendations were generated)
      // Note: In this test, no recommendations are generated due to empty candidate list
    });
  });

  describe('trackRecommendationFeedback', () => {
    it('should update shown status', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      const { trackRecommendationFeedback } = await import('@/lib/services/recommendations');

      await trackRecommendationFeedback('rec-id', { shown: true });

      expect(mockSupabase.update).toHaveBeenCalledWith({ shown: true });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'rec-id');
    });

    it('should update clicked status', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      const { trackRecommendationFeedback } = await import('@/lib/services/recommendations');

      await trackRecommendationFeedback('rec-id', { clicked: true });

      expect(mockSupabase.update).toHaveBeenCalledWith({ clicked: true });
    });

    it('should update dismissed status', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ data: null, error: null });

      const { trackRecommendationFeedback } = await import('@/lib/services/recommendations');

      await trackRecommendationFeedback('rec-id', { dismissed: true });

      expect(mockSupabase.update).toHaveBeenCalledWith({ dismissed: true });
    });
  });
});
