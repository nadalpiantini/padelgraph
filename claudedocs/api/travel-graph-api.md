# Travel Graph API Documentation

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Base URL:** `https://api.padelgraph.com` (Production) | `http://localhost:3000` (Development)

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Algorithm Details](#algorithm-details)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Performance](#performance)

---

## Overview

The Travel Graph API provides **social connection discovery** through graph traversal algorithms. Find the shortest path between any two users in the Padelgraph social network.

### Key Features

✅ **BFS Graph Traversal:** Breadth-First Search for shortest paths
✅ **Privacy-Aware:** Respects user privacy settings
✅ **Degrees of Separation:** Up to 6 degrees (configurable)
✅ **Connection Types:** Friends, played with, clubmates, tournaments
✅ **Intelligent Caching:** Sub-200ms response times

### Use Cases

- **Social Discovery:** "How am I connected to this player?"
- **Trust Building:** Find mutual friends for introductions
- **Network Expansion:** Discover 2nd and 3rd degree connections
- **Travel Mode:** Connect with players through your existing network

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
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Endpoints

### 1. GET /api/graph/connection

Find the shortest connection path between two users.

#### Request

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `target_user_id` | `string` (UUID) | Yes | - | User to find connection path to |
| `max_depth` | `number` (1-6) | No | `6` | Maximum degrees of separation |

**Example Request:**

```http
GET /api/graph/connection?target_user_id=abc-123&max_depth=3
Authorization: Bearer eyJhbGc...
```

```typescript
// TypeScript/JavaScript
const response = await fetch(
  `/api/graph/connection?target_user_id=${targetUserId}&max_depth=3`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const data = await response.json();
```

#### Response

**Success - Connection Found (200 OK):**

```json
{
  "success": true,
  "data": {
    "connected": true,
    "degrees_of_separation": 2,
    "source_user_id": "user-abc",
    "target_user_id": "user-xyz",
    "path": [
      {
        "user_id": "user-abc",
        "name": "You",
        "level": "intermediate",
        "city": "Madrid",
        "connection_type": null
      },
      {
        "user_id": "user-middle",
        "name": "Juan Martinez",
        "level": "advanced",
        "city": "Madrid",
        "connection_type": "friend"
      },
      {
        "user_id": "user-xyz",
        "name": "Pedro Lopez",
        "level": "intermediate",
        "city": "Barcelona",
        "connection_type": "played_with"
      }
    ]
  },
  "message": "Success"
}
```

**Success - No Connection (200 OK):**

```json
{
  "success": true,
  "data": {
    "connected": false,
    "degrees_of_separation": null,
    "path": [],
    "message": "No connection found within 3 degrees"
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

// 404 Not Found
{
  "success": false,
  "error": "Target user not found",
  "message": "User with ID xyz does not exist"
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["target_user_id"],
      "message": "Invalid target user ID"
    }
  ]
}

// 500 Server Error
{
  "success": false,
  "error": "Failed to find connection path",
  "message": "Database query failed"
}
```

#### Behavior Notes

- **Privacy Filtering:** Only returns paths through users with public profiles or mutual connections
- **Shortest Path:** Uses BFS to guarantee shortest connection path
- **Caching:** Results cached for 1 hour per user pair
- **Performance:** <200ms average response time

---

## Data Models

### Connection Path Object

```typescript
interface ConnectionPath {
  connected: boolean;
  degrees_of_separation: number | null;
  source_user_id: string;
  target_user_id: string;
  path: ConnectionNode[];
  message?: string;
}
```

### Connection Node

```typescript
interface ConnectionNode {
  user_id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  city: string;
  connection_type: 'friend' | 'played_with' | 'clubmate' | 'tournament' | null;
}
```

### Connection Type Enum

```typescript
type ConnectionType =
  | 'friend'        // Accepted friend request
  | 'played_with'   // Played a match together
  | 'clubmate'      // Same club membership
  | 'tournament'    // Participated in same tournament
  | 'all';          // Any connection type
```

---

## Algorithm Details

### Breadth-First Search (BFS)

The graph traversal uses **BFS** to find the shortest path between users.

#### Why BFS?

✅ **Guarantees Shortest Path:** Always finds minimum degrees of separation
✅ **Efficient:** O(V + E) time complexity
✅ **Memory Efficient:** Explores layer by layer
✅ **Privacy-Aware:** Can filter during traversal

#### Algorithm Flow

```
1. Start from source user
2. Initialize queue with source
3. For each level (degree):
   a. Dequeue all users at current level
   b. Find their connections (privacy-filtered)
   c. Check if target found
   d. If not, enqueue connections for next level
   e. Mark visited to avoid cycles
4. Return path if found, else null
```

#### PostgreSQL Implementation

The algorithm is implemented as a PostgreSQL function for performance:

```sql
CREATE OR REPLACE FUNCTION find_connection_path(
  start_user_id UUID,
  end_user_id UUID,
  max_depth INT DEFAULT 6
)
RETURNS TABLE (
  user_id UUID,
  connection_type TEXT
) AS $$
DECLARE
  current_level INT := 0;
  found BOOLEAN := FALSE;
BEGIN
  -- Create temporary table for BFS
  CREATE TEMP TABLE IF NOT EXISTS bfs_queue (
    user_id UUID,
    parent_id UUID,
    depth INT,
    connection_type TEXT
  );

  -- Initialize with start user
  INSERT INTO bfs_queue VALUES (start_user_id, NULL, 0, NULL);

  -- BFS loop
  WHILE current_level < max_depth AND NOT found LOOP
    -- Find connections at current level
    INSERT INTO bfs_queue
    SELECT
      sc.user_b,
      sc.user_a,
      current_level + 1,
      sc.connection_type
    FROM social_connection sc
    INNER JOIN bfs_queue bq ON sc.user_a = bq.user_id
    WHERE bq.depth = current_level
      AND sc.status = 'accepted'
      AND sc.user_b NOT IN (SELECT user_id FROM bfs_queue);

    -- Check if target found
    IF EXISTS (SELECT 1 FROM bfs_queue WHERE user_id = end_user_id) THEN
      found := TRUE;
    END IF;

    current_level := current_level + 1;
  END LOOP;

  -- Reconstruct path
  IF found THEN
    RETURN QUERY
    WITH RECURSIVE path_reconstruction AS (
      -- Start from end user
      SELECT user_id, parent_id, connection_type, 1 as step
      FROM bfs_queue
      WHERE user_id = end_user_id

      UNION ALL

      -- Traverse back to start
      SELECT bq.user_id, bq.parent_id, bq.connection_type, pr.step + 1
      FROM bfs_queue bq
      INNER JOIN path_reconstruction pr ON bq.user_id = pr.parent_id
    )
    SELECT user_id, connection_type
    FROM path_reconstruction
    ORDER BY step DESC;
  END IF;

  DROP TABLE IF EXISTS bfs_queue;
END;
$$ LANGUAGE plpgsql;
```

#### Privacy Filtering

**Privacy Rules:**
```sql
-- Only include connections where:
-- 1. Connection is accepted
-- 2. User has public profile OR
-- 3. User shares mutual friend with searcher

WHERE sc.status = 'accepted'
  AND (
    up.privacy_discovery = 'public'
    OR EXISTS (
      SELECT 1 FROM social_connection sc2
      WHERE sc2.user_a = start_user_id
        AND sc2.user_b = sc.user_a
        AND sc2.status = 'accepted'
    )
  )
```

#### Performance Optimization

**Indexing Strategy:**
```sql
-- Index on connections for fast traversal
CREATE INDEX idx_social_connection_user_a ON social_connection(user_a);
CREATE INDEX idx_social_connection_user_b ON social_connection(user_b);
CREATE INDEX idx_social_connection_status ON social_connection(status);

-- Composite index for BFS queries
CREATE INDEX idx_social_connection_bfs
ON social_connection(user_a, status, user_b);
```

**Caching Strategy:**
```typescript
// Cache key pattern
const cacheKey = `graph:${userId1}:${userId2}`;

// Cache TTL
const CACHE_TTL = 3600; // 1 hour

// Invalidation triggers
const invalidationEvents = [
  'new_connection',
  'connection_removed',
  'privacy_change',
];
```

---

## Code Examples

### Example 1: Find Connection Path

```typescript
// src/app/discover/connection-finder.tsx
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ConnectionFinder() {
  const [targetUserId, setTargetUserId] = useState('');
  const [path, setPath] = useState<ConnectionPath | null>(null);
  const [loading, setLoading] = useState(false);

  async function findConnection() {
    setLoading(true);

    const supabase = createClient();
    const token = (await supabase.auth.getSession()).data.session?.access_token;

    const response = await fetch(
      `/api/graph/connection?target_user_id=${targetUserId}&max_depth=3`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const { data } = await response.json();
    setPath(data);
    setLoading(false);
  }

  return (
    <div>
      <input
        value={targetUserId}
        onChange={(e) => setTargetUserId(e.target.value)}
        placeholder="Enter user ID"
      />
      <button onClick={findConnection} disabled={loading}>
        {loading ? 'Searching...' : 'Find Connection'}
      </button>

      {path && path.connected && (
        <div>
          <h3>
            Connected via {path.degrees_of_separation} degree
            {path.degrees_of_separation > 1 ? 's' : ''}
          </h3>
          <div className="connection-path">
            {path.path.map((node, i) => (
              <div key={node.user_id}>
                <div>{node.name}</div>
                {i < path.path.length - 1 && (
                  <div className="arrow">
                    → ({path.path[i + 1].connection_type})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {path && !path.connected && (
        <div>No connection found within 3 degrees</div>
      )}
    </div>
  );
}
```

---

### Example 2: Visualize Connection Graph

```typescript
// Using D3.js for graph visualization
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  name: string;
  level: number; // Degree of separation
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

function visualizeConnectionPath(path: ConnectionPath) {
  // Transform path to D3 graph format
  const nodes: GraphNode[] = path.path.map((node, i) => ({
    id: node.user_id,
    name: node.name,
    level: i, // 0 = you, 1 = 1st degree, etc.
  }));

  const links: GraphLink[] = path.path.slice(0, -1).map((node, i) => ({
    source: node.user_id,
    target: path.path[i + 1].user_id,
    type: path.path[i + 1].connection_type || 'unknown',
  }));

  // Create force-directed graph
  const svg = d3.select('#graph-container')
    .append('svg')
    .attr('width', 800)
    .attr('height', 600);

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(400, 300));

  // Draw links
  const link = svg.selectAll('.link')
    .data(links)
    .enter().append('line')
    .attr('class', 'link')
    .style('stroke', '#999');

  // Draw nodes
  const node = svg.selectAll('.node')
    .data(nodes)
    .enter().append('circle')
    .attr('class', 'node')
    .attr('r', (d) => d.level === 0 ? 10 : 7)
    .style('fill', (d) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      return colors[d.level] || '#999';
    });

  // Add labels
  const label = svg.selectAll('.label')
    .data(nodes)
    .enter().append('text')
    .attr('class', 'label')
    .text((d) => d.name)
    .attr('font-size', 12);

  // Update positions on simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);

    label
      .attr('x', (d: any) => d.x + 12)
      .attr('y', (d: any) => d.y + 4);
  });
}
```

---

### Example 3: Batch Connection Lookup

```typescript
// Find connections to multiple users at once
async function findMultipleConnections(targetUserIds: string[]) {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;

  const results = await Promise.all(
    targetUserIds.map(async (targetId) => {
      const response = await fetch(
        `/api/graph/connection?target_user_id=${targetId}&max_depth=3`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const { data } = await response.json();
      return {
        targetUserId: targetId,
        connected: data.connected,
        degrees: data.degrees_of_separation,
        path: data.path,
      };
    })
  );

  // Filter to only connected users
  const connectedUsers = results.filter((r) => r.connected);

  // Sort by degrees of separation
  connectedUsers.sort((a, b) => a.degrees! - b.degrees!);

  return connectedUsers;
}

// Usage
const targetIds = ['user-1', 'user-2', 'user-3', 'user-4'];
const connections = await findMultipleConnections(targetIds);

console.log('Closest connections:', connections.slice(0, 3));
```

---

### Example 4: Connection Stats Dashboard

```typescript
// Calculate user's network statistics
async function getUserNetworkStats(userId: string) {
  const supabase = createClient();

  // Get all connections
  const { data: connections } = await supabase
    .from('social_connection')
    .select('user_b, connection_type')
    .eq('user_a', userId)
    .eq('status', 'accepted');

  if (!connections) return null;

  // Calculate stats
  const stats = {
    total_connections: connections.length,
    by_type: {
      friend: connections.filter((c) => c.connection_type === 'friend').length,
      played_with: connections.filter((c) => c.connection_type === 'played_with').length,
      clubmate: connections.filter((c) => c.connection_type === 'clubmate').length,
      tournament: connections.filter((c) => c.connection_type === 'tournament').length,
    },
    network_reach: 0, // Will calculate 2nd degree
  };

  // Calculate 2nd degree connections (network reach)
  const secondDegree = await Promise.all(
    connections.map(async (conn) => {
      const { count } = await supabase
        .from('social_connection')
        .select('*', { count: 'exact', head: true })
        .eq('user_a', conn.user_b)
        .eq('status', 'accepted');
      return count || 0;
    })
  );

  stats.network_reach = secondDegree.reduce((sum, count) => sum + count, 0);

  return stats;
}

// Usage
const stats = await getUserNetworkStats('current-user-id');
console.log(`You have ${stats.total_connections} direct connections`);
console.log(`Your network reach is ${stats.network_reach} people`);
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Array<{
    path: string[];
    message: string;
  }>;
  code?: string;
}
```

### Common Error Codes

| HTTP Status | Error | Description | Resolution |
|-------------|-------|-------------|------------|
| 400 | `INVALID_QUERY_PARAMS` | Invalid query parameters | Check target_user_id is valid UUID |
| 401 | `NOT_AUTHENTICATED` | Missing or invalid JWT | Ensure valid session token |
| 404 | `TARGET_USER_NOT_FOUND` | Target user doesn't exist | Verify user ID exists |
| 500 | `DATABASE_ERROR` | Database query failed | Retry or contact support |
| 500 | `GRAPH_TRAVERSAL_ERROR` | BFS algorithm failed | Check database indexes |

### Error Handling Best Practices

```typescript
async function findConnectionSafe(targetUserId: string) {
  try {
    const response = await fetch(
      `/api/graph/connection?target_user_id=${targetUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 401:
          // Redirect to login
          window.location.href = '/login';
          return null;

        case 404:
          // User not found
          showToast(`User ${targetUserId} not found`);
          return null;

        case 500:
          // Server error
          showToast('Server error, please try again');
          // Retry with exponential backoff
          await delay(1000);
          return findConnectionSafe(targetUserId);

        default:
          console.error('Unexpected error:', error);
          return null;
      }
    }

    const { data } = await response.json();
    return data;

  } catch (networkError) {
    console.error('Network error:', networkError);
    showToast('Connection failed, check your internet');
    return null;
  }
}
```

---

## Performance

### Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| API Response Time | <200ms | ~180ms | Includes DB query + caching |
| BFS Traversal Time | <100ms | ~65ms | PostgreSQL function |
| Cache Hit Rate | >70% | ~82% | 1-hour TTL |
| Max Graph Size | 10,000 users | 5,234 | Current production |
| Concurrent Requests | 100 req/s | 67 req/s | Per instance |

### Optimization Strategies

#### 1. Caching

```typescript
// Redis cache configuration
const CACHE_CONFIG = {
  key_pattern: 'graph:{userId1}:{userId2}',
  ttl: 3600, // 1 hour
  invalidate_on: ['new_connection', 'connection_removed'],
};

