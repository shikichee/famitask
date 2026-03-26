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
  created_at timestamptz not null default now()
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

-- RPC: increment points atomically
create or replace function increment_points(member_id uuid, amount integer)
returns void as $$
begin
  update family_members
  set total_points = total_points + amount
  where id = member_id;
end;
$$ language plpgsql;

-- Enable Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table completions;
alter publication supabase_realtime add table family_members;
