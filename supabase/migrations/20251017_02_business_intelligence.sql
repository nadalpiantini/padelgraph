-- Sprint 5: Business Intelligence Database Schema
-- Part 3: Analytics events, sessions, funnels, metrics, campaigns, experiments

-- Analytics Events
CREATE TABLE analytics_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES user_profile(user_id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  properties JSONB,
  page_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- User Sessions
CREATE TABLE user_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES user_profile(user_id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 1,
  events_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  entry_url TEXT,
  exit_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- Funnel Steps
CREATE TABLE funnel_step (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_name VARCHAR(50) NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  step_order INTEGER NOT NULL,
  user_id UUID REFERENCES user_profile(user_id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  properties JSONB
);

-- Business Metrics (daily snapshots)
CREATE TABLE business_metric (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name, date)
);

-- Email Campaigns
CREATE TABLE email_campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  campaign_type VARCHAR(50), -- onboarding, retention, reengagement, promotional
  trigger_type VARCHAR(50), -- time_based, event_based, manual
  subject_line VARCHAR(200),
  body_template TEXT,
  target_segment VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing Experiments
CREATE TABLE experiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  success_metric VARCHAR(100) NOT NULL,
  variants JSONB NOT NULL, -- {control: {...}, treatment: {...}}
  allocation DECIMAL(3,2) DEFAULT 0.5, -- 50/50 split
  status VARCHAR(20) DEFAULT 'draft', -- draft, running, completed, archived
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment Assignments
CREATE TABLE experiment_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiment(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  variant VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  UNIQUE(experiment_id, user_id)
);

-- Indexes for Phase 3
CREATE INDEX idx_analytics_event_timestamp ON analytics_event(timestamp DESC);
CREATE INDEX idx_analytics_event_user ON analytics_event(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_event(event_name);
CREATE INDEX idx_analytics_event_session ON analytics_event(session_id);
CREATE INDEX idx_user_session_started ON user_session(started_at DESC);
CREATE INDEX idx_user_session_user ON user_session(user_id);
CREATE INDEX idx_user_session_id ON user_session(session_id);
CREATE INDEX idx_funnel_step_funnel ON funnel_step(funnel_name, step_order);
CREATE INDEX idx_funnel_step_user ON funnel_step(user_id);
CREATE INDEX idx_funnel_step_completed ON funnel_step(completed_at DESC);
CREATE INDEX idx_business_metric_name_date ON business_metric(metric_name, date DESC);
CREATE INDEX idx_email_campaign_type ON email_campaign(campaign_type);
CREATE INDEX idx_experiment_status ON experiment(status);
CREATE INDEX idx_experiment_assignment_user ON experiment_assignment(user_id);
CREATE INDEX idx_experiment_assignment_experiment ON experiment_assignment(experiment_id);

-- RLS Policies for Phase 3
ALTER TABLE analytics_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignment ENABLE ROW LEVEL SECURITY;

-- Admin-only access for business intelligence tables
CREATE POLICY "Admins can view analytics events"
  ON analytics_event FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can view sessions"
  ON user_session FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can view funnel steps"
  ON funnel_step FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can view business metrics"
  ON business_metric FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage email campaigns"
  ON email_campaign FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage experiments"
  ON experiment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.user_id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

CREATE POLICY "Users can view their experiment assignments"
  ON experiment_assignment FOR SELECT
  USING (auth.uid() = user_id);
