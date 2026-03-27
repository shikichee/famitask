'use client';

import { useState, useCallback } from 'react';
import { TaskCategory } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface QuickAddProps {
  categories: TaskCategory[];
  currentMemberId: string;
  isChild: boolean;
  onAdd: (task: {
    title: string;
    category_id: string;
    points: number;
    adult_only: boolean;
    created_by: string;
    is_recurring: boolean;
  }) => Promise<unknown>;
}

export function QuickAdd({ categories, currentMemberId, isChild, onAdd }: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [points, setPoints] = useState(2);
  const [adultOnly, setAdultOnly] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle('');
    setCategoryId(categories[0]?.id ?? '');
    setPoints(2);
    setAdultOnly(false);
    setIsRecurring(false);
  }, [categories]);

  const handleSubmit = async () => {
    if (!title.trim() || !categoryId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        title: title.trim(),
        category_id: categoryId,
        points,
        adult_only: adultOnly,
        created_by: currentMemberId,
        is_recurring: isRecurring,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'タスクの追加に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`
          fixed bottom-20 right-4 z-30
          flex items-center justify-center
          rounded-full bg-[#F25C05] text-white shadow-lg
          transition-all hover:opacity-85 active:scale-90
          ${isChild ? 'w-16 h-16 text-3xl' : 'w-14 h-14 text-2xl'}
        `}
        aria-label="タスクを追加"
      >
        +
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isChild ? 'text-xl' : ''}>
            {isChild ? 'あたらしいおしごと' : 'タスクを追加'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-4 pb-4">
          {/* Title */}
          <div>
            <Label htmlFor="task-title" className={isChild ? 'text-base' : ''}>
              {isChild ? 'なにをする?' : 'タスク名'}
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isChild ? 'おしごとのなまえ' : 'タスク名を入力'}
              className={`mt-1.5 ${isChild ? 'text-lg h-12' : ''}`}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <Label className={isChild ? 'text-base' : ''}>
              {isChild ? 'しゅるい' : 'カテゴリ'}
            </Label>
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
                  <span className={isChild ? 'text-2xl' : 'text-xl'}>{cat.emoji}</span>
                  <span className={`${isChild ? 'text-xs' : 'text-[10px]'} font-medium`}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <Label className={isChild ? 'text-base' : ''}>
              {isChild ? 'むずかしさ' : 'ポイント'}
            </Label>
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
                  <span className={isChild ? 'text-lg' : 'text-sm'}>
                    {'★'.repeat(p)}
                  </span>
                  <span className={`${isChild ? 'text-xs' : 'text-[10px]'} font-medium text-muted-foreground`}>
                    {p === 1 ? 'かるい' : p === 2 ? 'ふつう' : 'がんばった'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles (adult only) */}
          {!isChild && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="adult-only">大人限定（子どもに非表示）</Label>
                <Switch
                  id="adult-only"
                  checked={adultOnly}
                  onCheckedChange={setAdultOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring">くりかえしタスク</Label>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className={`w-full ${isChild ? 'h-12 text-lg' : ''}`}
          >
            {submitting ? '...' : isChild ? 'ついかする!' : '追加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
