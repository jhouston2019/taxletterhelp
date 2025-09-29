-- Create subscriptions table for tracking user plans
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text not null, -- 'STANDARD', 'COMPLEX', 'STARTER', 'PRO', 'PROPLUS'
  status text not null, -- 'active', 'canceled', 'past_due', 'incomplete'
  current_period_start timestamp,
  current_period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create usage tracking table
create table if not exists public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete cascade,
  action_type text not null, -- 'letter_analysis', 'response_generation', 'download'
  document_id uuid references documents(id) on delete cascade,
  created_at timestamp default now()
);

-- Create user preferences table
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  email_notifications boolean default true,
  preferred_response_style text default 'professional', -- 'professional', 'casual', 'formal'
  auto_save_responses boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Add indexes for better performance
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_usage_tracking_user_id on public.usage_tracking(user_id);
create index if not exists idx_usage_tracking_created_at on public.usage_tracking(created_at);
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
