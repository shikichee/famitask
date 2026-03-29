-- くりかえしタスクテンプレート
CREATE TABLE recurring_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category_id uuid NOT NULL REFERENCES task_categories(id),
  points integer NOT NULL DEFAULT 2 CHECK (points BETWEEN 1 AND 3),
  adult_only boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES family_members(id),
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly_nth')),
  days_of_week integer[] NOT NULL,
  weeks_of_month integer[],
  generation_time time NOT NULL DEFAULT '18:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_templates_active ON recurring_task_templates(is_active);

ALTER TABLE recurring_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read recurring_task_templates"
  ON recurring_task_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert recurring_task_templates"
  ON recurring_task_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update recurring_task_templates"
  ON recurring_task_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recurring_task_templates"
  ON recurring_task_templates FOR DELETE TO authenticated USING (true);

-- tasks テーブルにテンプレート参照と日付カラムを追加
ALTER TABLE tasks ADD COLUMN recurring_template_id uuid REFERENCES recurring_task_templates(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN task_date date;

CREATE INDEX idx_tasks_recurring_template ON tasks(recurring_template_id, task_date);

-- 同じテンプレート・同じ日付のタスクは1つだけ (重複生成防止)
CREATE UNIQUE INDEX idx_unique_recurring_task_per_day
  ON tasks(recurring_template_id, task_date)
  WHERE recurring_template_id IS NOT NULL;

-- activity_logs の event_type に新しいタイプを追加
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_event_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_event_type_check
  CHECK (event_type IN ('task_created', 'task_completed', 'task_self_assigned', 'task_request_assigned', 'effort_reported', 'recurring_template_created', 'recurring_task_generated'));

-- Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_task_templates;
