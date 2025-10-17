/**
 * Collaborative Filtering Tests
 *
 * Comprehensive unit tests for similarity algorithms and recommendation scoring.
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  jaccardSimilarity,
  haversineDistance,
  toRadians,
  skillSimilarity,
  locationProximity,
  playStyleMatch,
  scheduleCompatibility,
  socialOverlap,
  calculateUserSimilarity,
  findSimilarUsers,
  calculateInteractionStrength,
  scoreItemRecommendation,
} from '../collaborative-filtering';

describe('Collaborative Filtering - Mathematical Functions', () => {
  describe('toRadians', () => {
    it('converts degrees to radians correctly', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4];
      expect(cosineSimilarity(vec, vec)).toBe(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    });

    it('returns -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
    });

    it('handles empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('computes correct similarity for typical vectors', () => {
      const similarity = cosineSimilarity([1, 2, 3], [4, 5, 6]);
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1 for identical sets', () => {
      const set = new Set(['a', 'b', 'c']);
      expect(jaccardSimilarity(set, set)).toBe(1);
    });

    it('returns 0 for disjoint sets', () => {
      const set1 = new Set(['a', 'b']);
      const set2 = new Set(['c', 'd']);
      expect(jaccardSimilarity(set1, set2)).toBe(0);
    });

    it('computes correct similarity for overlapping sets', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['b', 'c', 'd']);
      // Intersection: {b, c} = 2, Union: {a, b, c, d} = 4
      expect(jaccardSimilarity(set1, set2)).toBe(0.5);
    });

    it('handles empty sets', () => {
      expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for same coordinates', () => {
      const distance = haversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('calculates distance between New York and London approximately', () => {
      // NYC: 40.7128° N, 74.0060° W
      // London: 51.5074° N, 0.1278° W
      const distance = haversineDistance(40.7128, -74.0060, 51.5074, -0.1278);
      
      // Distance should be approximately 5570 km
      expect(distance).toBeGreaterThan(5500);
      expect(distance).toBeLessThan(5600);
    });

    it('calculates short distances accurately', () => {
      // 1 degree latitude ≈ 111 km
      const distance = haversineDistance(0, 0, 1, 0);
      expect(distance).toBeCloseTo(111, 0);
    });
  });
});

describe('Collaborative Filtering - Similarity Metrics', () => {
  describe('skillSimilarity', () => {
    it('returns 1 for exact same skill level', () => {
      expect(skillSimilarity(5, 5)).toBe(1);
    });

    it('returns 0 for maximum difference (10 levels)', () => {
      expect(skillSimilarity(1, 10)).toBe(0);
      expect(skillSimilarity(10, 1)).toBe(0);
    });

    it('decreases linearly with skill difference', () => {
      expect(skillSimilarity(5, 6)).toBeGreaterThan(skillSimilarity(5, 7));
      expect(skillSimilarity(5, 7)).toBeGreaterThan(skillSimilarity(5, 8));
    });

    it('is symmetric', () => {
      expect(skillSimilarity(3, 7)).toBe(skillSimilarity(7, 3));
    });
  });

  describe('locationProximity', () => {
    it('returns 1 for same location', () => {
      expect(locationProximity(40, -74, 40, -74)).toBe(1);
    });

    it('returns 0 for distances >= 50km', () => {
      // ~111km apart (1 degree latitude)
      expect(locationProximity(0, 0, 1, 0)).toBe(0);
    });

    it('decreases with distance within 50km range', () => {
      // Close distances (< 50km)
      const close = locationProximity(40.7128, -74.0060, 40.7500, -74.0060);
      const medium = locationProximity(40.7128, -74.0060, 40.8000, -74.0060);
      
      expect(close).toBeGreaterThan(medium);
      expect(close).toBeLessThanOrEqual(1);
      expect(medium).toBeGreaterThanOrEqual(0);
    });
  });

  describe('playStyleMatch', () => {
    it('returns 1 for identical play styles', () => {
      expect(playStyleMatch('aggressive', 'aggressive')).toBe(1);
    });

    it('returns 0.5 for compatible styles', () => {
      expect(playStyleMatch('aggressive', 'balanced')).toBe(0.5);
      expect(playStyleMatch('defensive', 'balanced')).toBe(0.5);
    });

    it('returns 0 for incompatible styles', () => {
      expect(playStyleMatch('aggressive', 'defensive')).toBe(0);
    });

    it('is symmetric', () => {
      expect(playStyleMatch('aggressive', 'balanced')).toBe(
        playStyleMatch('balanced', 'aggressive')
      );
    });
  });

  describe('scheduleCompatibility', () => {
    it('returns 1 for identical availability', () => {
      const schedule = ['monday', 'wednesday', 'friday'];
      expect(scheduleCompatibility(schedule, schedule)).toBe(1);
    });

    it('returns 0 for no overlap', () => {
      const schedule1 = ['monday', 'wednesday'];
      const schedule2 = ['tuesday', 'thursday'];
      expect(scheduleCompatibility(schedule1, schedule2)).toBe(0);
    });

    it('computes correct ratio for partial overlap', () => {
      const schedule1 = ['monday', 'wednesday', 'friday'];
      const schedule2 = ['monday', 'thursday', 'friday'];
      // Overlap: 2 days, Union: 5 days
      expect(scheduleCompatibility(schedule1, schedule2)).toBeCloseTo(0.4);
    });
  });

  describe('socialOverlap', () => {
    it('returns 1 for identical club memberships', () => {
      const clubs = ['club1', 'club2', 'club3'];
      expect(socialOverlap(clubs, clubs)).toBe(1);
    });

    it('returns 0 for no common clubs', () => {
      expect(socialOverlap(['club1', 'club2'], ['club3', 'club4'])).toBe(0);
    });

    it('computes correct ratio for partial overlap', () => {
      const clubs1 = ['club1', 'club2', 'club3'];
      const clubs2 = ['club2', 'club3', 'club4'];
      // Overlap: 2, Union: 4
      expect(socialOverlap(clubs1, clubs2)).toBe(0.5);
    });
  });
});

describe('Collaborative Filtering - User Similarity', () => {
  const mockUser1 = {
    id: 'user1',
    skill_level: 5,
    location: { lat: 40.7128, lng: -74.0060 },
    play_style: 'aggressive',
    availability: ['monday', 'wednesday', 'friday'],
    clubs: ['club1', 'club2'],
  };

  const mockUser2 = {
    id: 'user2',
    skill_level: 6,
    location: { lat: 40.7300, lng: -74.0100 },
    play_style: 'balanced',
    availability: ['monday', 'friday'],
    clubs: ['club1', 'club3'],
  };

  describe('calculateUserSimilarity', () => {
    it('returns high similarity for similar users', () => {
      const similarity = calculateUserSimilarity(mockUser1, {
        ...mockUser1,
        id: 'user3',
      });
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('returns value between 0 and 1', () => {
      const similarity = calculateUserSimilarity(mockUser1, mockUser2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('weighs different factors appropriately', () => {
      // Test that skill similarity has significant weight
      const lowSkill = { ...mockUser1, skill_level: 1 };
      const highSkill = { ...mockUser1, skill_level: 10 };
      
      const similarityLow = calculateUserSimilarity(mockUser1, lowSkill);
      const similarityHigh = calculateUserSimilarity(mockUser1, highSkill);
      
      // Both should be lower than exact match, but non-zero
      expect(similarityLow).toBeLessThan(1);
      expect(similarityHigh).toBeLessThan(1);
    });
  });

  describe('findSimilarUsers', () => {
    const currentUser = mockUser1;
    const otherUsers = [
      mockUser2,
      { ...mockUser1, id: 'user3', skill_level: 5 }, // Very similar
      { ...mockUser1, id: 'user4', skill_level: 1, play_style: 'defensive' }, // Very different
    ];

    it('returns users sorted by similarity', () => {
      const similar = findSimilarUsers(currentUser, otherUsers, 10);
      
      // First result should be most similar (user3 - almost identical)
      expect(similar[0].userId).toBe('user3');
      expect(similar[0].similarity).toBeGreaterThan(0.8);
    });

    it('respects maxResults parameter', () => {
      const similar = findSimilarUsers(currentUser, otherUsers, 2);
      expect(similar).toHaveLength(2);
    });

    it('filters out users below minimum similarity threshold', () => {
      const similar = findSimilarUsers(currentUser, otherUsers, 10, 0.7);
      
      // Should exclude very different users
      expect(similar.every(u => u.similarity >= 0.7)).toBe(true);
    });

    it('returns empty array when no similar users', () => {
      const similar = findSimilarUsers(currentUser, otherUsers, 10, 0.99);
      expect(similar).toHaveLength(0);
    });
  });
});

describe('Collaborative Filtering - Interaction & Scoring', () => {
  describe('calculateInteractionStrength', () => {
    it('assigns higher scores to recent interactions', () => {
      const recent = new Date();
      const old = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago
      
      const recentStrength = calculateInteractionStrength('played_with', 5, recent);
      const oldStrength = calculateInteractionStrength('played_with', 5, old);
      
      expect(recentStrength).toBeGreaterThan(oldStrength);
    });

    it('weighs different interaction types correctly', () => {
      const now = new Date();
      
      const played = calculateInteractionStrength('played_with', 1, now);
      const friend = calculateInteractionStrength('friend', 1, now);
      const clubmate = calculateInteractionStrength('clubmate', 1, now);
      
      // Played should be highest weight
      expect(played).toBeGreaterThan(friend);
      expect(played).toBeGreaterThan(clubmate);
    });

    it('increases with interaction count', () => {
      const now = new Date();
      
      const once = calculateInteractionStrength('played_with', 1, now);
      const multiple = calculateInteractionStrength('played_with', 5, now);
      
      expect(multiple).toBeGreaterThan(once);
    });
  });

  describe('scoreItemRecommendation', () => {
    const mockSimilarUsers = [
      { userId: 'user1', similarity: 0.9 },
      { userId: 'user2', similarity: 0.7 },
      { userId: 'user3', similarity: 0.5 },
    ];

    const mockInteractions = {
      user1: [
        { itemId: 'item1', strength: 0.8 },
        { itemId: 'item2', strength: 0.6 },
      ],
      user2: [
        { itemId: 'item1', strength: 0.7 },
        { itemId: 'item3', strength: 0.9 },
      ],
      user3: [
        { itemId: 'item2', strength: 0.5 },
      ],
    };

    it('returns highest score for item recommended by most similar users', () => {
      const score1 = scoreItemRecommendation('item1', mockSimilarUsers, mockInteractions);
      const score2 = scoreItemRecommendation('item2', mockSimilarUsers, mockInteractions);
      const score3 = scoreItemRecommendation('item3', mockSimilarUsers, mockInteractions);
      
      // item1 recommended by user1 (0.9 sim) and user2 (0.7 sim)
      // Should have highest score
      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeGreaterThan(score3);
    });

    it('returns 0 for items with no interactions', () => {
      const score = scoreItemRecommendation('nonexistent', mockSimilarUsers, mockInteractions);
      expect(score).toBe(0);
    });

    it('weighs by both similarity and interaction strength', () => {
      // item1: user1 (sim 0.9, strength 0.8) + user2 (sim 0.7, strength 0.7)
      // Expected: (0.9 * 0.8) + (0.7 * 0.7) = 0.72 + 0.49 = 1.21
      const score = scoreItemRecommendation('item1', mockSimilarUsers, mockInteractions);
      expect(score).toBeCloseTo(1.21, 1);
    });
  });
});
