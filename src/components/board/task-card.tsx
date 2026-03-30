'use client';

import { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskCategory, FamilyMember } from '@/types/database';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  category: TaskCategory | undefined;
  isChild: boolean;
  members: FamilyMember[];
  currentMemberId: string;
  onComplete: (taskId: string) => void;
  onAssign: (taskId: string, memberId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

const POINTS_STARS: Record<number, string> = {
  1: '★',
  2: '★★',
  3: '★★★',
};

export const TaskCard = memo(function TaskCard({ task, category, isChild, members, currentMemberId, onComplete, onAssign, onDelete, onEdit }: TaskCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const assignedMember = task.assigned_to ? members.find(m => m.id === task.assigned_to) : null;
  const otherMembers = members.filter(m => m.id !== currentMemberId);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border transition-all hover:shadow-sm active:scale-[0.98]">
      <span className={`${isChild ? 'text-2xl' : 'text-xl'} shrink-0`}>
        {category?.emoji ?? '📦'}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`font-medium line-clamp-2 ${isChild ? 'text-base' : 'text-sm'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: '#F29F05' }}>{POINTS_STARS[task.points]}</span>
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
          {assignedMember && (
            <span className="text-xs text-muted-foreground">
              → {assignedMember.avatar} {assignedMember.name}
            </span>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {!task.assigned_to && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onAssign(task.id, currentMemberId)}
              className={`
                rounded-lg bg-[#F28705] text-white font-bold
                transition-all hover:opacity-85 active:scale-90
                ${isChild ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}
              `}
            >
              やる!
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`
                  rounded-lg bg-accent font-bold text-accent-foreground w-full
                  transition-all hover:opacity-85 active:scale-90
                  ${isChild ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}
                `}
              >
                おねがい▼
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {otherMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        onAssign(task.id, member.id);
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span>{member.avatar}</span>
                      <span>{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onComplete(task.id)}
          className={`
            shrink-0 flex items-center justify-center rounded-full
            bg-[#F29F05] text-white
            transition-all hover:opacity-85 active:scale-90
            ${isChild ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-lg'}
          `}
          aria-label="完了"
        >
          ✓
        </button>

        {!isChild && (
          <div className="flex flex-col gap-0.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                aria-label="編集"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  <path d="m15 5 4 4"/>
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              aria-label="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-base">タスクを削除しますか？</p>
            <p className="text-sm text-muted-foreground">
              「{task.title}」を削除します。この操作は元に戻せません。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(task.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:opacity-90 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
