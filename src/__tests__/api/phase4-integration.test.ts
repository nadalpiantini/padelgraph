/**
 * Phase 4 API Integration Tests
 *
 * Integration tests for Travel Mode, Discovery, Graph, Recommendations, and Privacy endpoints.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock authenticated request helper
const makeAuthRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  // In real implementation, this would include auth headers
  return fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

describe('Phase 4 API Integration Tests', () => {
  describe('Travel Mode APIs', () => {
    let createdTravelPlanId: string;

    it('POST /api/travel-plans - creates new travel plan', async () => {
      const travelPlan = {
        destination_city: 'Barcelona',
        destination_country: 'Spain',
        start_date: '2025-11-01',
        end_date: '2025-11-07',
        preferences: {
          level: 'intermediate',
          format: 'doubles',
        },
      };

      const response = await makeAuthRequest('/api/travel-plans', {
        method: 'POST',
        body: JSON.stringify(travelPlan),
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.destination_city).toBe('Barcelona');
      
      createdTravelPlanId = data.id;
    });

    it('GET /api/travel-plans - lists travel plans', async () => {
      const response = await makeAuthRequest('/api/travel-plans');
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.plans)).toBe(true);
      expect(data.plans.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/travel-plans/[id] - gets specific travel plan', async () => {
      const response = await makeAuthRequest(
        `/api/travel-plans/${createdTravelPlanId}`
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.id).toBe(createdTravelPlanId);
      expect(data.destination_city).toBe('Barcelona');
    });

    it('PUT /api/travel-plans/[id] - updates travel plan', async () => {
      const updates = {
        end_date: '2025-11-10',
      };

      const response = await makeAuthRequest(
        `/api/travel-plans/${createdTravelPlanId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.end_date).toBe('2025-11-10');
    });

    it('GET /api/travel-plans/[id]/suggestions - gets destination suggestions', async () => {
      const response = await makeAuthRequest(
        `/api/travel-plans/${createdTravelPlanId}/suggestions`
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('clubs');
      expect(data).toHaveProperty('tournaments');
    });

    it('DELETE /api/travel-plans/[id] - deletes travel plan', async () => {
      const response = await makeAuthRequest(
        `/api/travel-plans/${createdTravelPlanId}`,
        {
          method: 'DELETE',
        }
      );
      
      expect(response.status).toBe(204);
    });
  });

  describe('Discovery APIs', () => {
    it('GET /api/discover/nearby - finds nearby entities', async () => {
      const params = new URLSearchParams({
        type: 'players',
        radius: '10',
        lat: '40.7128',
        lng: '-74.0060',
      });

      const response = await makeAuthRequest(`/api/discover/nearby?${params}`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data).toHaveProperty('count');
    });

    it('GET /api/discover/feed - gets discovery feed', async () => {
      const params = new URLSearchParams({
        radius: '20',
      });

      const response = await makeAuthRequest(`/api/discover/feed?${params}`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.events)).toBe(true);
      expect(data).toHaveProperty('hasMore');
    });

    it('POST /api/discover/bookmark - bookmarks discovery item', async () => {
      const bookmark = {
        entity_type: 'player',
        entity_id: 'test-player-id',
      };

      const response = await makeAuthRequest('/api/discover/bookmark', {
        method: 'POST',
        body: JSON.stringify(bookmark),
      });
      
      expect(response.status).toBe(201);
    });
  });

  describe('Social Graph APIs', () => {
    it('GET /api/graph/connection - finds connection between users', async () => {
      const params = new URLSearchParams({
        from: 'user-a-id',
        to: 'user-b-id',
      });

      const response = await makeAuthRequest(`/api/graph/connection?${params}`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('path');
      expect(data).toHaveProperty('degrees');
      expect(Array.isArray(data.path)).toBe(true);
    });

    it('GET /api/graph/network - gets user network', async () => {
      const response = await makeAuthRequest('/api/graph/network');
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('connections');
      expect(Array.isArray(data.connections)).toBe(true);
    });

    it('GET /api/graph/stats - gets graph statistics', async () => {
      const response = await makeAuthRequest('/api/graph/stats');
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('totalConnections');
      expect(data).toHaveProperty('averageDegrees');
      expect(typeof data.totalConnections).toBe('number');
    });
  });

  describe('Recommendations APIs', () => {
    it('GET /api/recommendations - gets personalized recommendations', async () => {
      const params = new URLSearchParams({
        type: 'player',
      });

      const response = await makeAuthRequest(`/api/recommendations?${params}`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.recommendations)).toBe(true);
      
      if (data.recommendations.length > 0) {
        const rec = data.recommendations[0];
        expect(rec).toHaveProperty('recommended_type');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');
      }
    });

    it('POST /api/recommendations/feedback - tracks recommendation interaction', async () => {
      const feedback = {
        recommendationId: 'test-rec-id',
        action: 'view',
      };

      const response = await makeAuthRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: JSON.stringify(feedback),
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Privacy APIs', () => {
    it('GET /api/privacy-settings - gets privacy settings', async () => {
      const response = await makeAuthRequest('/api/privacy-settings');
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('location_visibility');
      expect(data).toHaveProperty('profile_visibility');
      expect(data).toHaveProperty('auto_match_enabled');
      expect(data).toHaveProperty('show_in_discovery');
    });

    it('PUT /api/privacy-settings - updates privacy settings', async () => {
      const updates = {
        location_visibility: 'friends',
        profile_visibility: 'public',
        auto_match_enabled: true,
        show_in_discovery: false,
      };

      const response = await makeAuthRequest('/api/privacy-settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.location_visibility).toBe('friends');
      expect(data.show_in_discovery).toBe(false);
    });

    it('validates privacy setting values', async () => {
      const invalidSettings = {
        location_visibility: 'invalid_value',
      };

      const response = await makeAuthRequest('/api/privacy-settings', {
        method: 'PUT',
        body: JSON.stringify(invalidSettings),
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for non-existent travel plan', async () => {
      const response = await makeAuthRequest('/api/travel-plans/non-existent-id');
      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid discovery parameters', async () => {
      const params = new URLSearchParams({
        type: 'invalid',
        radius: 'not-a-number',
      });

      const response = await makeAuthRequest(`/api/discover/nearby?${params}`);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing required graph connection parameters', async () => {
      const response = await makeAuthRequest('/api/graph/connection');
      expect(response.status).toBe(400);
    });

    it('handles rate limiting appropriately', async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() => makeAuthRequest('/api/recommendations'));

      const responses = await Promise.all(requests);
      
      // Should have at least some successful responses
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('GET /api/discover/nearby responds within 500ms', async () => {
      const startTime = Date.now();
      
      const params = new URLSearchParams({
        type: 'players',
        radius: '10',
      });

      const response = await makeAuthRequest(`/api/discover/nearby?${params}`);
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('GET /api/graph/connection responds within 2000ms', async () => {
      const startTime = Date.now();
      
      const params = new URLSearchParams({
        from: 'user-a',
        to: 'user-b',
      });

      const response = await makeAuthRequest(`/api/graph/connection?${params}`);
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });

    it('GET /api/recommendations responds within 1000ms', async () => {
      const startTime = Date.now();
      
      const response = await makeAuthRequest('/api/recommendations');
      
      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
