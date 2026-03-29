import { RecurringTaskTemplate } from '@/types/database';

const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * スケジュールを日本語表示に変換
 * 例: "毎週 火・金", "第2・第4 水曜"
 */
export function formatSchedule(template: RecurringTaskTemplate): string {
  const days = template.days_of_week
    .slice()
    .sort((a, b) => a - b)
    .map(d => DAY_NAMES_JA[d])
    .join('・');

  if (template.recurrence_type === 'weekly') {
    return `毎週 ${days}`;
  }

  const weeks = (template.weeks_of_month ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map(w => `第${w}`)
    .join('・');
  return `${weeks} ${days}曜`;
}

/**
 * 日付がその月の第n回目の曜日かを計算
 * 例: 3月の第2水曜日 → 2
 */
export function getWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

/**
 * JST の「今日」を取得
 */
export function getTodayJST(): Date {
  const now = new Date();
  const jstString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
  return new Date(jstString + 'T00:00:00');
}

/**
 * JST の現在時刻を HH:MM 形式で取得
 */
export function getCurrentTimeJST(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * JST の今日の日付文字列 (YYYY-MM-DD) を取得
 */
export function getTodayStringJST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}

/**
 * テンプレートが今日マッチするか判定
 */
export function shouldGenerateToday(template: RecurringTaskTemplate, today: Date): boolean {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  if (!template.days_of_week.includes(dayOfWeek)) {
    return false;
  }

  if (template.recurrence_type === 'monthly_nth') {
    const weekOfMonth = getWeekOfMonth(today);
    if (!template.weeks_of_month?.includes(weekOfMonth)) {
      return false;
    }
  }

  return true;
}

/**
 * 現在時刻がテンプレートの generation_time 以降かチェック
 */
export function isPastGenerationTime(template: RecurringTaskTemplate): boolean {
  const currentTime = getCurrentTimeJST();
  // generation_time は "HH:MM:SS" or "HH:MM" 形式
  const genTime = template.generation_time.slice(0, 5); // "HH:MM"
  return currentTime >= genTime;
}

/**
 * generation_time を表示用に整形
 */
export function formatGenerationTime(time: string): string {
  return time.slice(0, 5);
}