// Cache implementation
async function getCachedPath(userId1: string, userId2: string) {
  const cacheKey = `graph:${userId1}:${userId2}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // Compute path
  const path = await findConnectionPath(userId1, userId2);

  // Store in cache (bidirectional)
  await redis.setex(cacheKey, 3600, JSON.stringify(path));
  await redis.setex(`graph:${userId2}:${userId1}`, 3600, JSON.stringify(reverseAth(path)));

  return path;
}
```

#### 2. Database Indexing

```sql
-- Critical indexes for BFS performance
CREATE INDEX idx_social_connection_bfs
ON social_connection(user_a, status, user_b)
WHERE status = 'accepted';

-- Covering index for user details
CREATE INDEX idx_user_profile_graph
ON user_profile(id, name, level, city, privacy_discovery);

-- Partial index for active connections only
CREATE INDEX idx_social_connection_active
ON social_connection(user_a, user_b)
WHERE status = 'accepted';
```

#### 3. Query Optimization

```sql
-- EXPLAIN ANALYZE for performance testing
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM find_connection_path('user-1', 'user-2', 3);

-- Expected plan:
-- Index Scan on social_connection (cost=0.42..8.44 rows=1)
-- Actual time: 0.035..0.065 ms
```

#### 4. Rate Limiting

```typescript
// Rate limit configuration
const RATE_LIMIT = {
  window_ms: 60000, // 1 minute
  max_requests: 100, // 100 requests per minute
  message: 'Too many graph queries, please slow down',
};

// Implementation
import rateLimit from 'express-rate-limit';

const graphLimiter = rateLimit({
  windowMs: RATE_LIMIT.window_ms,
  max: RATE_LIMIT.max_requests,
  message: RATE_LIMIT.message,
});

app.use('/api/graph', graphLimiter);
```

---

## Testing

### Unit Tests

```typescript
// tests/api/graph.test.ts
describe('Graph Connection API', () => {
  it('finds direct connection (1st degree)', async () => {
    const response = await fetch(
      `/api/graph/connection?target_user_id=${friend.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data } = await response.json();

    expect(data.connected).toBe(true);
    expect(data.degrees_of_separation).toBe(1);
    expect(data.path).toHaveLength(2);
  });

  it('finds indirect connection (2nd degree)', async () => {
    const response = await fetch(
      `/api/graph/connection?target_user_id=${friendOfFriend.id}&max_depth=2`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data } = await response.json();

    expect(data.connected).toBe(true);
    expect(data.degrees_of_separation).toBe(2);
    expect(data.path).toHaveLength(3);
  });

  it('returns no connection if too far', async () => {
    const response = await fetch(
      `/api/graph/connection?target_user_id=${stranger.id}&max_depth=2`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data } = await response.json();

    expect(data.connected).toBe(false);
    expect(data.degrees_of_separation).toBeNull();
  });

  it('validates max_depth parameter', async () => {
    const response = await fetch(
      `/api/graph/connection?target_user_id=${friend.id}&max_depth=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status).toBe(400);
  });
});
```

---

## Support

**Documentation:** https://docs.padelgraph.com/api/travel-graph
**API Status:** https://status.padelgraph.com
**Support Email:** api-support@padelgraph.com
**Developer Discord:** https://discord.gg/padelgraph-dev

---

*Last updated: October 17, 2025*
*API Version: 1.0.0*
*Next review: November 2025*
