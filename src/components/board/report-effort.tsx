'use client';

import { useState, useCallback } from 'react';
import { FamilyMember, TaskCategory } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ReportEffortProps {
  categories: TaskCategory[];
  members: FamilyMember[];
  currentMemberId: string;
  isChild: boolean;
  onReport: (targetMemberId: string, taskTitle: string, categoryEmoji: string, targetName: string, adultOnly: boolean) => Promise<void>;
}

export function ReportEffort({ categories, members, currentMemberId, isChild, onReport }: ReportEffortProps) {
  const [open, setOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [title, setTitle] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState(categories[0]?.emoji ?? '');
  const [adultOnly, setAdultOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherMembers = members.filter(m => m.id !== currentMemberId);

  const reset = useCallback(() => {
    setTargetMemberId('');
    setTitle('');
    setCategoryEmoji(categories[0]?.emoji ?? '');
    setAdultOnly(false);
    setError(null);
  }, [categories]);

  const handleSubmit = async () => {
    if (!targetMemberId || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const target = members.find(m => m.id === targetMemberId);
      await onReport(targetMemberId, title.trim(), categoryEmoji, target?.name ?? '', adultOnly);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '報告に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger
        className={`
          fixed bottom-36 right-4 z-30
          flex items-center justify-center
          rounded-full bg-[#F2B199] text-white shadow-lg
          transition-all hover:opacity-85 active:scale-90
          ${isChild ? 'w-16 h-16 text-3xl' : 'w-14 h-14 text-2xl'}
        `}
        aria-label="がんばりを報告"
      >
        📣
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isChild ? 'text-xl' : ''}>
            {isChild ? 'がんばりをほうこく!' : 'がんばりを報告'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-4 pb-4">
          {/* Who did it? */}
          <div>
            <Label className={isChild ? 'text-base' : ''}>
              {isChild ? 'だれがやった?' : 'だれが?'}
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {otherMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTargetMemberId(m.id)}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                    ${m.id === targetMemberId
                      ? 'border-primary bg-accent'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  <span className={isChild ? 'text-3xl' : 'text-2xl'}>{m.avatar}</span>
                  <span className={`${isChild ? 'text-sm' : 'text-xs'} font-medium`}>
                    {m.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* What did they do? */}
          <div>
            <Label htmlFor="effort-title" className={isChild ? 'text-base' : ''}>
              {isChild ? 'なにをした?' : '何をした?'}
            </Label>
            <Input
              id="effort-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isChild ? 'やってくれたこと' : 'やってくれたことを入力'}
              className={`mt-1.5 ${isChild ? 'text-lg h-12' : ''}`}
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
                  type="button"
                  onClick={() => setCategoryEmoji(cat.emoji)}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                    ${cat.emoji === categoryEmoji
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

          {/* Adult only toggle (adults only) */}
          {!isChild && (
            <div className="flex items-center justify-between">
              <Label htmlFor="report-adult-only">大人限定（子どもに非表示）</Label>
              <Switch
                id="report-adult-only"
                checked={adultOnly}
                onCheckedChange={setAdultOnly}
              />
            </div>
          )}

          {/* Points info */}
          <p className="text-sm text-muted-foreground text-center">
            {isChild ? '📣 ほうこくすると +1pt もらえるよ!' : '📣 報告すると +1pt が付与されます'}
          </p>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!targetMemberId || !title.trim() || submitting}
            className={`w-full ${isChild ? 'h-12 text-lg' : ''}`}
          >
            {submitting ? '...' : isChild ? 'ほうこくする!' : '報告する'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
