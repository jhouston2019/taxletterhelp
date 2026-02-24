-                                                 - ============================================================================
-- CRITICAL SCHEMA FIX - Day 1 Non-Negotiable (Version 2 - Safe)
-- ============================================================================
-- This migration safely creates the tlh_letters table
-- If table exists, it will be dropped and recreated
-- ============================================================================

-- Drop existing table if it exists (CASCADE removes dependencies)
DROP TABLE IF EXISTS public.tlh_letters CASCADE;

-- Create tlh_letters table (main application table)
CREATE TABLE public.tlh_letters (
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

CREATE INDEX idx_tlh_letters_user_email ON public.tlh_letters(user_email);
CREATE INDEX idx_tlh_letters_stripe_session ON public.tlh_letters(stripe_session_id);
CREATE INDEX idx_tlh_letters_status ON public.tlh_letters(status);
CREATE INDEX idx_tlh_letters_created_at ON public.tlh_letters(created_at DESC);
CREATE INDEX idx_tlh_letters_risk_level ON public.tlh_letters(risk_level) WHERE risk_level IS NOT NULL;
CREATE INDEX idx_tlh_letters_user_status ON public.tlh_letters(user_email, status, created_at DESC);

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
    OR user_email IS NULL
  );

-- Policy: Users can insert their own letters
CREATE POLICY "Users can insert their own letters"
  ON public.tlh_letters
  FOR INSERT
  WITH CHECK (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_email IS NULL
  );

-- Policy: Users can update their own letters
CREATE POLICY "Users can update their own letters"
  ON public.tlh_letters
  FOR UPDATE
  USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Policy: Service role has full access (for Netlify functions)
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
-- SYSTEM CHECK TABLE (skip if already exists)
-- ============================================================================

-- Note: system_check table may already exist from previous migration
-- If it exists, we'll just use it as-is

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.tlh_letters TO authenticated;
GRANT ALL ON public.tlh_letters TO service_role;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Test insert
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO public.tlh_letters (user_email, letter_text, status)
  VALUES ('test@validation.com', 'Test letter', 'pending')
  RETURNING id INTO test_id;
  
  DELETE FROM public.tlh_letters WHERE id = test_id;
  
  RAISE NOTICE '✓ Table created successfully and tested';
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Schema fix migration completed successfully';
  RAISE NOTICE '✓ tlh_letters table created with all required fields';
  RAISE NOTICE '✓ 6 indexes created for performance';
  RAISE NOTICE '✓ 4 RLS policies configured';
  RAISE NOTICE '✓ Auto-update trigger configured';
  RAISE NOTICE '✓ Ready for application use';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
