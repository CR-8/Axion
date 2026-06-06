-- Case Monitoring Migration
-- Adds court case monitoring, updates tracking, and notifications

-- 1. case_monitoring: tracks which cases are being monitored
CREATE TABLE IF NOT EXISTS case_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  external_case_number TEXT NOT NULL,
  court_name TEXT,
  last_checked_at TIMESTAMPTZ,
  last_known_update_at TIMESTAMPTZ,
  monitoring_status TEXT NOT NULL DEFAULT 'active'
    CHECK (monitoring_status IN ('active', 'paused', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. case_updates: individual court updates from provider
CREATE TABLE IF NOT EXISTS case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id UUID NOT NULL REFERENCES case_monitoring(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  update_title TEXT NOT NULL,
  update_date TIMESTAMPTZ NOT NULL,
  update_source TEXT NOT NULL DEFAULT 'mock_provider',
  update_content TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. notifications: in-app notification feed
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'court_update',
  title TEXT NOT NULL,
  body TEXT,
  case_id UUID REFERENCES cases(id),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_monitoring_case ON case_monitoring(case_id);
CREATE INDEX IF NOT EXISTS idx_case_monitoring_org ON case_monitoring(org_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_monitoring ON case_updates(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_case ON case_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
