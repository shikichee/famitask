'use client';

import { Task, TaskCategory } from '@/types/database';
import { TaskCard } from './task-card';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  isChild: boolean;
  onComplete: (taskId: string) => void;
}

export function TaskList({ tasks, categories, isChild, onComplete }: TaskListProps) {
  const filteredTasks = isChild
    ? tasks.filter(t => !t.adult_only)
    : tasks;

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <span className="text-4xl mb-3">🎉</span>
        <p className={`font-medium ${isChild ? 'text-lg' : ''}`}>
          {isChild ? 'ぜんぶおわったよ!' : 'タスクがありません'}
        </p>
        <p className={`text-sm mt-1 ${isChild ? 'text-base' : ''}`}>
          {isChild ? 'あたらしいおしごとをついかしよう' : '「+」ボタンでタスクを追加しましょう'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filteredTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          category={categoryMap.get(task.category_id)}
          isChild={isChild}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}
