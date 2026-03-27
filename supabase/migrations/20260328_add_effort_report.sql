-- Add reported_by column to completions for effort reports
-- When reported_by IS NOT NULL, the completion was reported by someone on behalf of member_id
ALTER TABLE completions ADD COLUMN reported_by uuid REFERENCES family_members(id);

-- Add adult_only flag to completions (for effort reports that should be hidden from children)
ALTER TABLE completions ADD COLUMN adult_only boolean NOT NULL DEFAULT false;

-- Extend activity_logs event_type check constraint to include 'effort_reported'
-- (Depends on PR #17 having created the activity_logs table first)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_event_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_event_type_check
  CHECK (event_type IN ('task_created', 'task_completed', 'task_self_assigned', 'task_request_assigned', 'effort_reported'));
