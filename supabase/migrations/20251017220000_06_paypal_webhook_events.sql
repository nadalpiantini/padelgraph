-- Sprint 5 Phase 2: PayPal Webhook Event Logging
-- Migration: 06_paypal_webhook_events
-- Purpose: Idempotency, audit trail, and troubleshooting for PayPal webhooks

-- ==============================================
-- TABLE: paypal_webhook_event
-- ==============================================

CREATE TABLE IF NOT EXISTS paypal_webhook_event (
  -- Primary Key: PayPal event.id (ensures idempotency)
  id TEXT PRIMARY KEY,

  -- Webhook Identification
  transmission_id TEXT,                   -- PAYPAL-TRANSMISSION-ID header
  webhook_id TEXT,                        -- PAYPAL_WEBHOOK_ID env var

  -- Event Classification
  event_type TEXT NOT NULL,               -- e.g., BILLING.SUBSCRIPTION.ACTIVATED
  resource_id TEXT,                       -- subscription_id or payment_id
  resource_type TEXT,                     -- subscription, payment, refund

  -- Verification & Processing Status
  signature_verified BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'received',         -- received|processing|processed|failed|skipped
  error_message TEXT,                     -- Error details if status=failed

  -- Payload & Metadata
  payload JSONB NOT NULL,                 -- Full PayPal webhook payload
  headers JSONB,                          -- Request headers for debugging

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('received', 'processing', 'processed', 'failed', 'skipped')
  )
);

-- ==============================================
-- INDEXES
-- ==============================================

-- Event type lookup (for analytics and filtering)
CREATE INDEX IF NOT EXISTS idx_paypal_event_type
  ON paypal_webhook_event(event_type);

-- Resource tracking (link events to subscriptions/payments)
CREATE INDEX IF NOT EXISTS idx_paypal_event_resource
  ON paypal_webhook_event(resource_id);

-- Status filtering (for admin dashboard and monitoring)
CREATE INDEX IF NOT EXISTS idx_paypal_event_status
  ON paypal_webhook_event(status);

-- Recent events first (for admin logs view)
CREATE INDEX IF NOT EXISTS idx_paypal_event_created
  ON paypal_webhook_event(created_at DESC);

-- Unprocessed events (for retry/monitoring)
CREATE INDEX IF NOT EXISTS idx_paypal_event_unprocessed
  ON paypal_webhook_event(processed)
  WHERE NOT processed;

-- Failed events (for alerting)
CREATE INDEX IF NOT EXISTS idx_paypal_event_failed
  ON paypal_webhook_event(status)
  WHERE status = 'failed';

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE paypal_webhook_event ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhook handler)
CREATE POLICY "Service role full access" ON paypal_webhook_event
  FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view webhook logs (read-only)
CREATE POLICY "Admins can view webhook logs" ON paypal_webhook_event
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get failed webhook count (for monitoring)
CREATE OR REPLACE FUNCTION get_failed_webhook_count(since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours')
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM paypal_webhook_event
  WHERE status = 'failed'
    AND created_at >= since;
$$ LANGUAGE SQL STABLE;

-- Function to get webhook processing stats
CREATE OR REPLACE FUNCTION get_webhook_stats(since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours')
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  last_event_at TIMESTAMPTZ
) AS $$
  SELECT
    status,
    COUNT(*) as count,
    MAX(created_at) as last_event_at
  FROM paypal_webhook_event
  WHERE created_at >= since
  GROUP BY status
  ORDER BY count DESC;
$$ LANGUAGE SQL STABLE;

-- ==============================================
-- COMMENTS (Documentation)
-- ==============================================

COMMENT ON TABLE paypal_webhook_event IS 'PayPal webhook event log for idempotency, audit trail, and troubleshooting. Each event.id from PayPal is stored as PRIMARY KEY to prevent duplicate processing.';

COMMENT ON COLUMN paypal_webhook_event.id IS 'PayPal event.id - serves as idempotency key (prevents duplicate processing)';

COMMENT ON COLUMN paypal_webhook_event.status IS 'Processing status: received (new), processing (in progress), processed (success), failed (error), skipped (duplicate)';

COMMENT ON COLUMN paypal_webhook_event.signature_verified IS 'Whether PayPal webhook signature was successfully verified via /v1/notifications/verify-webhook-signature';

COMMENT ON COLUMN paypal_webhook_event.payload IS 'Full webhook payload from PayPal (JSON) - useful for debugging and reprocessing';

COMMENT ON FUNCTION get_failed_webhook_count IS 'Returns count of failed webhooks within specified timeframe (default: last 24 hours)';

COMMENT ON FUNCTION get_webhook_stats IS 'Returns webhook processing statistics grouped by status';
