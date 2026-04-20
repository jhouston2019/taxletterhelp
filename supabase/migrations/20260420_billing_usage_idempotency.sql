-- Billing idempotency, usage, auth lookup helper (service_role only)

CREATE TABLE IF NOT EXISTS public.processed_sessions (
  stripe_session_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  user_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_sessions_status ON public.processed_sessions(status);

CREATE TABLE IF NOT EXISTS public.user_review_usage (
  user_id UUID PRIMARY KEY,
  review_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Match auth.users.id to public.users.id (RLS expects auth.uid() = users.id)
CREATE OR REPLACE FUNCTION public.tlh_auth_uid_for_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users
  WHERE lower(trim(email)) = lower(trim(lookup_email))
  LIMIT 1;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.tlh_auth_uid_for_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tlh_auth_uid_for_email(TEXT) TO service_role;

-- Service-role reads for billing snapshot joins
GRANT SELECT, INSERT, UPDATE ON public.processed_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_review_usage TO service_role;
