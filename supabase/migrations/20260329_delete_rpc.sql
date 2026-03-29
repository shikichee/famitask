-- タスク削除 RPC (FK制約を考慮して安全に削除)
CREATE OR REPLACE FUNCTION delete_task(p_task_id uuid)
RETURNS void AS $$
BEGIN
  -- completions の FK 参照をクリア
  UPDATE completions SET task_id = NULL WHERE task_id = p_task_id;
  -- タスク削除
  DELETE FROM tasks WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完了履歴削除 RPC (thanks FK + ポイント差し引きを一括処理)
CREATE OR REPLACE FUNCTION delete_completion(p_completion_id uuid)
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

  -- タスクをボードに戻す
  IF v_task_id IS NOT NULL THEN
    UPDATE tasks
      SET status = 'pending', completed_by = NULL, completed_at = NULL
      WHERE id = v_task_id;
  END IF;

  -- ポイント差し引き
  UPDATE family_members
    SET total_points = GREATEST(total_points - v_points, 0)
    WHERE id = v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
