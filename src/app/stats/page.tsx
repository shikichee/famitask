'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { PeriodToggle } from '@/components/stats/period-toggle';
import { FamilySummary } from '@/components/stats/family-summary';
import { MemberAppreciationList } from '@/components/stats/member-appreciation-list';
import { ThanksOverlay } from '@/components/celebration/thanks-overlay';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { useThanks } from '@/hooks/use-thanks';
import { Period, getPeriodStart, filterByPeriod } from '@/lib/period-utils';

export default function StatsPage() {
  return (
    <AppShell>
      {({ currentMemberId, isChild }) => (
        <StatsContent currentMemberId={currentMemberId} isChild={isChild} />
      )}
    </AppShell>
  );
}

function StatsContent({ currentMemberId, isChild }: { currentMemberId: string; isChild: boolean }) {
  const [period, setPeriod] = useState<Period>('week');
  const members = useFamilyMembers();

  const since = useMemo(() => getPeriodStart('month').toISOString(), []);
  const { completions } = useCompletions({ since });

  const filteredCompletions = useMemo(
    () => filterByPeriod(completions, period),
    [completions, period]
  );

  const { thanksList, sendThanks, latestReceivedThanks, clearReceivedThanks } = useThanks(currentMemberId);

  return (
    <div className="space-y-6">
      <PeriodToggle
        period={period}
        onPeriodChange={setPeriod}
        isChild={isChild}
      />
      <FamilySummary
        completions={filteredCompletions}
        period={period}
        isChild={isChild}
      />
      <MemberAppreciationList
        members={members}
        completions={filteredCompletions}
        currentMemberId={currentMemberId}
        thanksList={thanksList}
        onSendThanks={sendThanks}
        isChild={isChild}
      />
      <ThanksOverlay
        show={!!latestReceivedThanks}
        onDone={clearReceivedThanks}
      />
    </div>
  );
}
