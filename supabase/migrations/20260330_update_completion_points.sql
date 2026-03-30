-- 完了済みタスクの難易度（ポイント）変更 RPC
CREATE OR REPLACE FUNCTION update_completion_points(
  p_completion_id uuid,
  p_new_points integer
)
RETURNS void AS $$
DECLARE
  v_member_id uuid;
  v_old_points integer;
  v_delta integer;
BEGIN
  IF p_new_points < 1 OR p_new_points > 3 THEN
    RAISE EXCEPTION 'points must be between 1 and 3';
  END IF;

  SELECT member_id, points
    INTO v_member_id, v_old_points
    FROM completions WHERE id = p_completion_id;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_old_points = p_new_points THEN RETURN; END IF;

  v_delta := p_new_points - v_old_points;

  UPDATE completions SET points = p_new_points WHERE id = p_completion_id;

  UPDATE family_members
    SET total_points = GREATEST(total_points + v_delta, 0)
    WHERE id = v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
