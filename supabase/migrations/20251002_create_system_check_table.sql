-- Create system_check table for production readiness checks
CREATE TABLE IF NOT EXISTS public.system_check (
  id bigserial PRIMARY KEY,
  checked_at timestamptz NOT NULL,
  status text,
  note text
);

-- Enable RLS (optional, since this is for system checks)
ALTER TABLE public.system_check ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for production checks)
CREATE POLICY "Allow service role inserts" ON public.system_check
  AS PERMISSIVE FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to read
CREATE POLICY "Allow service role reads" ON public.system_check
  AS PERMISSIVE FOR SELECT
  TO service_role
  USING (true);

