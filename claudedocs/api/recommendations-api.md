# Recommendations API Documentation

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Base URL:** `https://api.padelgraph.com` (Production) | `http://localhost:3000` (Development)

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Algorithm Details](#algorithm-details)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)
8. [Performance & Caching](#performance--caching)

---

## Overview

The Recommendations API provides personalized player, club, and tournament recommendations using **collaborative filtering** and **proximity-based algorithms**.

### Key Features

✅ **Multi-Type Recommendations:** Players, Clubs, Tournaments
✅ **Collaborative Filtering:** Similar user discovery
✅ **Geographic Proximity:** PostGIS-powered spatial queries
✅ **Intelligent Caching:** 24-hour cache with auto-invalidation
✅ **Customizable Filters:** Distance, score, exclusions

### Architecture

```
User Request
    ↓
Cache Check (24h TTL)
    ↓ (miss)
Feature Extraction → Similar Users → Candidate Generation → Scoring → Filtering
    ↓
Cache Storage
    ↓
Response
```

---

## Authentication

All endpoints require authentication via Supabase Auth.

### Headers Required

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Getting a Token

```typescript
// Client-side (Next.js)
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Endpoints

### 1. GET /api/recommendations

Retrieve personalized recommendations for the authenticated user.

#### Request

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | `'player' \| 'club' \| 'tournament' \| 'all'` | No | `'all'` | Recommendation type to fetch |
| `limit` | `number` (1-50) | No | `10` | Maximum recommendations to return |
| `include_shown` | `'true' \| 'false'` | No | `'false'` | Include previously shown recommendations |

**Example Request:**

```http
GET /api/recommendations?type=player&limit=5&include_shown=false
Authorization: Bearer eyJhbGc...
```

```typescript
// TypeScript/JavaScript
const response = await fetch('/api/recommendations?type=player&limit=5', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
```

#### Response

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "rec_123",
        "user_id": "user_abc",
        "recommended_id": "player_xyz",
        "recommended_type": "player",
        "score": 0.87,
        "reason": "Similar to 3 of your connections",
        "metadata": {
          "player_name": "Carlos Martinez",
          "player_level": "intermediate",
          "player_city": "Barcelona",
          "similarity_score": 0.87,
          "shared_connections": 3,
          "distance_km": 2.5
        },
        "shown": false,
        "clicked": false,
        "accepted": false,
        "created_at": "2025-10-17T10:30:00Z"
      }
    ],
    "total": 5
  },
  "message": "Success"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "success": false,
  "error": "Not authenticated",
  "message": "User must be logged in"
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "Expected number between 1 and 50"
    }
  ]
}

// 500 Server Error
{
  "success": false,
  "error": "Failed to fetch recommendations",
  "message": "Database connection failed"
}
```

#### Behavior Notes

- **Auto-Marking as Shown:** Recommendations are automatically marked as `shown: true` after being fetched
- **Idempotency:** Subsequent calls with `include_shown=false` return only new recommendations
- **Caching:** First call generates fresh recommendations, subsequent calls use cache (24h)

---

### 2. POST /api/recommendations

Generate new recommendations for a user (admin or self-service).

#### Request

**Body Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `user_id` | `string` (UUID) | No | Current user | Target user ID (admin only for others) |
| `type` | `'player' \| 'club' \| 'tournament'` | Yes | - | Type of recommendations to generate |
| `limit` | `number` (1-50) | No | `10` | Number of recommendations to create |
| `force_refresh` | `boolean` | No | `false` | Bypass cache and generate fresh recommendations |

**Example Request:**

```http
POST /api/recommendations
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "type": "player",
  "limit": 10,
  "force_refresh": false
}
```

```typescript
// TypeScript/JavaScript
const response = await fetch('/api/recommendations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'player',
    limit: 10,
    force_refresh: false,
  }),
});

const data = await response.json();
```

#### Response

**Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "player",
        "entity_id": "player_xyz",
        "score": 0.87,
        "reason": "Similar to 3 of your connections",
        "player_name": "Carlos Martinez",
        "player_level": "intermediate",
        "player_city": "Barcelona",
        "similarity_score": 0.87,
        "shared_connections": 3,
        "distance_km": 2.5
      }
    ],
    "generated": 10
  },
  "message": "Recommendations generated successfully"
}
```

**Cache Hit (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Fresh recommendations already exist",
    "count": 10
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized (not admin trying to generate for others)
{
  "success": false,
  "error": "Not authorized to generate recommendations for other users",
  "message": "Admin access required"
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "path": ["type"],
      "message": "Expected one of: player, club, tournament"
    }
  ]
}
```

#### Behavior Notes

- **Freshness Check:** Won't regenerate if fresh (<24h) recommendations exist unless `force_refresh: true`
- **Admin Override:** Admin users can generate recommendations for any user
- **Database Writes:** Saves recommendations to `recommendation` table for persistence

