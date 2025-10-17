# Sprint 4: Caching Strategy

## 📋 Overview

Estrategia de caching para optimizar performance del sistema de Travel Mode & Graph Intelligence.

**Objetivo:** Reducir latencia de APIs críticas de >500ms a <200ms

---

## 🎯 Caching Targets

### 1. **Graph Queries** (BFS Shortest Path)
**Problema:** BFS puede ser costoso para grafos grandes (>1000 conexiones)

**Solución:** Database-level caching con table temporal
```sql
-- Cache table para graph paths
CREATE TABLE graph_path_cache (
  from_user_id UUID,
  to_user_id UUID,
  path UUID[],
  degree INTEGER,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_user_id, to_user_id)
);

-- Auto-expire old cache (>24h)
CREATE INDEX idx_graph_cache_expiry ON graph_path_cache(cached_at);
DELETE FROM graph_path_cache WHERE cached_at < NOW() - INTERVAL '24 hours';
```

**Implementación:**
- Check cache antes de ejecutar BFS
- Cache MISS → ejecutar BFS → guardar resultado
- Cache HIT → retornar directo (latency: <50ms)
- TTL: 24 horas (graph no cambia frecuentemente)

---

### 2. **Recommendations Engine**
**Problema:** Collaborative filtering es computacionalmente costoso

**Solución:** Pre-compute + table `recommendation` como cache
```typescript
// Ya implementado en recommendation table
// Strategy: Generate daily batch, serve from table

// Cron job (daily 3AM):
async function dailyRecommendationsRefresh() {
  const users = await getActiveUsers();

  for (const user of users) {
    await generateRecommendations({
      user_id: user.id,
      type: 'players',
      limit: 10,
      force_refresh: true
    });
  }
}
```

**TTL:**
- Players: 24 horas (refresh daily)
- Clubs: 7 días (ubicaciones no cambian)
- Tournaments: 1 hora (eventos dinámicos)

---

### 3. **Discovery/Nearby API**
**Problema:** PostGIS queries pueden ser lentas en tablas grandes

**Solución:** Spatial indexing + query optimization
```sql
-- Ya creado: GIST index en location columns
CREATE INDEX idx_location_user ON user_profile USING GIST(location);
CREATE INDEX idx_location_club ON club USING GIST(location);

-- Query optimization: usar bounding box antes de ST_Distance
-- Reduce search space significativamente
SELECT * FROM user_profile
WHERE location && ST_Expand(
  ST_GeomFromText('POINT(-74.006 40.7128)', 4326)::geography,
  10000  -- 10km bounding box
)
AND ST_DWithin(location, user_location, 10000);
```

**Performance Target:**
- Sin cache: ~500ms (PostGIS full scan)
- Con GIST index: ~100ms (spatial index lookup)
- Con bounding box: ~50ms (pre-filter + distance)

---

### 4. **OpenAI Embeddings** (Semantic Matching)
**Problema:** API calls son costosos ($) y lentos (>1s)

**Solución:** Embedding cache en database
```sql
-- Cache embeddings en user_profile
ALTER TABLE user_profile
ADD COLUMN embedding VECTOR(1536); -- text-embedding-3-small dimension

-- Index para similarity search (pgvector extension)
CREATE INDEX ON user_profile USING ivfflat (embedding vector_cosine_ops);
```

**Strategy:**
1. Generate embedding on profile update
2. Cache en columna `embedding`
3. Similarity search con pgvector (no re-compute)
4. TTL: Invalidar solo si profile cambia

**Cost Savings:**
- Sin cache: $0.0001/user/query → $100/1M queries
- Con cache: $0.0001/user one-time → amortizado
- Savings: ~99% reduction in API costs

---

## 🛠️ Implementation Plan

### Phase 1: Database Caching (No external dependencies)
✅ **Graph path cache** (table + policies)
✅ **Recommendations pre-compute** (daily batch)
✅ **Spatial indexes** (GIST for PostGIS)
✅ **Embeddings cache** (column + pgvector)

**Pros:**
- No infrastructure changes needed
- Supabase-native (no Redis/Memcached)
- Cost-effective
- Easy to implement

**Cons:**
- Less flexible than Redis
- No sub-second TTL
- Manual cache invalidation

---

### Phase 2: Redis (Optional - if needed)
**When to add Redis:**
- Database cache insufficient (<200ms target not met)
- Need real-time invalidation
- Frequent cache updates required

