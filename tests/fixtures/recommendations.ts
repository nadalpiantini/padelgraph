// Test fixtures for recommendations
export const mockRecommendations = [
  {
    id: 'rec-1',
    user_id: 'test-user-1',
    recommendation_type: 'player' as const,
    target_id: 'test-user-3',
    score: 0.85,
    reason: 'Same skill level, plays in your travel destination',
    created_at: new Date('2025-10-17').toISOString(),
  },
  {
    id: 'rec-2',
    user_id: 'test-user-1',
    recommendation_type: 'club' as const,
    target_id: 'club-1',
    score: 0.75,
    reason: 'Near your travel destination',
    created_at: new Date('2025-10-17').toISOString(),
  },
] as const;

export const mockUserSimilarities = {
  sameCitySameSkill: {
    user1: mockUsers.user1,
    user2: mockUsers.user2,
    expectedScore: 0.5, // same city (0.2) + same skill (0.3)
  },
  differentCityDifferentSkill: {
    user1: mockUsers.user1,
    user3: mockUsers.user3,
    expectedScore: 0, // different everything
  },
} as const;

// Import mockUsers from users.ts
import { mockUsers } from './users';
