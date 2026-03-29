'use client';

import { RecurringTaskTemplate, TaskCategory } from '@/types/database';
import { formatSchedule, formatGenerationTime } from '@/lib/recurring-utils';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';

interface TemplateListProps {
  templates: RecurringTaskTemplate[];
  categories: TaskCategory[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (template: RecurringTaskTemplate) => void;
  onDelete: (template: RecurringTaskTemplate) => void;
}

export function TemplateList({ templates, categories, onToggleActive, onEdit, onDelete }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-3xl mb-2">📅</p>
        <p className="text-sm">くりかえしタスクはまだありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map(template => {
        const category = categories.find(c => c.id === template.category_id);
        return (
          <div
            key={template.id}
            className={`
              rounded-2xl border bg-card p-4 transition-opacity
              ${!template.is_active ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{category?.emoji ?? '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{template.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatSchedule(template)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-500">
                    {'★'.repeat(template.points)}{'☆'.repeat(3 - template.points)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatGenerationTime(template.generation_time)}〜
                  </span>
                  {template.adult_only && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">大人限定</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onEdit(template)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(template)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={(checked) => onToggleActive(template.id, checked)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
