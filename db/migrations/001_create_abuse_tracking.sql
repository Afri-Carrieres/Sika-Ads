-- Create user_abuse_tracking table
CREATE TABLE IF NOT EXISTS user_abuse_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Counters
  rejected_submissions INT DEFAULT 0,
  rejected_campaigns INT DEFAULT 0,
  warnings_count INT DEFAULT 0,
  
  -- Suspension status
  is_suspended BOOLEAN DEFAULT false,
  suspension_reason VARCHAR(300),
  suspension_until TIMESTAMP,
  
  -- Tracking
  last_violation TIMESTAMP,
  last_violation_type VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_abuse_user_id ON user_abuse_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_abuse_suspended ON user_abuse_tracking(is_suspended, suspension_until);

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER trigger_user_abuse_updated
BEFORE UPDATE ON user_abuse_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add columns to campaigns table if they don't exist
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Create campaign_submissions table
CREATE TABLE IF NOT EXISTS campaign_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Proof image
  image_url VARCHAR(500) NOT NULL,
  image_size INT,
  image_hash VARCHAR(64),
  image_resolution VARCHAR(20),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, suspended
  rejection_reason VARCHAR(500),
  
  -- Content verification (Phase 2 - AI scoring)
  content_score FLOAT,
  content_analysis JSONB, -- Store AI analysis results
  flagged_for_review BOOLEAN DEFAULT false,
  
  -- Admin review
  admin_review_status VARCHAR(50),
  admin_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  
  -- Metadata
  user_ip_address INET,
  user_agent TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_campaign ON campaign_submissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON campaign_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON campaign_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_hash ON campaign_submissions(image_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_flagged ON campaign_submissions(flagged_for_review);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON campaign_submissions(created_at DESC);

-- Trigger
CREATE OR REPLACE TRIGGER trigger_submissions_updated
BEFORE UPDATE ON campaign_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- View for admin dashboard
CREATE OR REPLACE VIEW admin_pending_reviews AS
SELECT 
  cs.id,
  cs.campaign_id,
  cs.user_id,
  u.email,
  u.phone,
  cs.image_url,
  cs.content_score,
  cs.flagged_for_review,
  ua.rejected_submissions,
  cs.submitted_at
FROM campaign_submissions cs
JOIN users u ON cs.user_id = u.id
JOIN user_abuse_tracking ua ON u.id = ua.user_id
WHERE cs.flagged_for_review = true
  AND cs.admin_review_status IS NULL
ORDER BY cs.content_score ASC, cs.submitted_at DESC;

COMMIT;
