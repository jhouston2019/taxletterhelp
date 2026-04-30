-- tax_letter_jobs: per-notice jobs with payment + unlock flags

create table if not exists tax_letter_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  analysis_json jsonb,
  inputs_json jsonb,
  letter_full text,
  preview_text text,
  paid boolean default false,
  is_unlocked boolean default false,
  stripe_session_id text,
  created_at timestamptz default now()
);

alter table tax_letter_jobs enable row level security;

drop policy if exists "Users can view own jobs" on tax_letter_jobs;
create policy "Users can view own jobs"
on tax_letter_jobs
for select
using (auth.uid() = user_id);

drop policy if exists "Allow insert" on tax_letter_jobs;
drop policy if exists "Allow update" on tax_letter_jobs;
drop policy if exists "Users can insert own jobs" on tax_letter_jobs;
drop policy if exists "Users can update own jobs" on tax_letter_jobs;

create policy "Users can insert own jobs"
on tax_letter_jobs
for insert
with check (auth.uid() = user_id);

create policy "Users can update own jobs"
on tax_letter_jobs
for update
using (auth.uid() = user_id);
