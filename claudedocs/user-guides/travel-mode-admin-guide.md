# Travel Mode - Admin Guide

**Version:** 1.0.0
**Last Updated:** October 17, 2025
**Audience:** Platform Administrators & Support Team

---

## 📖 Table of Contents

1. [Admin Overview](#admin-overview)
2. [Dashboard & Monitoring](#dashboard--monitoring)
3. [User Management](#user-management)
4. [System Configuration](#system-configuration)
5. [Data Management](#data-management)
6. [Performance Optimization](#performance-optimization)
7. [Security & Privacy](#security--privacy)
8. [Troubleshooting](#troubleshooting)
9. [Analytics & Reporting](#analytics--reporting)

---

## Admin Overview

### What Admins Can Do

As a Padelgraph administrator, you can:

✅ **Monitor** Travel Mode usage and performance
✅ **Manage** user privacy settings and data
✅ **Configure** recommendation algorithms and thresholds
✅ **Optimize** cache strategies and database queries
✅ **Analyze** user behavior and engagement metrics
✅ **Troubleshoot** user-reported issues
✅ **Enforce** safety policies and content moderation

### Admin Access Levels

| Role | Permissions | Use Cases |
|------|-------------|-----------|
| **Super Admin** | Full system access | System configuration, database |
| **Operations Admin** | Monitoring, user support | Daily operations, user issues |
| **Analytics Admin** | Read-only metrics | Business intelligence, reporting |
| **Support Agent** | User management only | Customer support tickets |

---

## Dashboard & Monitoring

### Admin Dashboard Access

**URL:** `https://padelgraph.com/admin/dashboard`

**Login:**
```bash
# Production
Email: admin@padelgraph.com
Password: [Use 1Password vault]

# Staging
Email: admin@staging.padelgraph.com
Password: [Use 1Password vault]
```

### Key Metrics to Monitor

#### 1. Travel Mode Adoption

**Dashboard Path:** Admin → Analytics → Travel Mode

**Metrics:**
```
Active Travel Plans: 1,234
New This Week: 89 (+7%)
Total Users Enabled: 5,678
Avg Trip Duration: 5.2 days
Top Destinations: Barcelona (234), Madrid (189), Valencia (156)
```

**Charts:**
- Daily active travel plans (line chart)
- Destination popularity (bar chart)
- User growth over time (area chart)

---

#### 2. Recommendations Performance

**Dashboard Path:** Admin → Recommendations → Performance

**Metrics:**
```
Daily Recommendations Generated: 12,456
Acceptance Rate: 34%
Click-Through Rate: 67%
Average Response Time: 145ms (target: <200ms)
Cache Hit Rate: 78% (target: >70%)
```

**Alerts:**
- 🔴 Response time >200ms
- 🟡 Cache hit rate <70%
- 🟡 Acceptance rate <30%

---

#### 3. System Health

**Dashboard Path:** Admin → System → Health

**Metrics:**
```
API Uptime: 99.97%
Database Connections: 234 / 500 (healthy)
Cache Memory Usage: 1.2GB / 2GB (60%)
Background Jobs: 12 pending (normal)
Error Rate: 0.03% (target: <0.1%)
```

**Real-Time Monitoring:**
```bash
# Check API health
curl https://api.padelgraph.com/health

# Expected response
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "recommendations": "up"
  },
  "timestamp": "2025-10-17T10:30:00Z"
}
```

---

### Setting Up Alerts

**Configure in:** Admin → Settings → Alerts

**Critical Alerts (SMS + Email):**
- API response time >500ms for 5 minutes
- Error rate >1% for 2 minutes
- Database connections >90% capacity
- Cache memory >90%

**Warning Alerts (Email only):**
- Recommendation acceptance rate <25%
- Cache hit rate <60%
- Background job queue >100 pending

**Alert Channels:**
```yaml
# config/alerts.yml
channels:
  critical:
    - sms: +34-XXX-XXX-XXX (on-call admin)
    - email: ops@padelgraph.com
    - slack: #critical-alerts

  warning:
    - email: team@padelgraph.com
    - slack: #monitoring
```

---

## User Management

### Managing Travel Plans

**View Active Travel Plans:**

**Dashboard Path:** Admin → Users → Travel Plans

**Filters:**
- Status: Active / Expired / Cancelled
- Destination: City name
- Date Range: Created between X and Y
- User: By email or ID

**Actions:**
```
✏️ Edit - Modify destination or dates
🗑️ Cancel - End travel plan early
📧 Contact - Send message to user
📊 View Stats - See user's recommendations & matches
```

---

### User Privacy Management

**Dashboard Path:** Admin → Users → Privacy

**View User Privacy Settings:**
```sql
-- Query user privacy settings
SELECT
  u.id,
  u.email,
  up.location_visibility,
  up.auto_match_enabled,
  up.discovery_enabled
FROM users u
JOIN user_privacy up ON u.id = up.user_id
WHERE u.email = 'user@example.com';
```

**Privacy Actions:**

1. **Force Privacy Mode** (GDPR compliance)
   - User requests data deletion
   - Set `discovery_enabled = false`
   - Clear recommendation cache

2. **Export User Data** (GDPR right to access)
   ```bash
   # Run data export script
   npm run admin:export-user-data -- --email user@example.com

   # Output: JSON file with all user data
   # Includes: travel plans, recommendations, connections
   ```

3. **Delete User Data** (GDPR right to erasure)
   ```bash
   # Run deletion script (IRREVERSIBLE)
   npm run admin:delete-user-data -- --email user@example.com --confirm

   # Deletes: travel plans, recommendations, cached data
   # Keeps: Anonymized analytics data
   ```

---

### Handling User Reports

**Dashboard Path:** Admin → Support → Reports

**Report Types:**

| Type | Severity | Response Time | Action |
|------|----------|---------------|--------|
| Harassment | 🔴 Critical | <2 hours | Suspend user, investigate |
| Fake Profile | 🟡 High | <24 hours | Request verification |
| Spam | 🟢 Medium | <48 hours | Warn user, rate limit |
| Bug Report | 🟢 Low | <72 hours | Create ticket, investigate |

**Report Workflow:**

1. **Receive Report** (auto-creates ticket)
2. **Review Evidence** (screenshots, messages)
3. **Take Action:**
   - **Suspend User:** Block immediately, investigate later
   - **Warn User:** Send warning message, log violation
   - **Dismiss:** No action, mark as resolved
4. **Notify Reporter** (within 24 hours)
5. **Follow Up** (after 7 days if needed)

**Suspension Actions:**
```bash
# Suspend user account
npm run admin:suspend-user -- --email user@example.com --reason "harassment" --duration 7d

# Permanent ban
npm run admin:ban-user -- --email user@example.com --reason "repeated violations"
```

---

## System Configuration

### Recommendation Algorithm Tuning

**Config File:** `config/recommendations.yml`

**Key Parameters:**

```yaml
recommendations:
  player_recommendations:
    max_results: 10
    skill_level_tolerance: 1  # ±1 level (e.g., intermediate can match beginner/advanced)
    distance_radius_km: 10
    min_similarity_score: 0.6  # 0-1 scale
    cache_ttl_hours: 24

  club_recommendations:
    max_results: 5
    distance_radius_km: 10
    min_rating: 3.5  # 1-5 scale
    cache_ttl_hours: 12

  tournament_recommendations:
    max_results: 3
    skill_level_match: true  # Only show matching skill tournaments
    date_range_days: 30  # Look ahead 30 days
    cache_ttl_hours: 6
```

**Adjusting Thresholds:**

1. **Increase Match Quality** (fewer but better recommendations)
   ```yaml
   min_similarity_score: 0.7  # Was 0.6
   skill_level_tolerance: 0    # Exact match only
   ```

2. **Increase Match Quantity** (more recommendations, lower quality)
   ```yaml
   min_similarity_score: 0.5  # Was 0.6
   skill_level_tolerance: 2    # ±2 levels
   distance_radius_km: 20      # Was 10km
   ```

3. **Apply Changes:**
   ```bash
   # Staging
   npm run config:apply -- --env staging

   # Production (requires approval)
   npm run config:apply -- --env production --approve
   ```

---

### Auto-Match Configuration

**Config File:** `config/auto-match.yml`

**Rate Limits:**

```yaml
auto_match:
  rate_limits:
    max_per_week: 3
    max_per_month: 10
    cooldown_hours: 24  # Wait 24h between matches

  compatibility:
    min_score: 0.7  # 0-1 scale
    skill_level_tolerance: 1
    location_radius_km: 5

  message_templates:
    default: "Hi! 👋 We both play padel in {city}..."
    skill_match: "Hey! We're both {skill_level} players..."
    mutual_friend: "Hi! We have {mutual_friend} in common..."
```

**Template Management:**

1. **Add New Template:**
   ```yaml
   tournament: "Saw you're interested in {tournament_name}. Want to team up?"
   ```

2. **Test Template:**
   ```bash
   npm run admin:test-template -- --template tournament --user-id test-user-1
   ```

3. **Deploy Templates:**
   ```bash
   npm run admin:deploy-templates -- --env production
   ```

---

### Cache Strategy Configuration

**Config File:** `config/cache.yml`

**Cache Layers:**

```yaml
cache:
  redis:
    host: redis.padelgraph.com
    port: 6379
    ttl_default: 3600  # 1 hour
    max_memory: 2gb
    eviction_policy: allkeys-lru

  layers:
    recommendations:
      ttl: 86400  # 24 hours
      key_pattern: "rec:{user_id}:{type}"
      invalidate_on: [profile_update, location_change]

    graph_connections:
      ttl: 3600  # 1 hour
      key_pattern: "graph:{user_id}:connections"
      invalidate_on: [new_connection, connection_removed]

    discovery_feed:
      ttl: 1800  # 30 minutes
      key_pattern: "discover:{city}:{user_id}"
      invalidate_on: [travel_plan_change]
```

**Cache Management Commands:**

```bash
# View cache stats
npm run admin:cache-stats

# Clear specific cache
npm run admin:cache-clear -- --pattern "rec:*"

# Clear all caches (use with caution!)
npm run admin:cache-clear -- --all --confirm

# Warm up cache for popular destinations
npm run admin:cache-warmup -- --cities "Barcelona,Madrid,Valencia"
```

---

## Data Management

### Database Access

**Production Database:**
```bash
# Connect via Supabase CLI
supabase db remote connect

# Or direct PostgreSQL
psql postgresql://postgres:[PASSWORD]@db.padelgraph.com:5432/postgres
```

**Common Queries:**

#### 1. View Active Travel Plans
```sql
SELECT
  tp.id,
  u.email,
  tp.destination,
  tp.start_date,
  tp.end_date,
  tp.status
FROM travel_plans tp
JOIN users u ON tp.user_id = u.id
WHERE tp.status = 'active'
ORDER BY tp.start_date DESC
LIMIT 20;
```

#### 2. Recommendation Performance by City
```sql
SELECT
  destination,
  COUNT(*) as total_recommendations,
  AVG(CASE WHEN accepted THEN 1.0 ELSE 0.0 END) as acceptance_rate
FROM recommendations r
JOIN travel_plans tp ON r.travel_plan_id = tp.id
WHERE r.created_at > NOW() - INTERVAL '7 days'
GROUP BY destination
ORDER BY total_recommendations DESC;
```

#### 3. User Connection Graph Stats
```sql
SELECT
  user_id,
  COUNT(*) as total_connections,
  COUNT(CASE WHEN degree = 1 THEN 1 END) as direct_connections,
  COUNT(CASE WHEN degree = 2 THEN 1 END) as second_degree,
  COUNT(CASE WHEN degree = 3 THEN 1 END) as third_degree
FROM user_connections_graph
GROUP BY user_id
ORDER BY total_connections DESC
LIMIT 10;
```

---

### Data Cleanup Scripts

**Run Weekly Maintenance:**

```bash
# Clean expired travel plans
npm run admin:cleanup -- --task expired-travel-plans

# Archive old recommendations (>90 days)
npm run admin:cleanup -- --task archive-recommendations

# Clear stale cache entries
npm run admin:cleanup -- --task clear-stale-cache

# Run all cleanup tasks
npm run admin:cleanup -- --all
```

**Cleanup Config:**
```yaml
# config/cleanup.yml
cleanup:
  expired_travel_plans:
    delete_after_days: 30  # Keep 30 days after expiry

  recommendations:
    archive_after_days: 90
    delete_archived_after_days: 365

  cache:
    clear_unused_after_hours: 72
```

---

## Performance Optimization

### Database Query Optimization

**Slow Query Detection:**

```sql
-- Find slow queries (>100ms)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Indexing Strategy:**

```sql
-- Create indexes for common queries
CREATE INDEX idx_travel_plans_destination ON travel_plans(destination);
CREATE INDEX idx_travel_plans_dates ON travel_plans(start_date, end_date);
CREATE INDEX idx_recommendations_user ON recommendations(user_id, created_at);
CREATE INDEX idx_user_connections_graph ON user_connections_graph(user_id, degree);

-- PostGIS spatial index for nearby queries
CREATE INDEX idx_users_location ON users USING GIST(location);
```

**Query Performance Tips:**

1. **Use EXPLAIN ANALYZE** to understand query plans
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM recommendations
   WHERE user_id = 'xxx' AND created_at > NOW() - INTERVAL '7 days';
   ```

2. **Add indexes** for frequently filtered columns
3. **Use materialized views** for complex aggregations
4. **Partition large tables** by date

---

### API Performance Tuning

**Response Time Targets:**

| Endpoint | Target | Current | Status |
|----------|--------|---------|--------|
| `/api/graph/connection` | <200ms | 180ms | ✅ |
| `/api/recommendations` | <200ms | 145ms | ✅ |
| `/api/discover/nearby` | <200ms | 95ms | ✅ |
| `/api/auto-match/trigger` | <500ms | 450ms | ✅ |

**Optimization Strategies:**

1. **Enable Query Caching:**
   ```typescript
   // config/api.ts
   export const cacheConfig = {
     recommendations: { ttl: 86400 }, // 24h
     graph: { ttl: 3600 },            // 1h
     discovery: { ttl: 1800 },        // 30min
   };
   ```

2. **Use Connection Pooling:**
   ```typescript
   // config/database.ts
   export const poolConfig = {
     min: 2,
     max: 10,
     idleTimeoutMillis: 30000,
   };
   ```

3. **Implement Rate Limiting:**
   ```typescript
   // config/rate-limit.ts
   export const rateLimitConfig = {
     windowMs: 60000,      // 1 minute
     max: 100,             // 100 requests per minute
     standardHeaders: true,
   };
   ```

---

### Caching Optimization

**Monitor Cache Performance:**

```bash
# View cache stats
redis-cli INFO stats

# Expected output
keyspace_hits: 12456
keyspace_misses: 3456
hit_rate: 78%  # Target: >70%
```

**Cache Warming Strategy:**

```bash
# Warm up cache for popular destinations
npm run admin:cache-warmup -- --destinations "Barcelona,Madrid,Valencia"

# Warm up user recommendations (run nightly)
npm run admin:cache-warmup -- --type recommendations --batch-size 1000
```

**Cache Invalidation:**

```typescript
// Automatic invalidation triggers
const invalidationRules = {
  profile_update: ['rec:*', 'graph:*'],
  new_connection: ['graph:*', 'discover:*'],
  travel_plan_change: ['rec:*', 'discover:*'],
};
```

---

## Security & Privacy

### RLS (Row Level Security) Policies

**Verify RLS is Enabled:**

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('travel_plans', 'recommendations', 'user_connections_graph');

-- All should show: rowsecurity = true
```

**RLS Policy Examples:**

```sql
-- Users can only see their own travel plans
CREATE POLICY travel_plans_select_policy ON travel_plans
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only see recommendations for their travel plans
CREATE POLICY recommendations_select_policy ON recommendations
FOR SELECT
USING (
  user_id = auth.uid()
  OR travel_plan_id IN (
    SELECT id FROM travel_plans WHERE user_id = auth.uid()
  )
);
```

**Test RLS Policies:**

```bash
# Run RLS test suite
npm run test:rls

# Test specific policy
npm run test:rls -- --policy travel_plans_select_policy
```

---

### Data Privacy Compliance (GDPR)

**GDPR Requirements:**

1. **Right to Access** (Article 15)
   ```bash
   npm run admin:export-user-data -- --email user@example.com
   ```

2. **Right to Erasure** (Article 17)
   ```bash
   npm run admin:delete-user-data -- --email user@example.com --confirm
   ```

3. **Right to Portability** (Article 20)
   ```bash
   npm run admin:export-user-data -- --email user@example.com --format json
   ```

4. **Data Breach Notification** (Article 33)
   - Notify users within 72 hours
   - Use: `npm run admin:notify-breach -- --users affected-users.csv`

**Data Retention Policy:**

```yaml
# config/data-retention.yml
retention:
  travel_plans:
    active: infinite
    expired: 30_days

  recommendations:
    active: 90_days
    archived: 365_days

  user_data:
    inactive_accounts: 2_years  # Delete after 2 years of inactivity
```

---

### Security Monitoring

**Security Alerts:**

| Alert Type | Trigger | Action |
|------------|---------|--------|
| Multiple Failed Logins | >5 in 10min | Auto-lock account |
| Unusual API Usage | >1000 req/min | Rate limit + investigate |
| Data Export Request | Any request | Log + notify security team |
| RLS Policy Bypass Attempt | Any attempt | Block + alert |

**Security Audit Log:**

```bash
# View security events
npm run admin:security-audit -- --days 7

# Search for specific events
npm run admin:security-audit -- --event "failed_login" --user user@example.com
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Recommendations Not Updating

**Symptoms:**
- Users report stale recommendations
- Cache hit rate >95% (too high)

**Diagnosis:**
```bash
# Check cache TTL
redis-cli TTL "rec:user-123:players"

# Check last update time
redis-cli HGET "rec:user-123:players" "updated_at"
```

**Solution:**
```bash
# Clear specific user cache
npm run admin:cache-clear -- --pattern "rec:user-123:*"

# Force regenerate recommendations
npm run admin:regenerate-recommendations -- --user-id user-123
```

---

#### Issue 2: Slow Graph Connection Queries

**Symptoms:**
- `/api/graph/connection` >200ms
- Database CPU high

**Diagnosis:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM user_connections_graph
WHERE user_id = 'user-123' AND target_user_id = 'user-456';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'user_connections_graph';
```

**Solution:**
```sql
-- Add missing index
CREATE INDEX idx_graph_target ON user_connections_graph(target_user_id);

-- Rebuild graph cache
```
```bash
npm run admin:rebuild-graph-cache -- --user-id user-123
```

---

#### Issue 3: Auto-Match Rate Limit Not Working

**Symptoms:**
- Users report receiving >3 matches/week
- Rate limit bypass

**Diagnosis:**
```sql
-- Check auto-match history
SELECT user_id, COUNT(*) as matches_this_week
FROM auto_matches
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 3;
```

**Solution:**
```bash
# Fix rate limit logic (code patch)
# Apply hotfix to production

# Manually reset user rate limits
npm run admin:reset-rate-limit -- --user-id user-123 --reason "bug-fix"
```

---

### Emergency Procedures

#### Procedure 1: System Outage

**Steps:**
1. **Check Status Page:** status.padelgraph.com
2. **Verify Services:**
   ```bash
   curl https://api.padelgraph.com/health
   ```
3. **Check Dependencies:**
   - Supabase: supabase.com/status
   - Redis: Check admin dashboard
   - Vercel: vercel.com/status

4. **Escalate:**
   - Notify on-call engineer
   - Update status page
   - Notify users if >10min outage

---

#### Procedure 2: Data Breach

**Steps:**
1. **Isolate:** Disconnect affected systems
2. **Assess:** Determine scope of breach
3. **Notify:**
   - Legal team (immediately)
   - Affected users (within 72 hours - GDPR)
   - Regulators (if required)
4. **Remediate:** Fix vulnerability
5. **Document:** Complete incident report

---

## Analytics & Reporting

### Weekly Reports

**Auto-Generated Reports:**

```bash
# Generate weekly report
npm run admin:generate-report -- --type weekly --email team@padelgraph.com

# Report includes:
# - Active travel plans
# - Recommendations performance
# - User engagement metrics
# - System health summary
```

**Sample Report Output:**

```markdown
# Padelgraph Weekly Report
Week of Oct 10-17, 2025

## Travel Mode
- Active Plans: 1,234 (+12% from last week)
- New Plans: 156
- Top Destinations: Barcelona (89), Madrid (67)

## Recommendations
- Generated: 8,456
- Acceptance Rate: 34% (+2%)
- Click-Through Rate: 67%

## System Health
- Uptime: 99.97%
- Avg API Response: 145ms
- Cache Hit Rate: 78%
```

---

### Custom Analytics Queries

**User Engagement:**

```sql
-- Travel Mode adoption by signup cohort
SELECT
  DATE_TRUNC('month', u.created_at) as cohort_month,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT tp.user_id) as travel_mode_users,
  ROUND(100.0 * COUNT(DISTINCT tp.user_id) / COUNT(DISTINCT u.id), 2) as adoption_rate
FROM users u
LEFT JOIN travel_plans tp ON u.id = tp.user_id
WHERE u.created_at > NOW() - INTERVAL '12 months'
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

**Recommendation Effectiveness:**

```sql
-- Conversion funnel
SELECT
  COUNT(*) as recommendations_shown,
  SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN matched THEN 1 ELSE 0 END) as matched,
  ROUND(100.0 * SUM(CASE WHEN clicked THEN 1 ELSE 0 END) / COUNT(*), 2) as ctr,
  ROUND(100.0 * SUM(CASE WHEN matched THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
FROM recommendations
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 🆘 Admin Support

### Internal Documentation

- **Runbooks:** `/docs/runbooks/`
- **API Docs:** `/docs/api/`
- **Database Schema:** `/docs/database/`

### Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical Outage | On-call Engineer | <15 minutes |
| Data Breach | Security Team | <30 minutes |
| Legal/GDPR | Legal Team | <2 hours |
| Performance | DevOps Team | <1 hour |

### Support Channels

- **Slack:** #admin-support
- **Email:** admin-support@padelgraph.com
- **On-Call:** [PagerDuty rotation]

---

*Last updated: October 17, 2025*
*Version: 1.0.0*
*Next review: November 2025*