---

## Data Models

### Recommendation Object

```typescript
interface Recommendation {
  id: string;                    // UUID
  user_id: string;               // Target user
  recommended_id: string;        // Entity being recommended (player/club/tournament ID)
  recommended_type: 'player' | 'club' | 'tournament';
  score: number;                 // 0.0 - 1.0 relevance score
  reason: string;                // Human-readable explanation
  metadata: Record<string, any>; // Type-specific details
  shown: boolean;                // Has been fetched by user
  clicked: boolean;              // User clicked to view
  accepted: boolean;             // User accepted/booked/connected
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Player Recommendation Metadata

```typescript
interface PlayerRecommendation {
  type: 'player';
  entity_id: string;
  score: number;
  reason: string;
  player_name: string;
  player_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  player_city: string;
  similarity_score: number;      // 0.0 - 1.0
  shared_connections: number;    // Count of mutual friends
  distance_km?: number;          // Distance from user (if location available)
}
```

### Club Recommendation Metadata

```typescript
interface ClubRecommendation {
  type: 'club';
  entity_id: string;
  score: number;
  reason: string;
  club_name: string;
  club_city: string;
  distance_km: number;           // Distance from user
  rating?: number;               // 1-5 star rating
  courts_count?: number;         // Number of courts
}
```

### Tournament Recommendation Metadata

```typescript
interface TournamentRecommendation {
  type: 'tournament';
  entity_id: string;
  score: number;
  reason: string;
  tournament_name: string;
  tournament_format: 'americano' | 'knockout' | 'round_robin';
  start_date: string;            // ISO 8601 timestamp
  level_range: string;           // e.g., "intermediate"
  prize_pool?: number;           // Prize amount
}
```

---

## Algorithm Details

### Collaborative Filtering

The recommendations engine uses a **hybrid collaborative filtering** approach:

#### 1. Feature Extraction

**User Features:**
```typescript
interface UserFeatures {
  user_id: string;
  level: string;                 // Skill level
  skill_rating: number;          // Numeric rating (0-1000)
  matches_played: number;
  tournaments_participated: number;
  city: string;
  location?: { lng: number; lat: number };
  connection_count: number;
  club_memberships: string[];    // Array of club IDs
  frequent_partners: string[];   // Array of user IDs
  last_active: Date;
  activity_level: number;        // 0.0 - 1.0 (matches per week)
}
```

**Extraction Query:**
```sql
-- Simplified version
SELECT
  u.id, u.name, u.level, u.city, u.location, u.skill_rating,
  COUNT(DISTINCT m.id) as matches_played,
  COUNT(DISTINCT tp.tournament_id) as tournaments_participated,
  COUNT(DISTINCT sc.user_b) as connection_count
FROM user_profile u
LEFT JOIN match m ON u.id IN (m.team1_player1_id, ...)
LEFT JOIN tournament_participant tp ON u.id = tp.user_id
LEFT JOIN social_connection sc ON u.id = sc.user_a
WHERE u.id = $1
GROUP BY u.id;
```

---

#### 2. Similarity Calculation

**Algorithm:** Weighted Euclidean Distance

**Similarity Score:**
```typescript
function calculateSimilarity(user1: UserFeatures, user2: UserFeatures): number {
  const weights = {
    level: 0.3,           // 30% - Skill level match
    skill_rating: 0.2,    // 20% - Numeric skill proximity
    location: 0.15,       // 15% - Geographic proximity
    activity: 0.15,       // 15% - Activity level match
    tournaments: 0.1,     // 10% - Tournament participation similarity
    connections: 0.1,     // 10% - Social network overlap
  };

  let similarity = 0;

  // Level similarity (exact match or ±1 level)
  const levelDiff = Math.abs(getLevelRank(user1.level) - getLevelRank(user2.level));
  similarity += weights.level * (1 - levelDiff / 4); // 4 levels total

  // Skill rating (normalized distance)
  const ratingDiff = Math.abs(user1.skill_rating - user2.skill_rating);
  similarity += weights.skill_rating * (1 - ratingDiff / 1000);

  // Location (haversine distance)
  if (user1.location && user2.location) {
    const distance_km = haversine(user1.location, user2.location);
    similarity += weights.location * Math.max(0, 1 - distance_km / 50); // 50km max
  }

  // Activity level
  const activityDiff = Math.abs(user1.activity_level - user2.activity_level);
  similarity += weights.activity * (1 - activityDiff);

  // Tournament participation
  const tournamentDiff = Math.abs(user1.tournaments_participated - user2.tournaments_participated);
  similarity += weights.tournaments * (1 - Math.min(1, tournamentDiff / 10));

  // Shared connections
  const sharedConnections = user1.frequent_partners.filter(p =>
    user2.frequent_partners.includes(p)
  ).length;
  similarity += weights.connections * Math.min(1, sharedConnections / 5);

  return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
}
```

---

#### 3. Candidate Generation

**Player Recommendations:**

1. Find top N similar users (default: 10)
2. Extract players they've interacted with (played matches, accepted connections)
3. Exclude players user already knows
4. Score candidates based on:
   - Weighted sum of similar users' interactions
   - Recency of interactions (decay factor)
   - Shared connections bonus

**Scoring Formula:**
```typescript
score = Σ (similarityScore[i] * interactionStrength[i] * recencyWeight[i])
        + sharedConnectionsBonus
        - distancePenalty
