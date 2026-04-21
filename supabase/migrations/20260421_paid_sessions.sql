-- paid_sessions: one row per Stripe Checkout payment (bridge to wizard/dashboard)
-- Run in Supabase SQL Editor if migrations are not auto-applied.

CREATE TABLE IF NOT EXISTS public.paid_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'single',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress'
);

CREATE INDEX IF NOT EXISTS idx_paid_sessions_user_id ON public.paid_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_paid_sessions_created_at ON public.paid_sessions (created_at DESC);

ALTER TABLE public.paid_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sessions" ON public.paid_sessions;
CREATE POLICY "Users see own sessions" ON public.paid_sessions
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.paid_sessions TO authenticated;
GRANT ALL ON public.paid_sessions TO service_role;
