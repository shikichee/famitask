-- Add position column for task ordering
ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Backfill existing pending tasks with position based on created_at (newest = smallest)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY COALESCE(assigned_to, '00000000-0000-0000-0000-000000000000')
    ORDER BY created_at DESC
  ) - 1 AS pos
  FROM tasks
  WHERE status = 'pending'
)
UPDATE tasks SET position = ranked.pos FROM ranked WHERE tasks.id = ranked.id;

-- Index for efficient ordering
CREATE INDEX idx_tasks_position ON tasks(assigned_to, position);

-- RPC: increment positions for a group (to make room for position=0)
CREATE OR REPLACE FUNCTION increment_positions(p_assigned_to uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_assigned_to IS NULL THEN
    UPDATE tasks
    SET position = position + 1
    WHERE status = 'pending' AND assigned_to IS NULL;
  ELSE
    UPDATE tasks
    SET position = position + 1
    WHERE status = 'pending' AND assigned_to = p_assigned_to;
  END IF;
END;
$$ LANGUAGE plpgsql;
