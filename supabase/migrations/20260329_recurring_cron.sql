-- pg_cron / pg_net を有効化 (Supabase ダッシュボードで有効にしておくこと)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- くりかえしタスクを自動生成する関数
-- 毎分呼ばれるが、generation_time が到来したテンプレートだけ処理する
CREATE OR REPLACE FUNCTION generate_due_recurring_tasks()
RETURNS jsonb AS $$
DECLARE
  v_now_jst timestamp;
  v_today date;
  v_current_time time;
  v_dow integer;
  v_week_of_month integer;
  v_template RECORD;
  v_generated_titles text[] := '{}';
  v_body text;
  v_site_url text;
  v_cron_secret text;
BEGIN
  -- Vault からシークレット取得
  SELECT decrypted_secret INTO v_site_url FROM vault.decrypted_secrets WHERE name = 'app_site_url';
  SELECT decrypted_secret INTO v_cron_secret FROM vault.decrypted_secrets WHERE name = 'app_cron_secret';

  -- JST の現在時刻
  v_now_jst := (now() AT TIME ZONE 'Asia/Tokyo');
  v_today := v_now_jst::date;
  v_current_time := v_now_jst::time;
  v_dow := EXTRACT(DOW FROM v_today)::integer;  -- 0=日曜
  v_week_of_month := CEIL(EXTRACT(DAY FROM v_today) / 7.0)::integer;

  FOR v_template IN
    SELECT *
    FROM recurring_task_templates
    WHERE is_active = true
      AND v_dow = ANY(days_of_week)
      AND generation_time <= v_current_time
      AND (recurrence_type = 'weekly'
           OR (recurrence_type = 'monthly_nth' AND v_week_of_month = ANY(weeks_of_month)))
      -- まだ今日生成されていない
      AND NOT EXISTS (
        SELECT 1 FROM tasks
        WHERE recurring_template_id = recurring_task_templates.id
          AND task_date = v_today
      )
      -- 削除済み（スキップ）でない
      AND NOT EXISTS (
        SELECT 1 FROM recurring_task_skips
        WHERE template_id = recurring_task_templates.id
          AND task_date = v_today
      )
  LOOP
    -- 未割当グループのポジションをずらす
    UPDATE tasks SET position = position + 1 WHERE assigned_to IS NULL;

    -- タスク挿入（ユニーク制約で重複防止）
    INSERT INTO tasks (title, category_id, points, adult_only, created_by,
                       is_recurring, recurring_template_id, task_date, status, position)
    VALUES (v_template.title, v_template.category_id, v_template.points,
            v_template.adult_only, v_template.created_by,
            true, v_template.id, v_today, 'pending', 0)
    ON CONFLICT (recurring_template_id, task_date) DO NOTHING;

    IF FOUND THEN
      v_generated_titles := array_append(v_generated_titles, v_template.title);

      INSERT INTO activity_logs (event_type, actor_id, task_title)
      VALUES ('recurring_task_generated', v_template.created_by, v_template.title);
    END IF;
  END LOOP;

  -- 生成されたタスクがあれば Push 通知 API を呼ぶ
  IF array_length(v_generated_titles, 1) > 0 THEN
    IF array_length(v_generated_titles, 1) = 1 THEN
      v_body := 'くりかえしタスク「' || v_generated_titles[1] || '」が追加されました';
    ELSE
      v_body := 'くりかえしタスクが' || array_length(v_generated_titles, 1)::text
                || '件追加されました（' || array_to_string(v_generated_titles, '、') || '）';
    END IF;

    PERFORM net.http_post(
      url := v_site_url || '/api/cron/notify-recurring',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_cron_secret
      ),
      body := jsonb_build_object(
        'title', 'くりかえしタスク',
        'body', v_body,
        'url', '/'
      )
    );
  END IF;

  RETURN jsonb_build_object('generated', to_jsonb(v_generated_titles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 毎分実行
SELECT cron.schedule(
  'generate-recurring-tasks',
  '* * * * *',
  $$SELECT generate_due_recurring_tasks()$$
);
