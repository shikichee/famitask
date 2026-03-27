-- Activity logs: stores all push-notification-worthy events
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

alter publication supabase_realtime add table activity_logs;
