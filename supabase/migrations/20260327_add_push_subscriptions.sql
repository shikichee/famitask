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