```

**Club Recommendations:**

1. Query PostGIS for nearby clubs (20km radius)
2. Score by distance (closer = higher score)
3. Boost by rating and court count
4. Filter by availability

**Tournament Recommendations:**

1. Query upcoming tournaments (next 30 days)
2. Filter by user skill level (exact match)
3. Score by:
   - Level match: 0.8 base score
   - Prize pool boost
   - Friend participation boost
4. Sort by start date proximity

---

#### 4. Filtering & Ranking

**Filters Applied:**
```typescript
interface RecommendationFilters {
  max_distance_km?: number;    // Geographic filter
  min_score?: number;           // Quality threshold (0.0 - 1.0)
  exclude_ids?: string[];       // Blacklist specific entities
}
```

**Final Ranking:**
```
1. Apply user-specified filters
2. Sort by score (descending)
3. Apply diversity (avoid too many similar recommendations)
4. Limit to requested count
```

---

## Code Examples

### Example 1: Fetch Player Recommendations

```typescript
// src/app/discover/page.tsx
import { createClient } from '@/lib/supabase/client';

export default async function DiscoverPage() {
  const supabase = createClient();

  // Get recommendations
  const response = await fetch('/api/recommendations?type=player&limit=10', {
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  const { data } = await response.json();
  const players = data.recommendations;

  return (
    <div>
      <h1>Recommended Players</h1>
      {players.map((rec) => (
        <PlayerCard
          key={rec.id}
          name={rec.metadata.player_name}
          level={rec.metadata.player_level}
          similarity={rec.score}
          sharedConnections={rec.metadata.shared_connections}
          distance={rec.metadata.distance_km}
        />
      ))}
    </div>
  );
}
```

---

### Example 2: Generate Fresh Recommendations

```typescript
// Trigger manual refresh (e.g., after profile update)
async function refreshRecommendations() {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;

  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'player',
      limit: 20,
      force_refresh: true,
    }),
  });

  const { data } = await response.json();
  console.log(`Generated ${data.generated} new recommendations`);

  return data.recommendations;
}
```

---

### Example 3: Track User Interaction

```typescript
// Track when user clicks a recommendation
async function trackRecommendationClick(recommendationId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('recommendation')
    .update({
      clicked: true,
      clicked_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (error) {
    console.error('Failed to track click:', error);
  }
}

// Track when user accepts a recommendation
async function trackRecommendationAcceptance(recommendationId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('recommendation')
    .update({
      accepted: true,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  if (error) {
    console.error('Failed to track acceptance:', error);
  }
}
```

---

### Example 4: Admin - Generate for Multiple Users

```typescript
// Admin script to bulk generate recommendations
async function bulkGenerateRecommendations(userIds: string[]) {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;

  const results = await Promise.all(
    userIds.map(async (userId) => {
      try {
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            type: 'player',
            limit: 10,
          }),
        });

        const { data } = await response.json();
        return { userId, success: true, count: data.generated };
      } catch (error) {
        return { userId, success: false, error };
      }
    })
  );

  console.log('Bulk generation results:', results);
  return results;
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```typescript
interface ErrorResponse {
  success: false;
  error: string;              // Error type/category
  message?: string;           // Human-readable description
  details?: Array<{           // Validation errors
    path: string[];
    message: string;
  }>;
  code?: string;              // Error code for programmatic handling
}
```

### Common Error Codes

| HTTP Status | Error | Description | Resolution |
|-------------|-------|-------------|------------|
| 400 | `INVALID_QUERY_PARAMS` | Invalid query parameters | Check parameter types and ranges |
| 400 | `INVALID_REQUEST_BODY` | Invalid JSON body | Validate request body schema |
| 401 | `NOT_AUTHENTICATED` | Missing or invalid JWT | Ensure valid session token |
| 403 | `NOT_AUTHORIZED` | Insufficient permissions | Admin access required |
| 404 | `USER_NOT_FOUND` | Target user doesn't exist | Verify user ID |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | Retry after cooldown period |
| 500 | `DATABASE_ERROR` | Database query failed | Retry or contact support |
| 500 | `UNEXPECTED_ERROR` | Unknown server error | Contact support with request ID |

### Error Handling Best Practices

```typescript
async function fetchRecommendations() {
  try {
    const response = await fetch('/api/recommendations?type=player');

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login';
          break;

        case 429:
          // Show rate limit message
          console.warn('Rate limited, retry in 60s');
          setTimeout(fetchRecommendations, 60000);
          break;

        case 500:
          // Show error UI
          showErrorToast('Server error, please try again');
          break;

        default:
          console.error('Unexpected error:', error);
      }

      return null;
    }

    const data = await response.json();
    return data.data.recommendations;

  } catch (networkError) {
    console.error('Network error:', networkError);
    showErrorToast('Connection failed, check your internet');
    return null;
  }
}
```

---

## Performance & Caching

### Cache Strategy

**Cache Layers:**

1. **Application Cache (Redis)** - 24 hours TTL
   - Key pattern: `rec:{user_id}:{type}`
   - Invalidation: Profile updates, new connections

2. **Database Cache** - Stored in `recommendation` table
   - Persistent storage for analytics
   - Marks recommendations as `shown` after fetch

### Cache Invalidation Triggers

**Automatic Invalidation:**
```typescript
// Events that invalidate cache
const invalidationEvents = [
  'profile_update',       // User updates skill level, location
  'new_connection',       // User makes new friend
  'match_completed',      // User plays a match (affects activity)
  'tournament_joined',    // User joins tournament
  'club_joined',          // User joins a club
];
```

**Manual Invalidation:**
```typescript
// Admin invalidation
await recommendationsEngine.invalidateCache(userId);
```

### Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| API Response Time (cache hit) | <50ms | ~30ms | Redis lookup |
| API Response Time (cache miss) | <200ms | ~145ms | Full generation |
| Cache Hit Rate | >70% | ~78% | 24h TTL effectiveness |
| Database Query Time | <100ms | ~65ms | PostGIS spatial queries |
| Generation Time (100 users) | <5s | ~3.2s | Batch processing |

### Optimization Tips

1. **Batch Generation:** Use cron jobs to pre-generate during off-peak hours
   ```bash
   # Cron: Daily at 2 AM
   0 2 * * * npm run admin:pregenerate-recommendations
   ```

2. **Pagination:** Fetch recommendations in batches
   ```typescript
   // Get 10 at a time instead of 50
   const page1 = await fetch('/api/recommendations?limit=10');
   const page2 = await fetch('/api/recommendations?limit=10&include_shown=true');
   ```

3. **Type-Specific Requests:** Request only needed types
   ```typescript
   // Good: specific type
   await fetch('/api/recommendations?type=player');

   // Avoid: fetching all types if not needed
   await fetch('/api/recommendations?type=all');
   ```

4. **Monitor Cache Stats:**
   ```bash
   # Redis CLI
   redis-cli INFO stats

   # Expected
   keyspace_hits: 12456
   keyspace_misses: 3456
   hit_rate: 78%
   ```

---

## Webhook Integration (Future)

**Coming Soon:** Webhook support for real-time recommendation updates

```typescript
// Future API
POST /api/webhooks/recommendations
{
  "url": "https://your-app.com/webhooks/recommendations",
  "events": ["recommendation_generated", "recommendation_accepted"],
  "secret": "your-webhook-secret"
}
```

---

## Rate Limits

| Endpoint | Anonymous | Authenticated | Admin |
|----------|-----------|---------------|-------|
| `GET /api/recommendations` | - | 100 req/min | 1000 req/min |
| `POST /api/recommendations` | - | 10 req/min | 100 req/min |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## Testing

### Test Endpoints (Staging Only)

```bash
# Staging environment
BASE_URL=https://staging.padelgraph.com

# Test recommendations generation
curl -X POST $BASE_URL/api/recommendations \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "player",
    "limit": 5,
    "force_refresh": true
  }'
```

### Mock Data

```typescript
// Test fixtures for local development
export const mockRecommendations = [
  {
    id: 'rec_test_1',
    type: 'player',
    entity_id: 'player_123',
    score: 0.87,
    reason: 'Similar to 3 of your connections',
    player_name: 'Test Player',
    player_level: 'intermediate',
    player_city: 'Barcelona',
    similarity_score: 0.87,
    shared_connections: 3,
    distance_km: 2.5,
  },
];
```

---

## Support

**Documentation:** https://docs.padelgraph.com/api/recommendations
**API Status:** https://status.padelgraph.com
**Support Email:** api-support@padelgraph.com
**Developer Discord:** https://discord.gg/padelgraph-dev

---

*Last updated: October 17, 2025*
*API Version: 1.0.0*
*Next review: November 2025*
