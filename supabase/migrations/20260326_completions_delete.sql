-- completionsにtask_idカラムを追加（既存レコードはnull許容）
ALTER TABLE completions
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id);

CREATE INDEX IF NOT EXISTS idx_completions_task_id ON completions(task_id);

-- 完了履歴の削除を許可（間違えてdoneしたときの取り消し用）
CREATE POLICY "Authenticated users can delete completions"
  ON completions FOR DELETE
  TO authenticated
  USING (true);

-- RPC: decrement points atomically
CREATE OR REPLACE FUNCTION decrement_points(member_id uuid, amount integer)
RETURNS void AS $$
BEGIN
  UPDATE family_members
  SET total_points = GREATEST(total_points - amount, 0)
  WHERE id = member_id;
END;
$$ LANGUAGE plpgsql;
