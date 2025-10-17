-- Sprint 5: Monetization Database Schema
-- Part 2: Subscriptions, usage tracking, coupons

-- Subscriptions
CREATE TABLE subscription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  paypal_customer_id VARCHAR(100),
  paypal_subscription_id VARCHAR(100) UNIQUE,
  paypal_plan_id VARCHAR(100),
  plan VARCHAR(50) NOT NULL, -- free, pro, premium, club
  status VARCHAR(50) NOT NULL, -- active, cancelled, suspended, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  amount INTEGER,
  currency VARCHAR(3) DEFAULT 'EUR',
  interval VARCHAR(20), -- month, year
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Usage Tracking
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL, -- tournament, auto_match, recommendation, travel_plan
  action VARCHAR(50) NOT NULL, -- create, view, use
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

-- Coupons
CREATE TABLE coupon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20), -- percentage, fixed_amount, free_trial_extension, plan_upgrade
  discount_value DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applicable_plans VARCHAR(50)[],
  first_time_only BOOLEAN DEFAULT false,
  referral_user_id UUID REFERENCES user_profile(user_id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for Phase 2
CREATE INDEX idx_subscription_user ON subscription(user_id);
CREATE INDEX idx_subscription_status ON subscription(status);
CREATE INDEX idx_subscription_paypal_customer ON subscription(paypal_customer_id);
CREATE INDEX idx_subscription_paypal_subscription ON subscription(paypal_subscription_id);
CREATE INDEX idx_usage_log_user ON usage_log(user_id);
CREATE INDEX idx_usage_log_feature ON usage_log(feature);
CREATE INDEX idx_usage_log_timestamp ON usage_log(timestamp);
CREATE INDEX idx_usage_log_period ON usage_log(period_start, period_end);
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_coupon_referral ON coupon(referral_user_id);

-- RLS Policies for Phase 2
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon ENABLE ROW LEVEL SECURITY;

-- subscription policies
CREATE POLICY "Users can view their subscription"
  ON subscription FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON subscription FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

-- usage_log policies
CREATE POLICY "Users can view their usage"
  ON usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

-- coupon policies
CREATE POLICY "Everyone can validate active coupons"
  ON coupon FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Admins can manage coupons"
  ON coupon FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_updated_at
BEFORE UPDATE ON subscription
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
