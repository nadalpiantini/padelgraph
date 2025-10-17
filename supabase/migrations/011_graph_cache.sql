-- ============================================
-- SPRINT 4: Graph Path Cache
-- Migration: 011_graph_cache.sql
-- Description: Caching layer for BFS graph queries
-- ============================================

-- Graph path cache table
CREATE TABLE IF NOT EXISTS graph_path_cache (
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  path UUID[] NOT NULL,
  degree INTEGER NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_user_id, to_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_graph_cache_expiry
  ON graph_path_cache(cached_at);

CREATE INDEX IF NOT EXISTS idx_graph_cache_from
  ON graph_path_cache(from_user_id);

CREATE INDEX IF NOT EXISTS idx_graph_cache_to
  ON graph_path_cache(to_user_id);

-- Function to get cached path or compute if missing
CREATE OR REPLACE FUNCTION get_connection_path_cached(
  p_from_user UUID,
  p_to_user UUID,
  p_max_depth INTEGER DEFAULT 4
)
RETURNS TABLE (
  path UUID[],
  degree INTEGER,
  from_cache BOOLEAN
) AS $$
DECLARE
  v_cached_path UUID[];
  v_cached_degree INTEGER;
  v_computed_path UUID[];
  v_computed_degree INTEGER;
BEGIN
  -- Try to get from cache
  SELECT gpc.path, gpc.degree
  INTO v_cached_path, v_cached_degree
  FROM graph_path_cache gpc
  WHERE gpc.from_user_id = p_from_user
    AND gpc.to_user_id = p_to_user
    AND gpc.cached_at > NOW() - INTERVAL '24 hours'; -- 24h TTL

  -- If cache hit, return cached result
  IF v_cached_path IS NOT NULL THEN
    RETURN QUERY SELECT v_cached_path, v_cached_degree, true;
    RETURN;
  END IF;

  -- Cache miss - compute path using find_connection_path
  SELECT fcp.path, fcp.degree
  INTO v_computed_path, v_computed_degree
  FROM find_connection_path(p_from_user, p_to_user, p_max_depth) fcp;

  -- If path found, cache it
  IF v_computed_path IS NOT NULL AND array_length(v_computed_path, 1) > 0 THEN
    INSERT INTO graph_path_cache (from_user_id, to_user_id, path, degree)
    VALUES (p_from_user, p_to_user, v_computed_path, v_computed_degree)
    ON CONFLICT (from_user_id, to_user_id)
    DO UPDATE SET
      path = EXCLUDED.path,
      degree = EXCLUDED.degree,
      cached_at = NOW();
  END IF;

  -- Return computed result
  RETURN QUERY SELECT v_computed_path, v_computed_degree, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate graph cache for user
CREATE OR REPLACE FUNCTION invalidate_user_graph_cache(p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM graph_path_cache
  WHERE from_user_id = p_user_id OR to_user_id = p_user_id;

  RAISE NOTICE 'Invalidated graph cache for user: %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-invalidate cache when new connection created
CREATE OR REPLACE FUNCTION trigger_invalidate_graph_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate cache for both users in new connection
  DELETE FROM graph_path_cache
  WHERE from_user_id IN (NEW.user_a, NEW.user_b)
     OR to_user_id IN (NEW.user_a, NEW.user_b);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_connection_invalidate_cache ON social_connection;

CREATE TRIGGER on_new_connection_invalidate_cache
AFTER INSERT ON social_connection
FOR EACH ROW
EXECUTE FUNCTION trigger_invalidate_graph_cache();

-- Cleanup old cache entries (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_graph_cache()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM graph_path_cache
  WHERE cached_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old graph cache entries', deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on graph_path_cache
ALTER TABLE graph_path_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view cached paths they are part of
CREATE POLICY "Users can view own cached paths"
  ON graph_path_cache
  FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  );

-- Policy: System can manage cache
CREATE POLICY "System can manage graph cache"
  ON graph_path_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CACHE ANALYTICS TABLE (optional monitoring)
-- ============================================

CREATE TABLE IF NOT EXISTS cache_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint VARCHAR(100) NOT NULL,
  cache_hit BOOLEAN NOT NULL,
  latency_ms INTEGER,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_analytics_endpoint
  ON cache_analytics(endpoint, created_at DESC);

ALTER TABLE cache_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cache analytics"
  ON cache_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert cache analytics"
  ON cache_analytics
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Sprint 4 Graph Cache Migration Complete';
  RAISE NOTICE 'Table: graph_path_cache with 24h TTL';
  RAISE NOTICE 'Function: get_connection_path_cached (cache-aware)';
  RAISE NOTICE 'Trigger: auto-invalidate on new connections';
  RAISE NOTICE 'Cleanup: cleanup_graph_cache (cron job ready)';
END $$;
