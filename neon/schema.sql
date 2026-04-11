-- FamiTask Neon Schema
-- Supabase → Neon migration: RLS/pg_cron/pg_net/auth.users removed

create extension if not exists "uuid-ossp";

-- Family Members (email/password_hash added for self-managed auth)
create table family_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  avatar text not null,
  color text not null,
  role text not null check (role in ('adult', 'child')),
  total_points integer not null default 0,
  is_admin boolean not null default false,
  email text unique,
  password_hash text,
  last_seen_history_at timestamptz not null default now()
);

-- Task Categories
create table task_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null
);

-- Recurring Task Templates (must exist before tasks FK)
create table recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid not null references task_categories(id),
  points integer not null default 2 check (points between 1 and 3),
  adult_only boolean not null default false,
  created_by uuid not null references family_members(id),
  recurrence_type text not null check (recurrence_type in ('weekly', 'monthly_nth')),
  days_of_week integer[] not null,
  weeks_of_month integer[],
  generation_time time not null default '18:00',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recurring_templates_active on recurring_task_templates(is_active);

-- Recurring Task Skips
create table recurring_task_skips (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references recurring_task_templates(id) on delete cascade,
  task_date date not null,
  created_at timestamptz default now(),
  unique(template_id, task_date)
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
  recurring_template_id uuid references recurring_task_templates(id) on delete set null,
  task_date date,
  created_at timestamptz not null default now(),
  position integer not null default 0
);

create index idx_tasks_status on tasks(status);
create index idx_tasks_category on tasks(category_id);
create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_tasks_position on tasks(assigned_to, position);
create index idx_tasks_recurring_template on tasks(recurring_template_id, task_date);
create unique index idx_unique_recurring_task_per_day
  on tasks(recurring_template_id, task_date)
  where recurring_template_id is not null;

-- Completions
create table completions (
  id uuid primary key default uuid_generate_v4(),
  task_title text not null,
  category_emoji text not null,
  member_id uuid not null references family_members(id),
  points integer not null,
  completed_at timestamptz not null default now(),
  task_id uuid references tasks(id),
  reported_by uuid references family_members(id),
  adult_only boolean not null default false
);

create index idx_completions_member on completions(member_id);
create index idx_completions_completed_at on completions(completed_at);
create index idx_completions_task_id on completions(task_id);

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

-- Push Subscriptions
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

-- Activity Logs
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'task_created', 'task_completed', 'task_self_assigned',
    'task_request_assigned', 'effort_reported',
    'recurring_template_created', 'recurring_task_generated'
  )),
  actor_id uuid not null references family_members(id),
  target_member_id uuid references family_members(id),
  task_title text not null,
  category_emoji text not null default '',
  points integer,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_created_at on activity_logs(created_at desc);

-- RPC Functions

create or replace function increment_points(member_id uuid, amount integer)
returns void as $$
begin
  update family_members
  set total_points = total_points + amount
  where id = member_id;
end;
$$ language plpgsql;

create or replace function decrement_points(member_id uuid, amount integer)
returns void as $$
begin
  update family_members
  set total_points = greatest(0, total_points - amount)
  where id = member_id;
end;
$$ language plpgsql;

create or replace function increment_positions(p_assigned_to uuid default null)
returns void as $$
begin
  update tasks
  set position = position + 1
  where status = 'pending'
    and (
      (p_assigned_to is null and assigned_to is null)
      or assigned_to = p_assigned_to
    );
end;
$$ language plpgsql;

create or replace function delete_task(p_task_id uuid)
returns void as $$
declare
  v_recurring_template_id uuid;
  v_task_date date;
begin
  select recurring_template_id, task_date
  into v_recurring_template_id, v_task_date
  from tasks where id = p_task_id;

  update completions set task_id = null where task_id = p_task_id;
  delete from tasks where id = p_task_id;

  if v_recurring_template_id is not null and v_task_date is not null then
    insert into recurring_task_skips (template_id, task_date)
    values (v_recurring_template_id, v_task_date)
    on conflict do nothing;
  end if;
end;
$$ language plpgsql security definer;

create or replace function delete_completion(p_completion_id uuid)
returns void as $$
declare
  v_member_id uuid;
  v_points integer;
begin
  select member_id, points into v_member_id, v_points
  from completions where id = p_completion_id;

  delete from thanks where completion_id = p_completion_id;
  delete from completions where id = p_completion_id;

  update family_members
  set total_points = greatest(0, total_points - v_points)
  where id = v_member_id;
end;
$$ language plpgsql security definer;

create or replace function update_completion_points(p_completion_id uuid, p_new_points integer)
returns void as $$
declare
  v_member_id uuid;
  v_old_points integer;
  v_delta integer;
begin
  if p_new_points < 1 or p_new_points > 3 then
    raise exception 'points must be between 1 and 3';
  end if;

  select member_id, points into v_member_id, v_old_points
  from completions where id = p_completion_id;

  v_delta := p_new_points - v_old_points;

  update completions set points = p_new_points where id = p_completion_id;

  update family_members
  set total_points = greatest(0, total_points + v_delta)
  where id = v_member_id;
end;
$$ language plpgsql security definer;

create or replace function undo_completion(p_completion_id uuid)
returns void as $$
declare
  v_member_id uuid;
  v_points integer;
  v_task_id uuid;
begin
  select member_id, points, task_id into v_member_id, v_points, v_task_id
  from completions where id = p_completion_id;

  delete from thanks where completion_id = p_completion_id;
  delete from completions where id = p_completion_id;

  update family_members
  set total_points = greatest(0, total_points - v_points)
  where id = v_member_id;

  if v_task_id is not null then
    update tasks
    set status = 'pending', completed_by = null, completed_at = null
    where id = v_task_id;
  end if;
end;
$$ language plpgsql security definer;
