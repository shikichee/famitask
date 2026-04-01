-- 未読通知バッジ用: 最後にりれきページを見た日時
ALTER TABLE family_members
  ADD COLUMN last_seen_history_at timestamptz NOT NULL DEFAULT now();
