'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Period } from '@/lib/period-utils';

interface PeriodToggleProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  isChild: boolean;
}

export function PeriodToggle({ period, onPeriodChange, isChild }: PeriodToggleProps) {
  return (
    <Tabs value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
      <TabsList className="w-full">
        <TabsTrigger value="week" className={isChild ? 'text-base' : 'text-sm'}>
          {isChild ? 'こんしゅう' : '今週'}
        </TabsTrigger>
        <TabsTrigger value="month" className={isChild ? 'text-base' : 'text-sm'}>
          {isChild ? 'こんげつ' : '今月'}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
