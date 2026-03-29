'use client';

import { useState, useCallback } from 'react';
import { RecurringTaskTemplate, TaskCategory } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const DAY_LABELS = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 0, label: '日' },
];

const WEEK_LABELS = [
  { value: 1, label: '第1' },
  { value: 2, label: '第2' },
  { value: 3, label: '第3' },
  { value: 4, label: '第4' },
  { value: 5, label: '第5' },
];

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TaskCategory[];
  currentMemberId: string;
  editTemplate?: RecurringTaskTemplate | null;
  onSubmit: (data: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    created_by: string;
    recurrence_type: 'weekly' | 'monthly_nth';
    days_of_week: number[];
    weeks_of_month: number[] | null;
    generation_time: string;
  }) => Promise<unknown>;
}

export function TemplateForm({ open, onOpenChange, categories, currentMemberId, editTemplate, onSubmit }: TemplateFormProps) {
  const [title, setTitle] = useState(editTemplate?.title ?? '');
  const [categoryId, setCategoryId] = useState(editTemplate?.category_id ?? categories[0]?.id ?? '');
  const [points, setPoints] = useState(editTemplate?.points ?? 2);
  const [adultOnly, setAdultOnly] = useState(editTemplate?.adult_only ?? false);
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'monthly_nth'>(editTemplate?.recurrence_type ?? 'weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(editTemplate?.days_of_week ?? []);
  const [weeksOfMonth, setWeeksOfMonth] = useState<number[]>(editTemplate?.weeks_of_month ?? []);
  const [generationTime, setGenerationTime] = useState(editTemplate?.generation_time?.slice(0, 5) ?? '18:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setCategoryId(categories[0]?.id ?? '');
    setPoints(2);
    setAdultOnly(false);
    setRecurrenceType('weekly');
    setDaysOfWeek([]);
    setWeeksOfMonth([]);
    setGenerationTime('18:00');
    setError(null);
  }, [categories]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleWeek = (week: number) => {
    setWeeksOfMonth(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (daysOfWeek.length === 0) {
      setError('曜日を1つ以上選択してください');
      return;
    }
    if (recurrenceType === 'monthly_nth' && weeksOfMonth.length === 0) {
      setError('週を1つ以上選択してください');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        category_id: categoryId,
        points,
        adult_only: adultOnly,
        created_by: currentMemberId,
        recurrence_type: recurrenceType,
        days_of_week: daysOfWeek,
        weeks_of_month: recurrenceType === 'monthly_nth' ? weeksOfMonth : null,
        generation_time: generationTime,
      });
      resetForm();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTemplate ? 'くりかえし設定を編集' : 'くりかえしタスクを追加'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-4 pb-4">
          {/* Title */}
          <div>
            <Label htmlFor="template-title">タスク名</Label>
            <Input
              id="template-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 燃えるゴミ出し"
              className="mt-1.5"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <Label>カテゴリ</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                    ${cat.id === categoryId
                      ? 'border-primary bg-accent'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[10px] font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <Label>ポイント</Label>
            <div className="flex gap-2 mt-1.5">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  onClick={() => setPoints(p)}
                  className={`
                    flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                    ${p === points
                      ? 'border-primary bg-accent'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  <span className="text-sm">{'★'.repeat(p)}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {p === 1 ? 'かるい' : p === 2 ? 'ふつう' : 'がんばった'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence Type */}
          <div>
            <Label>くりかえしパターン</Label>
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => setRecurrenceType('weekly')}
                className={`
                  flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all
                  ${recurrenceType === 'weekly'
                    ? 'border-primary bg-accent'
                    : 'border-transparent bg-muted hover:bg-muted/80'
                  }
                `}
              >
                毎週
              </button>
              <button
                onClick={() => setRecurrenceType('monthly_nth')}
                className={`
                  flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all
                  ${recurrenceType === 'monthly_nth'
                    ? 'border-primary bg-accent'
                    : 'border-transparent bg-muted hover:bg-muted/80'
                  }
                `}
              >
                月の特定週
              </button>
            </div>
          </div>

          {/* Week of Month (only for monthly_nth) */}
          {recurrenceType === 'monthly_nth' && (
            <div>
              <Label>対象の週</Label>
              <div className="flex gap-2 mt-1.5">
                {WEEK_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleWeek(value)}
                    className={`
                      flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all
                      ${weeksOfMonth.includes(value)
                        ? 'border-primary bg-accent'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Days of Week */}
          <div>
            <Label>曜日</Label>
            <div className="flex gap-1.5 mt-1.5">
              {DAY_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  className={`
                    flex-1 py-2.5 rounded-lg border-2 text-sm font-bold transition-all
                    ${daysOfWeek.includes(value)
                      ? 'border-primary bg-accent'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                    }
                    ${value === 0 ? 'text-red-500' : value === 6 ? 'text-blue-500' : ''}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Generation Time */}
          <div>
            <Label htmlFor="generation-time">出現時刻</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">この時刻以降にボードを開くとタスクが出現します</p>
            <Input
              id="generation-time"
              type="time"
              value={generationTime}
              onChange={(e) => setGenerationTime(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Adult Only */}
          <div className="flex items-center justify-between">
            <Label htmlFor="template-adult-only">大人限定（子どもに非表示）</Label>
            <Switch
              id="template-adult-only"
              checked={adultOnly}
              onCheckedChange={setAdultOnly}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || daysOfWeek.length === 0 || submitting}
            className="w-full"
          >
            {submitting ? '...' : editTemplate ? '更新' : '追加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
