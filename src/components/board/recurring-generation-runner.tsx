'use client';

import { useRecurringGeneration } from '@/hooks/use-recurring-generation';

export function RecurringGenerationRunner({ currentMemberId }: { currentMemberId: string }) {
  useRecurringGeneration(currentMemberId);
  return null;
}
