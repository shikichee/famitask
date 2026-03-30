-- 完了取り消し RPC (completion削除 + ポイント差し引き + タスクをpendingに戻す)
CREATE OR REPLACE FUNCTION undo_completion(p_completion_id uuid)
RETURNS void AS $$
DECLARE
  v_member_id uuid;
  v_points integer;
  v_task_id uuid;
BEGIN
  -- 完了情報を取得
  SELECT member_id, points, task_id
    INTO v_member_id, v_points, v_task_id
    FROM completions WHERE id = p_completion_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- thanks の FK 参照を削除
  DELETE FROM thanks WHERE completion_id = p_completion_id;

  -- 完了レコード削除
  DELETE FROM completions WHERE id = p_completion_id;

  -- ポイント差し引き
  UPDATE family_members
    SET total_points = GREATEST(total_points - v_points, 0)
    WHERE id = v_member_id;

  -- タスクをpendingに戻す
  IF v_task_id IS NOT NULL THEN
    UPDATE tasks
      SET status = 'pending', completed_by = NULL, completed_at = NULL
      WHERE id = v_task_id AND status = 'done';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
