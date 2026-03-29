export type FamilyMember = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'adult' | 'child';
  total_points: number;
  auth_user_id: string | null;
  is_admin: boolean;
};

export type TaskCategory = {
  id: string;
  name: string;
  emoji: string;
};

export type Task = {
  id: string;
  title: string;
  category_id: string;
  status: 'pending' | 'done';
  adult_only: boolean;
  points: number;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  is_recurring: boolean;
  recurring_template_id: string | null;
  task_date: string | null;
  created_at: string;
  position: number;
};

export type RecurringTaskTemplate = {
  id: string;
  title: string;
  category_id: string;
  points: number;
  adult_only: boolean;
  created_by: string;
  recurrence_type: 'weekly' | 'monthly_nth';
  days_of_week: number[];
  weeks_of_month: number[] | null;
  generation_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Completion = {
  id: string;
  task_title: string;
  category_emoji: string;
  member_id: string;
  points: number;
  completed_at: string;
  task_id: string | null;
  reported_by: string | null;
  adult_only: boolean;
};

export type PushSubscriptionRecord = {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type Thanks = {
  id: string;
  completion_id: string;
  from_member_id: string;
  to_member_id: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  event_type: 'task_created' | 'task_completed' | 'task_self_assigned' | 'task_request_assigned' | 'effort_reported' | 'recurring_template_created' | 'recurring_task_generated';
  actor_id: string;
  target_member_id: string | null;
  task_title: string;
  category_emoji: string;
  points: number | null;
  created_at: string;
};
