-- Add assigned_to column to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES family_members(id);

-- Index for filtering by assigned member
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
