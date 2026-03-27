'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { PeriodToggle } from '@/components/stats/period-toggle';
import { ContributionChart } from '@/components/stats/contribution-chart';
import { MemberCategoryBreakdown } from '@/components/stats/member-category-breakdown';
import { StreakDisplay } from '@/components/stats/streak-display';
import { WeeklySummary } from '@/components/stats/weekly-summary';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';
import { Period, getPeriodStart, filterByPeriod } from '@/lib/period-utils';

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const members = useFamilyMembers();

  // Fetch completions from the earliest possible period (month start)
  const since = useMemo(() => getPeriodStart('month').toISOString(), []);
  const { completions } = useCompletions({ since });

  const filteredCompletions = useMemo(
    () => filterByPeriod(completions, period),
    [completions, period]
  );

  return (
    <AppShell>
      {({ isChild }) => (
        <div className="space-y-6">
          <PeriodToggle
            period={period}
            onPeriodChange={setPeriod}
            isChild={isChild}
          />
          <ContributionChart
            members={members}
            completions={filteredCompletions}
            period={period}
            isChild={isChild}
          />
          <MemberCategoryBreakdown
            members={members}
            completions={filteredCompletions}
            isChild={isChild}
          />
          <StreakDisplay
            members={members}
            completions={completions}
            isChild={isChild}
          />
          <WeeklySummary
            members={members}
            completions={filteredCompletions}
            period={period}
            isChild={isChild}
          />
        </div>
      )}
    </AppShell>
  );
}
