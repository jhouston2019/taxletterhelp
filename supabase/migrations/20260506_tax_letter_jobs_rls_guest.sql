-- Guest INSERT/SELECT for tax_letter_jobs (run in Supabase SQL Editor if preferred)
-- Enables anon/authenticated inserts for wizard funnel without JWT.

ALTER TABLE public.tax_letter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_insert_jobs" ON public.tax_letter_jobs;
DROP POLICY IF EXISTS "allow_select_jobs_by_id" ON public.tax_letter_jobs;
DROP POLICY IF EXISTS "allow_all_service_role" ON public.tax_letter_jobs;
-- Legacy policy names from earlier migration
DROP POLICY IF EXISTS "Users can view own jobs" ON public.tax_letter_jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.tax_letter_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.tax_letter_jobs;

CREATE POLICY "allow_insert_jobs" ON public.tax_letter_jobs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "allow_select_jobs_by_id" ON public.tax_letter_jobs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "allow_all_service_role" ON public.tax_letter_jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Add FK from public.users to auth.users if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'f'
      AND confrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
