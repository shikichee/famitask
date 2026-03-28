'use client';

import { useMemo, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { SortableTaskCard } from './sortable-task-card';

interface TaskListProps {
  tasks: Task[];
  categories: TaskCategory[];
  members: FamilyMember[];
  currentMemberId: string;
  isChild: boolean;
  groupId: string;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskList = memo(function TaskList({ tasks, categories, members, currentMemberId, isChild, groupId, onComplete, onAssign, onDelete }: TaskListProps) {
  const filteredTasks = useMemo(
    () => isChild ? tasks.filter(t => !t.adult_only) : tasks,
    [tasks, isChild]
  );

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const { setNodeRef } = useDroppable({ id: groupId });

  if (filteredTasks.length === 0) {
    return (
      <div ref={setNodeRef} className="flex flex-col items-center justify-center py-16 text-muted-foreground min-h-[80px]">
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
    <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[40px]">
        {filteredTasks.map((task) => (
          <SortableTaskCard
            key={task.id}
            task={task}
            category={categoryMap.get(task.category_id)}
            isChild={isChild}
            members={members}
            currentMemberId={currentMemberId}
            onComplete={onComplete}
            onAssign={onAssign}
            onDelete={onDelete}
          />
        ))}
      </div>
    </SortableContext>
  );
});
