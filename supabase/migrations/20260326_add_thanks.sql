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

alter publication supabase_realtime add table thanks;
