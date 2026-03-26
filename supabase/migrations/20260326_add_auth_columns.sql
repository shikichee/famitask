-- Add auth columns to family_members
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 夫を管理者に設定
UPDATE family_members
  SET is_admin = true
  WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- RLS有効化
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全テーブル読み取り可能
CREATE POLICY "Authenticated users can read family_members"
  ON family_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read task_categories"
  ON task_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read completions"
  ON completions FOR SELECT
  TO authenticated
  USING (true);

-- 認証済みユーザーはタスク・完了履歴の書き込み可能
CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert completions"
  ON completions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- family_membersのポイント更新を許可
CREATE POLICY "Authenticated users can update family_members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (true);
