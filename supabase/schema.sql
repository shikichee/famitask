-- famitask database schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Family Members
create table family_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  avatar text not null,
  color text not null,
  role text not null check (role in ('adult', 'child')),
  total_points integer not null default 0,
  auth_user_id uuid unique references auth.users(id),
  is_admin boolean not null default false
);

-- Task Categories
create table task_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null
);

-- Tasks
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category_id uuid not null references task_categories(id),
  status text not null default 'pending' check (status in ('pending', 'done')),
  adult_only boolean not null default false,
  points integer not null default 2 check (points between 1 and 3),
  created_by uuid not null references family_members(id),
  completed_by uuid references family_members(id),
  completed_at timestamptz,
  assigned_to uuid references family_members(id),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  position integer not null default 0
);

-- Completions (history log, never deleted)
create table completions (
  id uuid primary key default uuid_generate_v4(),
  task_title text not null,
  category_emoji text not null,
  member_id uuid not null references family_members(id),
  points integer not null,
  completed_at timestamptz not null default now()
);

-- Indexes
create index idx_tasks_status on tasks(status);
create index idx_tasks_category on tasks(category_id);
create index idx_completions_member on completions(member_id);
create index idx_completions_completed_at on completions(completed_at);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_tasks_position on tasks(assigned_to, position);

-- RPC: increment points atomically
create or replace function increment_points(member_id uuid, amount integer)
returns void as $$
begin
  update family_members
  set total_points = total_points + amount
  where id = member_id;
end;
$$ language plpgsql;

-- Thanks (peer bonus)
create table thanks (
  id uuid primary key default uuid_generate_v4(),
  completion_id uuid not null references completions(id),
  from_member_id uuid not null references family_members(id),
  to_member_id uuid not null references family_members(id),
  created_at timestamptz not null default now(),
  check (from_member_id != to_member_id),
  unique(completion_id, from_member_id)
);

create index idx_thanks_completion on thanks(completion_id);
create index idx_thanks_to_member on thanks(to_member_id);

-- Push notification subscriptions (one per device per member)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(endpoint)
);

create index idx_push_subscriptions_member on push_subscriptions(member_id);

-- RLS for push_subscriptions
alter table push_subscriptions enable row level security;

create policy "Authenticated users can read push_subscriptions"
  on push_subscriptions for select to authenticated using (true);

create policy "Authenticated users can insert push_subscriptions"
  on push_subscriptions for insert to authenticated with check (true);

create policy "Authenticated users can delete push_subscriptions"
  on push_subscriptions for delete to authenticated using (true);

-- Activity logs (all push-notification-worthy events)
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('task_created', 'task_completed', 'task_self_assigned', 'task_request_assigned')),
  actor_id uuid not null references family_members(id),
  target_member_id uuid references family_members(id),
  task_title text not null,
  category_emoji text not null default '',
  points integer,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_created_at on activity_logs(created_at desc);

alter table activity_logs enable row level security;

create policy "Authenticated users can read activity_logs"
  on activity_logs for select to authenticated using (true);

create policy "Authenticated users can insert activity_logs"
  on activity_logs for insert to authenticated with check (true);

create policy "Authenticated users can delete activity_logs"
  on activity_logs for delete to authenticated using (true);

-- Enable Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table completions;
alter publication supabase_realtime add table family_members;
alter publication supabase_realtime add table thanks;
alter publication supabase_realtime add table activity_logs;
