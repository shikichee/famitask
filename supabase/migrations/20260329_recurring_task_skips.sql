-- くりかえしタスクを削除した日を記録し、再生成を防止するテーブル
CREATE TABLE IF NOT EXISTS recurring_task_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES recurring_task_templates(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (template_id, task_date)
);

-- RLS
ALTER TABLE recurring_task_skips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read skips"
  ON recurring_task_skips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert skips"
  ON recurring_task_skips FOR INSERT TO authenticated WITH CHECK (true);

-- delete_task を更新: くりかえしタスク削除時にスキップ記録を残す
CREATE OR REPLACE FUNCTION delete_task(p_task_id uuid)
RETURNS void AS $$
DECLARE
  v_template_id uuid;
  v_task_date date;
BEGIN
  -- くりかえしタスクかチェックし、テンプレートIDと日付を取得
  SELECT recurring_template_id, task_date
    INTO v_template_id, v_task_date
    FROM tasks WHERE id = p_task_id;

  -- completions の FK 参照をクリア
  UPDATE completions SET task_id = NULL WHERE task_id = p_task_id;

  -- タスク削除
  DELETE FROM tasks WHERE id = p_task_id;

  -- くりかえしタスクならスキップ記録を挿入
  IF v_template_id IS NOT NULL AND v_task_date IS NOT NULL THEN
    INSERT INTO recurring_task_skips (template_id, task_date)
    VALUES (v_template_id, v_task_date)
    ON CONFLICT (template_id, task_date) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