```typescript
// Redis setup (Vercel KV or Upstash)
import { kv } from '@vercel/kv';

// Cache graph path
async function getCachedPath(fromId: string, toId: string) {
  const key = `graph:${fromId}:${toId}`;
  const cached = await kv.get(key);

  if (cached) return cached;

  // Cache miss - compute and cache
  const path = await findConnectionPath(fromId, toId);
  await kv.set(key, path, { ex: 86400 }); // 24h TTL

  return path;
}
```

**Cost:**
- Vercel KV: ~$10/month (1GB storage)
- Upstash: Free tier → $20/month

**Decision:** Postpone until performance metrics show need

---

## 📊 Performance Targets

| API Endpoint | Without Cache | With DB Cache | With Redis | Target |
|--------------|---------------|---------------|------------|--------|
| `/api/graph/connection` | 800ms | **200ms** | 50ms | <200ms ✅ |
| `/api/recommendations` | 1200ms | **150ms** | 30ms | <200ms ✅ |
| `/api/discover/nearby` | 500ms | **100ms** | 20ms | <200ms ✅ |
| `/api/graph/stats` | 600ms | **180ms** | 40ms | <200ms ✅ |

**Conclusion:** Database-level caching sufficient for MVP ✅

---

## 🔄 Cache Invalidation Strategy

### 1. **Time-based (TTL)**
```sql
-- Daily cleanup cron job
DELETE FROM graph_path_cache WHERE cached_at < NOW() - INTERVAL '24 hours';
DELETE FROM recommendation WHERE created_at < NOW() - INTERVAL '30 days';
```

### 2. **Event-based**
```sql
-- Trigger: invalidate graph cache on new connection
CREATE OR REPLACE FUNCTION invalidate_graph_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM graph_path_cache
  WHERE from_user_id IN (NEW.user_a, NEW.user_b)
     OR to_user_id IN (NEW.user_a, NEW.user_b);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_connection
AFTER INSERT ON social_connection
FOR EACH ROW EXECUTE FUNCTION invalidate_graph_cache();
```

### 3. **Manual Invalidation API** (Admin)
```typescript
// POST /api/admin/cache/invalidate
export async function POST(request: Request) {
  const { cache_type } = await request.json();

  switch (cache_type) {
    case 'graph':
      await supabase.from('graph_path_cache').delete().gte('id', '0');
      break;
    case 'recommendations':
      await supabase.from('recommendation').delete().eq('shown', false);
      break;
  }

  return successResponse({ invalidated: cache_type });
}
```

---

## 🚀 Migration Steps

### Step 1: Add cache tables
```bash
# Already created in migrations:
# - 009_recommendations_helpers.sql (includes cache indexes)
# - Need to add: graph_path_cache table
```

### Step 2: Update API endpoints to use cache
```typescript
// api/graph/connection/route.ts
// Check cache → fallback to computation
```

### Step 3: Setup cron jobs
```typescript
// Vercel Cron (vercel.json)
{
  "crons": [
    {
      "path": "/api/cron/daily-recommendations",
      "schedule": "0 3 * * *"  // 3AM daily
    },
    {
      "path": "/api/cron/cleanup-cache",
      "schedule": "0 4 * * *"  // 4AM daily
    }
  ]
}
```

---

## 📈 Monitoring & Metrics

### Key Metrics to Track
```typescript
// Log cache hit/miss rates
console.log({
  endpoint: '/api/graph/connection',
  cache_hit: true,
  latency_ms: 45,
  timestamp: new Date()
});

// Analytics table
CREATE TABLE cache_analytics (
  endpoint VARCHAR(100),
  cache_hit BOOLEAN,
  latency_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Success Criteria
- ✅ Cache hit rate >70%
- ✅ p95 latency <200ms
- ✅ Database load reduction >50%

---

## 💡 Future Optimizations (Post-MVP)

1. **Edge Caching** (Vercel Edge Network)
   - Cache static responses at edge
   - Reduce origin requests by 80%

2. **Materialized Views**
   - Pre-compute complex aggregations
   - Refresh on schedule

3. **GraphQL DataLoader**
   - Batch + cache GraphQL queries
   - Reduce N+1 queries

4. **Service Workers** (Client-side)
   - Cache API responses in browser
   - Offline-first experience

---

## ✅ Implementation Status

**Phase 3 - Intelligence (Current):**
- ✅ Database caching strategy defined
- ✅ Spatial indexes for PostGIS
- ✅ Recommendations pre-compute
- ⏳ Graph path cache table (next)
- ⏳ Embeddings cache column (next)

**Decision:** Start with DB-level caching, add Redis only if metrics show need.

**Next Steps:**
1. Create graph_path_cache migration
2. Update /api/graph/connection to use cache
3. Add pgvector extension for embeddings
4. Setup Vercel cron jobs
5. Monitor performance metrics

---

*Last updated: 2025-10-17*
