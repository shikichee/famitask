export type FamilyMember = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'adult' | 'child';
  total_points: number;
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
  is_recurring: boolean;
  created_at: string;
};

export type Completion = {
  id: string;
  task_title: string;
  category_emoji: string;
  member_id: string;
  points: number;
  completed_at: string;
};
