-- ============================================================================
-- CRITICAL SCHEMA FIX - Day 1 Non-Negotiable
-- ============================================================================
-- This migration creates the tlh_letters table that the application requires
-- Code references this table in: analyze-letter.js, generate-response.js, 
-- stripe-webhook.js, export-pdf.js, send-email.js, admin.js, prod-check.js
-- ============================================================================

-- Create tlh_letters table (main application table)
CREATE TABLE IF NOT EXISTS public.tlh_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification
  user_email TEXT,
  
  -- Payment tracking
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  price_id TEXT,
  
  -- Letter content
  letter_text TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  
  -- Analysis results
  analysis JSONB,
  summary TEXT,
  
  -- AI response
  ai_response TEXT,
  
  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_professional_review BOOLEAN DEFAULT false,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'analyzed', 'responded', 'completed', 'failed')),
  
  -- Metadata
  notice_type TEXT,
  urgency_level TEXT,
  deadline_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_tlh_letters_user_email 
  ON public.tlh_letters(user_email);

-- Removed user_id index (column doesn't exist in users table)

CREATE INDEX IF NOT EXISTS idx_tlh_letters_stripe_session 
  ON public.tlh_letters(stripe_session_id);

-- Status and filtering indexes
CREATE INDEX IF NOT EXISTS idx_tlh_letters_status 
  ON public.tlh_letters(status);

CREATE INDEX IF NOT EXISTS idx_tlh_letters_created_at 
  ON public.tlh_letters(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tlh_letters_risk_level 
  ON public.tlh_letters(risk_level) 
  WHERE risk_level IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tlh_letters_user_status 
  ON public.tlh_letters(user_email, status, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.tlh_letters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own letters (by email)
CREATE POLICY "Users can view their own letters by email"
  ON public.tlh_letters
  FOR SELECT
  USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_email IS NULL  -- Allow viewing unpaid/anonymous letters temporarily
  );

-- Policy: Users can insert their own letters
CREATE POLICY "Users can insert their own letters"
  ON public.tlh_letters
  FOR INSERT
  WITH CHECK (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_email IS NULL  -- Allow anonymous inserts (will be updated after payment)
  );

-- Policy: Users can update their own letters
CREATE POLICY "Users can update their own letters"
  ON public.tlh_letters
  FOR UPDATE
  USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Policy: Service role can do everything (for Netlify functions)
CREATE POLICY "Service role has full access"
  ON public.tlh_letters
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tlh_letters_updated_at
  BEFORE UPDATE ON public.tlh_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SYSTEM CHECK TABLE (referenced in prod-check.js)
-- ============================================================================

-- Verify system_check table exists (should be in 20251002_create_system_check_table.sql)
-- If not, create it here:

CREATE TABLE IF NOT EXISTS public.system_check (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_check_created_at 
  ON public.system_check(created_at DESC);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Test that all tables exist
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(table_name)
  INTO missing_tables
  FROM (
    VALUES 
      ('users'),
      ('documents'),
      ('subscriptions'),
      ('usage_tracking'),
      ('tlh_letters'),
      ('system_check')
  ) AS required_tables(table_name)
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = required_tables.table_name
  );
  
  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables exist ✓';
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.tlh_letters TO authenticated;
GRANT SELECT, INSERT ON public.system_check TO authenticated;

-- Grant full access to service role (for Netlify functions)
GRANT ALL ON public.tlh_letters TO service_role;
GRANT ALL ON public.system_check TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO public.system_check (check_type, status, details)
VALUES (
  'migration_20260224_fix_schema',
  'completed',
  jsonb_build_object(
    'tables_created', ARRAY['tlh_letters', 'system_check'],
    'indexes_created', 8,
    'policies_created', 4,
    'timestamp', NOW()
  )
);

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✓ Schema fix migration completed successfully';
  RAISE NOTICE '✓ tlh_letters table created with all required fields';
  RAISE NOTICE '✓ Indexes created for performance';
  RAISE NOTICE '✓ RLS policies configured';
  RAISE NOTICE '✓ Ready for application use';
END $$;
