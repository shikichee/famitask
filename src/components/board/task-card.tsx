'use client';

import { Task, TaskCategory } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  category: TaskCategory | undefined;
  isChild: boolean;
  onComplete: (taskId: string) => void;
}

const POINTS_STARS: Record<number, string> = {
  1: '★',
  2: '★★',
  3: '★★★',
};

export function TaskCard({ task, category, isChild, onComplete }: TaskCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border transition-all hover:shadow-sm active:scale-[0.98]">
      <span className={`${isChild ? 'text-2xl' : 'text-xl'} shrink-0`}>
        {category?.emoji ?? '📦'}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isChild ? 'text-base' : 'text-sm'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-amber-500">{POINTS_STARS[task.points]}</span>
          {task.is_recurring && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              くりかえし
            </Badge>
          )}
          {task.adult_only && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              おとな
            </Badge>
          )}
        </div>
      </div>

      <button
        onClick={() => onComplete(task.id)}
        className={`
          shrink-0 flex items-center justify-center rounded-full
          bg-emerald-500 text-white
          transition-all hover:bg-emerald-600 active:scale-90
          ${isChild ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-lg'}
        `}
        aria-label="完了"
      >
        ✓
      </button>
    </div>
  );
}
