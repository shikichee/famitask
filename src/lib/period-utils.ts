import { Completion } from '@/types/database';

export type Period = 'week' | 'month';

export function getPeriodStart(period: Period): Date {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function filterByPeriod(completions: Completion[], period: Period): Completion[] {
  const start = getPeriodStart(period);
  return completions.filter(c => new Date(c.completed_at) >= start);
}
