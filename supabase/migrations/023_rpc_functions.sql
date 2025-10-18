-- ============================================================================
-- PADELGRAPH RPC FUNCTIONS
-- ============================================================================
-- Trending posts, People suggestions, Shortest path BFS
-- ============================================================================

-- ============================================================================
-- 1. TRENDING POSTS
-- ============================================================================

CREATE OR REPLACE FUNCTION padelgraph_trending_posts(
  p_window INTERVAL DEFAULT INTERVAL '3 days',
  p_limit INT DEFAULT 50
) RETURNS TABLE(
  id UUID,
  user_id UUID,
  content TEXT,
  media_urls TEXT[],
  created_at TIMESTAMPTZ,
  likes_count INT,
  comments_count INT,
  score NUMERIC
) LANGUAGE SQL STABLE AS $$
  WITH l AS (
    SELECT post_id, COUNT(*)::INT AS likes FROM post_like GROUP BY 1
  ), c AS (
    SELECT post_id, COUNT(*)::INT AS comments FROM post_comment GROUP BY 1
  )
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.media_urls,
    p.created_at,
    COALESCE(l.likes, 0) AS likes_count,
    COALESCE(c.comments, 0) AS comments_count,
    (
      COALESCE(l.likes, 0) * 2 +
      COALESCE(c.comments, 0) +
      GREATEST(0, 48 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600)::NUMERIC * 0.1
    ) AS score
  FROM post p
  LEFT JOIN l ON l.post_id = p.id
  LEFT JOIN c ON c.post_id = p.id
  WHERE p.created_at > NOW() - p_window
    AND p.visibility = 'public'
  ORDER BY score DESC, p.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- 2. PEOPLE YOU MAY PLAY
-- ============================================================================

-- Enable earthdistance extension if not already
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE OR REPLACE FUNCTION padelgraph_people_you_may_play(
  p_user UUID,
  p_city TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  city TEXT,
  level NUMERIC,
  distance_km NUMERIC,
  mutuals INT
) LANGUAGE SQL STABLE AS $$
  WITH me AS (
    SELECT up.id, up.lat, up.lng, up.city, up.level
    FROM user_profile up
    WHERE up.id = p_user
  ),
  -- Direct friends I follow OR who follow me
  f1 AS (
    SELECT following_id AS id FROM follow WHERE follower_id = p_user
    UNION
    SELECT follower_id AS id FROM follow WHERE following_id = p_user
  ),
  -- Friends of friends
  f2 AS (
    SELECT DISTINCT following_id AS id FROM follow WHERE follower_id IN (SELECT id FROM f1)
    UNION
    SELECT DISTINCT follower_id AS id FROM follow WHERE following_id IN (SELECT id FROM f1)
  ),
  candidates AS (
    SELECT up.id, up.name, up.email, up.city, up.level, up.lat, up.lng
    FROM user_profile up
    WHERE up.id <> p_user
      AND (p_city IS NULL OR up.city = p_city)
      AND up.id NOT IN (SELECT id FROM f1)
  ),
  scored AS (
    SELECT
      c.id,
      c.name,
      c.email,
      c.city,
      c.level,
      CASE
        WHEN (SELECT lat FROM me) IS NOT NULL AND c.lat IS NOT NULL THEN
          earth_distance(
            ll_to_earth((SELECT lat FROM me), (SELECT lng FROM me)),
            ll_to_earth(c.lat, c.lng)
          ) / 1000.0
        ELSE NULL
      END AS distance_km,
      (
        SELECT COUNT(*) FROM (
          SELECT following_id AS id FROM follow WHERE follower_id = c.id
          UNION ALL
          SELECT follower_id AS id FROM follow WHERE following_id = c.id
        ) cx
        WHERE cx.id IN (SELECT id FROM f1)
      )::INT AS mutuals
    FROM candidates c
  )
  SELECT * FROM scored
  ORDER BY COALESCE(mutuals, 0) DESC, COALESCE(distance_km, 1e9) ASC, COALESCE(level, 0) DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- 3. GRAPH EDGE TABLE (for Six Degrees)
-- ============================================================================

CREATE TABLE IF NOT EXISTS graph_edge (
  src UUID NOT NULL,
  dst UUID NOT NULL,
  kind TEXT DEFAULT 'relation',
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (src, dst)
);

CREATE INDEX IF NOT EXISTS idx_graph_edge_src ON graph_edge(src);
CREATE INDEX IF NOT EXISTS idx_graph_edge_dst ON graph_edge(dst);

-- Bidirectional trigger (insert reverse edge automatically)
CREATE OR REPLACE FUNCTION graph_edge_bidirectional()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO graph_edge(src, dst, kind, weight)
    VALUES (NEW.dst, NEW.src, NEW.kind, NEW.weight)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END$$;

CREATE TRIGGER tr_graph_edge_bidir
  AFTER INSERT ON graph_edge
  FOR EACH ROW EXECUTE FUNCTION graph_edge_bidirectional();

-- ============================================================================
-- 4. SHORTEST PATH BFS
-- ============================================================================

CREATE OR REPLACE FUNCTION padelgraph_shortest_path(
  p_from UUID,
  p_to UUID,
  p_max_depth INT DEFAULT 6
) RETURNS TABLE(step INT, node UUID) LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE bfs AS (
    SELECT 0 AS step, p_from AS node, ARRAY[p_from] AS path
    UNION ALL
    SELECT b.step + 1, ge.dst AS node, b.path || ge.dst
    FROM bfs b
    JOIN graph_edge ge ON ge.src = b.node
    WHERE b.step < p_max_depth
      AND NOT ge.dst = ANY(b.path)
  ), target AS (
    SELECT * FROM bfs WHERE node = p_to ORDER BY step ASC LIMIT 1
  )
  SELECT t.step, UNNEST(t.path) AS node
  FROM target t;
$$;

-- ============================================================================
-- 5. PROFILE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION padelgraph_profile_counts(p_user UUID)
RETURNS TABLE(followers INT, following INT, posts INT) LANGUAGE SQL STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM follow WHERE following_id = p_user)::INT AS followers,
    (SELECT COUNT(*) FROM follow WHERE follower_id = p_user)::INT AS following,
    (SELECT COUNT(*) FROM post WHERE user_id = p_user)::INT AS posts;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Usage examples:
-- SELECT * FROM padelgraph_trending_posts();
-- SELECT * FROM padelgraph_people_you_may_play('USER-UUID');
-- SELECT * FROM padelgraph_shortest_path('FROM-UUID', 'TO-UUID', 6);
-- SELECT * FROM padelgraph_profile_counts('USER-UUID');
-- ============================================================================
