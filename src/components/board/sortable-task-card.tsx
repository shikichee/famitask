'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { TaskCard } from './task-card';

interface SortableTaskCardProps {
  task: Task;
  category: TaskCategory | undefined;
  isChild: boolean;
  members: FamilyMember[];
  currentMemberId: string;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'manipulation',
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} />
    </div>
  );
}
